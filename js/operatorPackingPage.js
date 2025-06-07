// js/operatorPackingPage.js
import { database, storage, auth } from './config.js';
import { ref, get, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { ref as storageRefFirebase, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showPage } from './ui.js'; // Import showPage
import { showAppStatus, formatDateDDMMYYYY } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentOrderKeyForPacking = null;
let packingPhotoFile = null;

// DOM Elements for this page - to be initialized
let opPacking_pageElement, opPacking_currentOrderIdSpan, opPacking_platformSpan, opPacking_dueDateSpan,
    opPacking_itemListUL, opPacking_photoInput, opPacking_photoPreviewImg,
    opPacking_removePhotoButton, opPacking_notesTextarea, opPacking_confirmButton, opPacking_supervisorCheckResultDiv,
    opPacking_packCheckStatusSpan, opPacking_packCheckSupervisorSpan, opPacking_packCheckNotesSpan,
    opPacking_appStatus;

export function initializeOperatorPackingPageListeners() {
    // Get DOM elements specific to this page
    opPacking_pageElement = document.getElementById('operatorPackingPage');
    opPacking_currentOrderIdSpan = document.getElementById('currentOrderIdForPacking');
    opPacking_platformSpan = document.getElementById('packOrderPlatform');
    opPacking_dueDateSpan = document.getElementById('packOrderDueDate');
    opPacking_itemListUL = document.getElementById('packOrderItemList');
    opPacking_photoInput = document.getElementById('packingPhoto');
    opPacking_photoPreviewImg = document.getElementById('packingPhotoPreview');
    opPacking_removePhotoButton = document.getElementById('removePackingPhotoButton');
    opPacking_notesTextarea = document.getElementById('operatorPackNotes');
    opPacking_confirmButton = document.getElementById('confirmPackingButton');
    opPacking_supervisorCheckResultDiv = document.getElementById('supervisorPackCheckResult');
    opPacking_packCheckStatusSpan = document.getElementById('packCheckStatus');
    opPacking_packCheckSupervisorSpan = document.getElementById('packCheckSupervisor');
    opPacking_packCheckNotesSpan = document.getElementById('packCheckNotes');
    opPacking_appStatus = document.getElementById('appStatus');

    if (!opPacking_photoInput || !opPacking_confirmButton) {
        console.warn("Operator Packing Page: packingPhotoInput or confirmPackingButton not found.");
        return;
    }

    opPacking_photoInput.addEventListener('change', handlePackingPhotoSelect);
    if (opPacking_removePhotoButton) opPacking_removePhotoButton.addEventListener('click', resetPackingPhoto);
    opPacking_confirmButton.addEventListener('click', confirmPacking);

    // Make navigateToOperatorScanToPack globally accessible for the nav button (if called from HTML onclick)
    // Better to handle navigation through JS event listeners on nav buttons themselves.
    // window.navigateToOperatorScanToPack is defined in operatorTasksPage.js or where the button exists
}

// ***** ฟังก์ชันนี้ต้องถูก Export *****
export async function loadOrderForPacking(orderKey) {
    if (!opPacking_appStatus) { console.error("App status element missing in loadOrderForPacking"); return; }
    if (!orderKey) {
        showAppStatus('ไม่พบรหัสพัสดุสำหรับการแพ็ก', 'error', opPacking_appStatus);
        showPage('dashboardPage'); // Or operator's task list
        return;
    }
    currentOrderKeyForPacking = orderKey;
    packingPhotoFile = null;

    showAppStatus('กำลังโหลดข้อมูลพัสดุ...', 'info', opPacking_appStatus);

    const orderRef = ref(database, 'orders/' + orderKey);
    try {
        const snapshot = await get(orderRef);
        if (snapshot.exists()) {
            const orderData = snapshot.val();
            if (orderData.status !== "Ready to Pack" && orderData.status !== "Pack Rejected") {
                alert(`พัสดุนี้ไม่พร้อมสำหรับการแพ็ก (สถานะ: ${orderData.status})`);
                showAppStatus(`พัสดุสถานะ: ${orderData.status}`, 'info', opPacking_appStatus);
                showPage('dashboardPage'); // Or back to operator's task list
                return;
            }

            if(opPacking_currentOrderIdSpan) opPacking_currentOrderIdSpan.textContent = orderData.packageCode || orderKey;
            if(opPacking_platformSpan) opPacking_platformSpan.textContent = orderData.platform || 'N/A';
            if(opPacking_dueDateSpan) opPacking_dueDateSpan.textContent = formatDateDDMMYYYY(orderData.dueDate);
            
            if(opPacking_itemListUL) opPacking_itemListUL.innerHTML = '';
            if (orderData.items) {
                for (const itemId in orderData.items) {
                    const item = orderData.items[itemId];
                    const li = document.createElement('li');
                    const label = document.createElement('label');
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.addEventListener('change', () => {
                        if (cb.checked) {
                            li.classList.add('checked');
                        } else {
                            li.classList.remove('checked');
                        }
                    });
                    label.appendChild(cb);
                    label.appendChild(document.createTextNode(` ${item.productName} - ${item.quantity} ${item.unit}`));
                    li.appendChild(label);
                    if(opPacking_itemListUL) opPacking_itemListUL.appendChild(li);
                }
            }
            
            if (opPacking_supervisorCheckResultDiv) {
                if (orderData.supervisorPackCheck) {
                    opPacking_supervisorCheckResultDiv.classList.remove('hidden');
                    if(opPacking_packCheckStatusSpan) opPacking_packCheckStatusSpan.textContent = orderData.supervisorPackCheck.isApproved ? 'อนุมัติแล้ว' : 'ถูกปฏิเสธ';
                    if(opPacking_packCheckSupervisorSpan) opPacking_packCheckSupervisorSpan.textContent = orderData.supervisorPackCheck.checkedBy_supervisorUid ? orderData.supervisorPackCheck.checkedBy_supervisorUid.substring(0,8) + "..." : 'N/A';
                    if(opPacking_packCheckNotesSpan) opPacking_packCheckNotesSpan.textContent = orderData.supervisorPackCheck.supervisorNotes || 'ไม่มี';
                } else {
                    opPacking_supervisorCheckResultDiv.classList.add('hidden');
                }
            }

            if(opPacking_photoInput) opPacking_photoInput.value = '';
            if(opPacking_photoPreviewImg) { opPacking_photoPreviewImg.classList.add('hidden'); opPacking_photoPreviewImg.src = '#'; }
            if(opPacking_removePhotoButton) opPacking_removePhotoButton.classList.add('hidden');
            if(opPacking_notesTextarea) opPacking_notesTextarea.value = orderData.packingInfo?.operatorNotes || '';
            
            showPage('operatorPackingPage');
            showAppStatus('โหลดพัสดุสำหรับแพ็กแล้ว', 'success', opPacking_appStatus);
        } else {
            alert('ไม่พบข้อมูลพัสดุนี้');
            showAppStatus('ไม่พบข้อมูลพัสดุนี้', 'error', opPacking_appStatus);
            showPage('dashboardPage'); // Or back to operator's task list
        }
    } catch (error) {
        console.error(`Error loading order ${orderKey} for packing:`, error);
        showAppStatus('เกิดข้อผิดพลาดในการโหลดข้อมูลพัสดุ: ' + error.message, 'error', opPacking_appStatus);
        showPage('dashboardPage'); // Or back to operator's task list
    }
}

function handlePackingPhotoSelect(event) {
    if (!opPacking_photoPreviewImg) return;
    const file = event.target.files[0];
    if (file) {
        packingPhotoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => { opPacking_photoPreviewImg.src = e.target.result; opPacking_photoPreviewImg.classList.remove('hidden'); };
        reader.readAsDataURL(file);
        if (opPacking_removePhotoButton) opPacking_removePhotoButton.classList.remove('hidden');
    } else {
        packingPhotoFile = null;
        opPacking_photoPreviewImg.classList.add('hidden'); opPacking_photoPreviewImg.src = '#';
        if (opPacking_removePhotoButton) opPacking_removePhotoButton.classList.add('hidden');
    }
}

function resetPackingPhoto() {
    if (!opPacking_photoInput || !opPacking_photoPreviewImg) return;
    opPacking_photoInput.value = '';
    packingPhotoFile = null;
    opPacking_photoPreviewImg.src = '#';
    opPacking_photoPreviewImg.classList.add('hidden');
    if (opPacking_removePhotoButton) opPacking_removePhotoButton.classList.add('hidden');
}

async function confirmPacking() {
    const currentUser = getCurrentUser(); const currentUserRole = getCurrentUserRole();
    if (!opPacking_appStatus) {console.error("App status element not found in confirmPacking"); return;}
    if (!['operator','administrator','supervisor'].includes(currentUserRole) || !currentOrderKeyForPacking) {
        showAppStatus('ไม่มีสิทธิ์หรือไม่ได้เลือกพัสดุ', 'error', opPacking_appStatus); return; }
    if (!packingPhotoFile) { showAppStatus("กรุณาถ่ายรูปสินค้าก่อนยืนยัน", "error", opPacking_appStatus); return; }

    if(opPacking_confirmButton) opPacking_confirmButton.disabled = true;
    showAppStatus("กำลังอัปโหลดรูปและบันทึกข้อมูลการแพ็ก...", "info", opPacking_appStatus);

    try {
        const photoFileName = `packing_${currentOrderKeyForPacking}_${Date.now()}_${packingPhotoFile.name}`;
        const photoStoragePath = `packingPhotos/${currentOrderKeyForPacking}/${photoFileName}`;
        const imageRef = storageRefFirebase(storage, photoStoragePath);
        await uploadBytes(imageRef, packingPhotoFile);
        const photoDownloadURL = await getDownloadURL(imageRef);

        const packingInfoData = {
            packedBy_operatorUid: currentUser.uid, packedAt: serverTimestamp(),
            packingPhotoUrl: photoDownloadURL, operatorNotes: opPacking_notesTextarea ? opPacking_notesTextarea.value.trim() : null
        };
        await update(ref(database, 'orders/' + currentOrderKeyForPacking), {
            packingInfo: packingInfoData, status: "Pending Supervisor Pack Check", lastUpdatedAt: serverTimestamp()
        });
        showAppStatus("บันทึกการแพ็กและอัปโหลดรูปสำเร็จ!", "success", opPacking_appStatus);
        showPage('dashboardPage'); // Or operator's task list
    } catch (error) {
        console.error("Error confirming packing:", error);
        showAppStatus("เกิดข้อผิดพลาดในการยืนยันการแพ็ก: " + error.message, "error", opPacking_appStatus);
    } finally {
        if(opPacking_confirmButton) opPacking_confirmButton.disabled = false;
    }
}