// js/operatorPackingPage.js
import { database, storage, auth } from './config.js'; // Firebase services
import { ref, get, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { uiElements, showPage } from './ui.js';
import { showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentOrderKeyForPacking = null; // Stores the key of the order being packed
let packingPhotoFile = null; // Stores the selected photo file for packing

export function initializeOperatorPackingPageListeners() {
    if (!uiElements.packingPhotoInput || !uiElements.confirmPackingButton) {
        console.warn("Operator Packing Page elements not fully initialized for listeners.");
        return;
    }

    uiElements.packingPhotoInput.addEventListener('change', handlePackingPhotoSelect);
    uiElements.confirmPackingButton.addEventListener('click', confirmPacking);

    // Make navigateToOperatorScanToPack globally accessible for the nav button
    // This function will typically be called by a button or a QR scan that identifies an order.
    window.navigateToOperatorScanToPack = function() {
        const orderKeyToPack = prompt("Operator: กรุณาป้อน Order Key หรือสแกน QR ออเดอร์ที่จะแพ็ก:");
        if (orderKeyToPack && orderKeyToPack.trim() !== "") {
            loadOrderForPacking(orderKeyToPack.trim());
        } else {
            showAppStatus("ไม่ได้ป้อน Order Key", "info", uiElements.appStatus);
        }
    }
}

export async function loadOrderForPacking(orderKey) {
    if (!orderKey) {
        console.error("loadOrderForPacking: No orderKey provided.");
        showAppStatus("ไม่พบ Order Key สำหรับการแพ็ก", "error", uiElements.appStatus);
        showPage('dashboardPage'); // Or operator's task list page
        return;
    }
    currentOrderKeyForPacking = orderKey;
    packingPhotoFile = null; // Reset photo file

    showAppStatus(`กำลังโหลดข้อมูลออเดอร์ ${orderKey}...`, "info", uiElements.appStatus);

    const orderRef = ref(database, 'orders/' + orderKey);
    try {
        const snapshot = await get(orderRef);
        if (snapshot.exists()) {
            const orderData = snapshot.val();

            // Check if order is in a state that allows packing
            if (orderData.status !== "Ready to Pack" && orderData.status !== "Pack Rejected") {
                alert(`ออเดอร์ ${orderKey} ไม่พร้อมสำหรับการแพ็ก (สถานะปัจจุบัน: ${orderData.status})`);
                showAppStatus(`ออเดอร์ ${orderKey} สถานะ: ${orderData.status}`, "info", uiElements.appStatus);
                showPage('dashboardPage'); // Or operator's task list
                return;
            }

            if(uiElements.currentOrderIdForPackingSpan) uiElements.currentOrderIdForPackingSpan.textContent = orderKey;
            if(uiElements.packOrderPlatformSpan) uiElements.packOrderPlatformSpan.textContent = orderData.platform || 'N/A';
            if(uiElements.packOrderDueDateSpan) uiElements.packOrderDueDateSpan.textContent = orderData.dueDate ? new Date(orderData.dueDate).toLocaleDateString('th-TH') : 'N/A';
            
            if(uiElements.packOrderItemListUL) uiElements.packOrderItemListUL.innerHTML = ''; // Clear previous item list
            if (orderData.items) {
                for (const itemId in orderData.items) {
                    const item = orderData.items[itemId];
                    const li = document.createElement('li');
                    li.textContent = `${item.productName} - ${item.quantity} ${item.unit}`;
                    if(uiElements.packOrderItemListUL) uiElements.packOrderItemListUL.appendChild(li);
                }
            }
            
            // Show supervisor check result if available (e.g., if it was 'Pack Rejected' and now being repacked)
            if (uiElements.supervisorPackCheckResultDiv) {
                if (orderData.supervisorPackCheck) {
                    uiElements.supervisorPackCheckResultDiv.classList.remove('hidden');
                    if(uiElements.packCheckStatusSpan) uiElements.packCheckStatusSpan.textContent = orderData.supervisorPackCheck.isApproved ? 'อนุมัติแล้ว' : 'ถูกปฏิเสธ';
                    if(uiElements.packCheckSupervisorSpan) uiElements.packCheckSupervisorSpan.textContent = orderData.supervisorPackCheck.checkedBy_supervisorUid ? orderData.supervisorPackCheck.checkedBy_supervisorUid.substring(0,8) + "..." : 'N/A'; // Shorten UID
                    if(uiElements.packCheckNotesSpan) uiElements.packCheckNotesSpan.textContent = orderData.supervisorPackCheck.supervisorNotes || 'ไม่มี';
                } else {
                    uiElements.supervisorPackCheckResultDiv.classList.add('hidden');
                }
            }

            if(uiElements.packingPhotoInput) uiElements.packingPhotoInput.value = ''; // Reset file input
            if(uiElements.packingPhotoPreviewImg) {
                uiElements.packingPhotoPreviewImg.classList.add('hidden');
                uiElements.packingPhotoPreviewImg.src = '#';
            }
            if(uiElements.operatorPackNotesTextarea) uiElements.operatorPackNotesTextarea.value = orderData.packingInfo?.operatorNotes || ''; // Pre-fill if repacking

            showPage('operatorPackingPage');
            showAppStatus(`โหลดออเดอร์ ${orderKey} สำหรับแพ็กแล้ว`, "success", uiElements.appStatus);

        } else {
            alert(`ไม่พบข้อมูลออเดอร์ ID: ${orderKey}`);
            showAppStatus(`ไม่พบออเดอร์ ID: ${orderKey}`, "error", uiElements.appStatus);
            showPage('dashboardPage'); // Or operator's task list
        }
    } catch (error) {
        console.error(`Error loading order ${orderKey} for packing:`, error);
        showAppStatus("เกิดข้อผิดพลาดในการโหลดข้อมูลออเดอร์: " + error.message, "error", uiElements.appStatus);
        showPage('dashboardPage'); // Or operator's task list
    }
}

function handlePackingPhotoSelect(event) {
    if (!uiElements.packingPhotoPreviewImg) return;
    const file = event.target.files[0];
    if (file) {
        packingPhotoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            uiElements.packingPhotoPreviewImg.src = e.target.result;
            uiElements.packingPhotoPreviewImg.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    } else {
        packingPhotoFile = null;
        uiElements.packingPhotoPreviewImg.classList.add('hidden');
        uiElements.packingPhotoPreviewImg.src = '#';
    }
}

async function confirmPacking() {
    const currentUser = getCurrentUser();
    const currentUserRole = getCurrentUserRole();

    if (currentUserRole !== 'operator' || !currentOrderKeyForPacking) {
        showAppStatus("คุณไม่มีสิทธิ์ดำเนินการนี้ หรือไม่ได้เลือกออเดอร์", "error", uiElements.appStatus);
        return;
    }
    if (!packingPhotoFile) {
        showAppStatus("กรุณาถ่ายรูปสินค้าที่แพ็กก่อนยืนยัน", "error", uiElements.appStatus);
        return;
    }

    uiElements.confirmPackingButton.disabled = true;
    showAppStatus("กำลังอัปโหลดรูปและบันทึกข้อมูลการแพ็ก...", "info", uiElements.appStatus);

    try {
        // 1. Upload photo to Firebase Storage
        const photoFileName = `packing_${currentOrderKeyForPacking}_${Date.now()}_${packingPhotoFile.name}`;
        // It's good practice to organize storage, e.g., by orderKey or date
        const photoStoragePath = `packingPhotos/${currentOrderKeyForPacking}/${photoFileName}`;
        const imageRef = storageRef(storage, photoStoragePath);
        
        console.log(`Uploading to: ${photoStoragePath}`);
        const uploadResult = await uploadBytes(imageRef, packingPhotoFile);
        const photoDownloadURL = await getDownloadURL(uploadResult.ref);
        console.log("Photo uploaded, URL:", photoDownloadURL);

        // 2. Prepare packing data to update in Realtime Database
        const packingInfoData = { // Changed variable name for clarity
            packedBy_operatorUid: currentUser.uid,
            packedAt: serverTimestamp(), // Firebase server-side timestamp
            packingPhotoUrl: photoDownloadURL,
            operatorNotes: uiElements.operatorPackNotesTextarea.value.trim() || null
        };
        
        // Update the specific order with packing info and new status
        await update(ref(database, 'orders/' + currentOrderKeyForPacking), {
            packingInfo: packingInfoData,
            status: "Pending Supervisor Pack Check", // Or "Packed" if no supervisor step
            lastUpdatedAt: serverTimestamp()
        });

        showAppStatus("บันทึกการแพ็กและอัปโหลดรูปสำเร็จ!", "success", uiElements.appStatus);
        // Navigate back to a relevant page, e.g., operator's task list or dashboard
        showPage('dashboardPage'); 

    } catch (error) {
        console.error("Error confirming packing:", error);
        showAppStatus("เกิดข้อผิดพลาดในการยืนยันการแพ็ก: " + error.message, "error", uiElements.appStatus);
    } finally {
        uiElements.confirmPackingButton.disabled = false;
    }
}