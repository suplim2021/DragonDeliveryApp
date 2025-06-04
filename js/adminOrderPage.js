// js/adminOrderPage.js
import { auth, database } from './config.js';
import { ref, set, serverTimestamp, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// import { uiElements, showPage } from './ui.js'; // <<<--- ลบออก
import { detectPlatformFromPackageCode, setDefaultDueDate, showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';
import { loadOrderForAddingItems } from './adminItemsPage.js'; // This should also not rely on global uiElements from ui.js

// DOM Elements specific to this page
let adminOrderAppStatus, adminOrderStartQRButton, adminOrderQRContainer, adminOrderQRDiv, adminOrderStopQRButton,
    adminOrderScannedQRData, adminOrderPlatformInput, adminOrderPlatformOrderIdInput, adminOrderScanPlatformIdButton,
    adminOrderPlatformIdQRContainer, adminOrderPlatformIdQRDiv, adminOrderStopPlatformIdQRButton,
    adminOrderPackageCodeInput, adminOrderDueDateInput, adminOrderNotesInput, adminOrderSaveButton;

let html5QrCodeScannerPackageCode = null;
let html5QrCodeScannerPlatformOrderId = null;

export function initializeAdminOrderPageListeners() {
    // Query DOM elements for this page
    adminOrderAppStatus = document.getElementById('appStatus'); // Assuming one appStatus for all
    adminOrderStartQRButton = document.getElementById('startQRScanButton_AdminOrder');
    adminOrderQRContainer = document.getElementById('qrScannerContainer_AdminOrder');
    adminOrderQRDiv = document.getElementById('qrScanner_AdminOrder');
    adminOrderStopQRButton = document.getElementById('stopQRScanButton_AdminOrder');
    adminOrderScannedQRData = document.getElementById('scannedQRData_AdminOrder');
    adminOrderPlatformInput = document.getElementById('adminPlatform');
    adminOrderPlatformOrderIdInput = document.getElementById('adminPlatformOrderId');
    adminOrderScanPlatformIdButton = document.getElementById('scanPlatformOrderIdButton');
    adminOrderPlatformIdQRContainer = document.getElementById('qrScannerContainer_PlatformOrderId');
    adminOrderPlatformIdQRDiv = document.getElementById('qrScanner_PlatformOrderId');
    adminOrderStopPlatformIdQRButton = document.getElementById('stopScanPlatformOrderIdButton');
    adminOrderPackageCodeInput = document.getElementById('adminPackageCode');
    adminOrderDueDateInput = document.getElementById('adminDueDate');
    adminOrderNotesInput = document.getElementById('adminNotes');
    adminOrderSaveButton = document.getElementById('saveInitialOrderButton');

    if (!adminOrderStartQRButton || !adminOrderSaveButton || !adminOrderScanPlatformIdButton) {
        console.warn("Admin Order Page core elements not found for listeners.");
        return;
    }

    adminOrderStartQRButton.addEventListener('click', () => { /* ... (rest of the logic, using local vars like adminOrderQRDiv) ... */
        if (!adminOrderQRDiv) { alert("QR Scanner element for Package Code not found!"); return; }
        adminOrderQRContainer.classList.remove('hidden');
        adminOrderStopQRButton.classList.remove('hidden');
        adminOrderStartQRButton.disabled = true;
        if (!html5QrCodeScannerPackageCode) html5QrCodeScannerPackageCode = new Html5Qrcode(adminOrderQRDiv.id, false);
        html5QrCodeScannerPackageCode.start( { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess_PackageCode, (errorMessage) => { /* console.warn("Package Code Scan failure:", errorMessage); */ }
        ).catch(err => { /* ... (error handling using local vars) ... */ });
    });
    adminOrderStopQRButton.addEventListener('click', () => { /* ... (using local vars) ... */ });
    adminOrderScanPlatformIdButton.addEventListener('click', () => { /* ... (using local vars) ... */ });
    adminOrderStopPlatformIdQRButton.addEventListener('click', () => { /* ... (using local vars) ... */ });
    adminOrderSaveButton.addEventListener('click', saveInitialOrder);
}

function onScanSuccess_PackageCode(decodedText, decodedResult) {
    const packageCode = decodedText.trim();
    if (adminOrderScannedQRData) adminOrderScannedQRData.textContent = packageCode;
    if (adminOrderPackageCodeInput) { /* ... (using local vars) ... */ }
    const detectedPlatform = detectPlatformFromPackageCode(packageCode);
    if (adminOrderPlatformInput) { /* ... (using local vars) ... */ }
    if (adminOrderPlatformOrderIdInput && !adminOrderPlatformOrderIdInput.value.trim()) adminOrderPlatformOrderIdInput.focus();
    if (html5QrCodeScannerPackageCode) { /* ... (using local vars) ... */ }
}

async function saveInitialOrder() {
    const currentUser = getCurrentUser(); const currentUserRole = getCurrentUserRole();
    if (currentUserRole !== 'administrator') { showAppStatus("คุณไม่มีสิทธิ์", 'error', adminOrderAppStatus); return; }
    // ... (rest of the logic using local vars like adminOrderPlatformInput.value) ...
    // ... when navigating:
    // loadOrderForAddingItems(orderKey); // This function is in adminItemsPage.js
                                        // It will need to query its own DOM elements or receive them.
                                        // For now, assuming it works or will be refactored similarly.
}
// (โค้ดส่วนที่เหลือของ adminOrderPage.js ที่คุณมี ก็ปรับให้ใช้ Local Variables ที่ Get มาใน initializeAdminOrderPageListeners)
// (ฟังก์ชัน onScanSuccess_PackageCode และ saveInitialOrder จะต้องถูกปรับให้ใช้ตัวแปร Local เหล่านี้)