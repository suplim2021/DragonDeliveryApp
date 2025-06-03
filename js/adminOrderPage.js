// js/adminOrderPage.js
import { auth, database } from './config.js';
import { ref, set, serverTimestamp, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { uiElements, showPage } from './ui.js';
import { detectPlatformFromPackageCode, setDefaultDueDate, showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js'; // To get current user info
import { loadOrderForAddingItems } from './adminItemsPage.js'; // To navigate after saving

let html5QrCodeScannerPackageCode = null; // Scanner for Package Code
let html5QrCodeScannerPlatformOrderId = null; // Scanner for Platform Order ID

export function initializeAdminOrderPageListeners() {
    if (!uiElements.startQRScanButton_AdminOrder || !uiElements.saveInitialOrderButton || !uiElements.scanPlatformOrderIdButton) {
        console.warn("Admin Order Page elements not fully initialized for listeners.");
        return;
    }

    // Listener for scanning Package Code QR
    uiElements.startQRScanButton_AdminOrder.addEventListener('click', () => {
        if (!uiElements.qrScanner_AdminOrder_div) { alert("QR Scanner element for Package Code not found!"); return; }
        uiElements.qrScannerContainer_AdminOrder.classList.remove('hidden');
        uiElements.stopQRScanButton_AdminOrder.classList.remove('hidden');
        uiElements.startQRScanButton_AdminOrder.disabled = true;

        if (!html5QrCodeScannerPackageCode) {
            html5QrCodeScannerPackageCode = new Html5Qrcode(uiElements.qrScanner_AdminOrder_div.id, false);
        }
        html5QrCodeScannerPackageCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess_PackageCode,
            (errorMessage) => { /* console.warn("Package Code Scan failure:", errorMessage); */ }
        ).catch(err => {
            alert("ไม่สามารถเปิดกล้องสแกนรหัสพัสดุได้: " + err.message);
            uiElements.qrScannerContainer_AdminOrder.classList.add('hidden');
            uiElements.stopQRScanButton_AdminOrder.classList.add('hidden');
            uiElements.startQRScanButton_AdminOrder.disabled = false;
        });
    });

    uiElements.stopQRScanButton_AdminOrder.addEventListener('click', () => {
        if (html5QrCodeScannerPackageCode) {
            html5QrCodeScannerPackageCode.stop().catch(e => console.warn("Error stopping package code scanner (manual):", e));
        }
        uiElements.qrScannerContainer_AdminOrder.classList.add('hidden');
        uiElements.stopQRScanButton_AdminOrder.classList.add('hidden');
        uiElements.startQRScanButton_AdminOrder.disabled = false;
    });

    // Listener for scanning Platform Order ID QR
    uiElements.scanPlatformOrderIdButton.addEventListener('click', () => {
        if (!uiElements.qrScanner_PlatformOrderId_div) { alert("QR Scanner element for Platform Order ID not found!"); return; }
        uiElements.qrScannerContainer_PlatformOrderId.classList.remove('hidden');
        uiElements.stopScanPlatformOrderIdButton.classList.remove('hidden');
        uiElements.scanPlatformOrderIdButton.disabled = true;

        if (!html5QrCodeScannerPlatformOrderId) {
            html5QrCodeScannerPlatformOrderId = new Html5Qrcode(uiElements.qrScanner_PlatformOrderId_div.id, false);
        }
        html5QrCodeScannerPlatformOrderId.start(
            { facingMode: "environment" }, // Or use selected camera ID if you implement camera selection
            { fps: 10, qrbox: { width: 250, height: 150 } }, // Adjust qrbox size as needed
            (decodedText, decodedResult) => { // onScanSuccess for Platform Order ID
                uiElements.adminPlatformOrderIdInput.value = decodedText.trim();
                if (html5QrCodeScannerPlatformOrderId) {
                    html5QrCodeScannerPlatformOrderId.stop().catch(e => console.warn("Error stopping platform ID scanner:", e));
                }
                uiElements.qrScannerContainer_PlatformOrderId.classList.add('hidden');
                uiElements.stopScanPlatformOrderIdButton.classList.add('hidden');
                uiElements.scanPlatformOrderIdButton.disabled = false;
            },
            (errorMessage) => { /* console.warn("Platform Order ID Scan failure:", errorMessage); */ }
        ).catch(err => {
            alert("ไม่สามารถเปิดกล้องสแกน Platform Order ID ได้: " + err.message);
            uiElements.qrScannerContainer_PlatformOrderId.classList.add('hidden');
            uiElements.stopScanPlatformOrderIdButton.classList.add('hidden');
            uiElements.scanPlatformOrderIdButton.disabled = false;
        });
    });

    uiElements.stopScanPlatformOrderIdButton.addEventListener('click', () => {
        if (html5QrCodeScannerPlatformOrderId) {
            html5QrCodeScannerPlatformOrderId.stop().catch(e => console.warn("Error stopping platform ID scanner (manual):", e));
        }
        uiElements.qrScannerContainer_PlatformOrderId.classList.add('hidden');
        uiElements.stopScanPlatformOrderIdButton.classList.add('hidden');
        uiElements.scanPlatformOrderIdButton.disabled = false;
    });
    
    // Listener for saving the initial order
    uiElements.saveInitialOrderButton.addEventListener('click', saveInitialOrder);
}

function onScanSuccess_PackageCode(decodedText, decodedResult) {
    const packageCode = decodedText.trim();
    if (uiElements.scannedQRData_AdminOrder) uiElements.scannedQRData_AdminOrder.textContent = packageCode;
    if (uiElements.adminPackageCodeInput) {
        uiElements.adminPackageCodeInput.value = packageCode;
        uiElements.adminPackageCodeInput.readOnly = true;
    }

    const detectedPlatform = detectPlatformFromPackageCode(packageCode);
    if (uiElements.adminPlatformInput) {
        uiElements.adminPlatformInput.value = detectedPlatform;
        uiElements.adminPlatformInput.readOnly = true;
    }

    if (uiElements.adminPlatformOrderIdInput && !uiElements.adminPlatformOrderIdInput.value.trim()) {
        uiElements.adminPlatformOrderIdInput.focus();
    }

    if (html5QrCodeScannerPackageCode) {
        html5QrCodeScannerPackageCode.stop().then(() => {
            if(uiElements.qrScannerContainer_AdminOrder) uiElements.qrScannerContainer_AdminOrder.classList.add('hidden');
            if(uiElements.stopQRScanButton_AdminOrder) uiElements.stopQRScanButton_AdminOrder.classList.add('hidden');
            if(uiElements.startQRScanButton_AdminOrder) uiElements.startQRScanButton_AdminOrder.disabled = false;
        }).catch(err => {
            console.warn("Error stopping package code scanner after success:", err);
            // Still hide UI elements even if stop fails
            if(uiElements.qrScannerContainer_AdminOrder) uiElements.qrScannerContainer_AdminOrder.classList.add('hidden');
            if(uiElements.stopQRScanButton_AdminOrder) uiElements.stopQRScanButton_AdminOrder.classList.add('hidden');
            if(uiElements.startQRScanButton_AdminOrder) uiElements.startQRScanButton_AdminOrder.disabled = false;
        });
    }
}

async function saveInitialOrder() {
    const currentUser = getCurrentUser(); // Get user from auth module
    const currentUserRole = getCurrentUserRole(); // Get role from auth module

    if (currentUserRole !== 'administrator') {
        showAppStatus("คุณไม่มีสิทธิ์ดำเนินการนี้", 'error', uiElements.appStatus);
        return;
    }

    const platform = uiElements.adminPlatformInput.value.trim();
    const platformOrderId = uiElements.adminPlatformOrderIdInput.value.trim();
    const packageCode = uiElements.adminPackageCodeInput.value.trim();
    const dueDate = uiElements.adminDueDateInput.value;
    const notes = uiElements.adminNotesInput.value.trim();
    const qrRaw = uiElements.scannedQRData_AdminOrder.textContent;

    if (!packageCode || platform === "Unknown" || !platform) {
        showAppStatus("กรุณาสแกนรหัสพัสดุและตรวจสอบว่า Platform ถูกต้อง", 'error', uiElements.appStatus);
        return;
    }
    // Platform Order ID can be optional, or you can add validation here if it's required for certain platforms
    // Example: if ((platform === "Shopee" || platform === "Lazada") && !platformOrderId) {
    //     showAppStatus(`กรุณากรอกหรือสแกน Platform Order ID สำหรับ ${platform}`, 'error', uiElements.appStatus);
    //     return;
    // }

    // Construct a unique order key.
    // Using push() for a guaranteed unique Firebase key is often safer.
    // const newOrderRef = push(ref(database, 'orders'));
    // const orderKey = newOrderRef.key;
    // Or, if you construct a key, ensure its uniqueness logic is robust.
    // For now, using a combination that might need review for true uniqueness in all cases.
    const orderKey = packageCode ? `${platform}_${platformOrderId || 'NO_PID'}_${packageCode}`.replace(/[^a-zA-Z0-9_-]/g, '') : push(ref(database, 'orders')).key;

    if (!orderKey) {
        showAppStatus("ไม่สามารถสร้าง Order Key ที่ไม่ซ้ำได้", 'error', uiElements.appStatus);
        return;
    }

    const orderData = {
        qrRawData: qrRaw,
        platform: platform,
        platformOrderId: platformOrderId || null, // Store null if empty
        packageCode: packageCode,
        status: "Pending Item Details", // Initial status
        dueDate: dueDate || null,
        notes: notes || null,
        createdAt: serverTimestamp(), // Firebase server-side timestamp
        createdBy_adminUid: currentUser.uid,
        items: {} // Initialize items object
    };

    uiElements.saveInitialOrderButton.disabled = true;
    showAppStatus("กำลังบันทึกออเดอร์...", 'info', uiElements.appStatus);

    try {
        await set(ref(database, 'orders/' + orderKey), orderData);
        showAppStatus(`สร้างออเดอร์ ${orderKey} สำเร็จ! กำลังไปหน้าเพิ่มรายการสินค้า...`, 'success', uiElements.appStatus);
        
        // Clear form fields (done by showPage for 'adminCreateOrderPage' when navigating back)
        // Navigate to add items page for this new order
        loadOrderForAddingItems(orderKey); // This function should be in adminItemsPage.js and imported

    } catch (error) {
        console.error("Error saving initial order:", error);
        showAppStatus("เกิดข้อผิดพลาดในการบันทึกออเดอร์: " + error.message, 'error', uiElements.appStatus);
    } finally {
        uiElements.saveInitialOrderButton.disabled = false;
    }
}