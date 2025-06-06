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
    adminOrderPackageCodeInput, adminOrderDueDateInput, adminOrderNotesInput, adminOrderSaveButton,
    scanOverlayDiv, overlayScannerDiv, closeOverlayBtn;

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
    scanOverlayDiv = document.getElementById('scanOverlay');
    overlayScannerDiv = document.getElementById('overlayScanner');
    closeOverlayBtn = document.getElementById('closeScanOverlayButton');

    if (!adminOrderStartQRButton || !adminOrderSaveButton || !adminOrderScanPlatformIdButton) {
        console.warn("Admin Order Page core elements not found for listeners.");
        return;
    }

    if (closeOverlayBtn) closeOverlayBtn.addEventListener('click', () => {
        stopPackageCodeScan();
        stopPlatformIdScan();
    });

    adminOrderStartQRButton.addEventListener('click', startPackageCodeScan);
    adminOrderStopQRButton.addEventListener('click', stopPackageCodeScan);
    adminOrderScanPlatformIdButton.addEventListener('click', startPlatformIdScan);
    adminOrderStopPlatformIdQRButton.addEventListener('click', stopPlatformIdScan);
    adminOrderSaveButton.addEventListener('click', saveInitialOrder);
    if (scanOverlayDiv) {
        scanOverlayDiv.addEventListener('click', (e) => {
            if (e.target === scanOverlayDiv) {
                stopPackageCodeScan();
                stopPlatformIdScan();
            }
        });
    }
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            stopPackageCodeScan();
            stopPlatformIdScan();
        }
    });
}

// Expose stop functions for other modules (e.g., page navigation cleanup)
window.stopPackageCodeScan = stopPackageCodeScan;
window.stopPlatformIdScan = stopPlatformIdScan;

function startPackageCodeScan() {
    if (!overlayScannerDiv || !scanOverlayDiv) { alert("QR Scanner element not found!"); return; }
    scanOverlayDiv.classList.remove('hidden');
    adminOrderStartQRButton.disabled = true;
    if (!html5QrCodeScannerPackageCode) {
        html5QrCodeScannerPackageCode = new Html5Qrcode(overlayScannerDiv.id, false);
    }
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            let cam = cameras.find(c => /back|rear|environment/i.test(c.label));
            if(!cam) cam = cameras[cameras.length - 1];
            const camId = cam.id;
            html5QrCodeScannerPackageCode.start(
                { deviceId: { exact: camId } },
                { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { focusMode: "continuous", facingMode: "environment" } },
                onScanSuccess_PackageCode,
                (errorMessage) => { console.warn("Package Code Scan failure:", errorMessage); }
            ).catch(err => {
                alert("ไม่สามารถเปิดกล้องสแกน QR ได้: " + (err?.message || err));
                stopPackageCodeScan();
            });
        } else {
            alert("ไม่พบกล้องบนอุปกรณ์");
            stopPackageCodeScan();
        }
    }).catch(err => {
        alert("ไม่สามารถเข้าถึงกล้อง: " + (err?.message || err));
        stopPackageCodeScan();
    });
}

async function stopPackageCodeScan() {
    if (html5QrCodeScannerPackageCode) {
        try {
            await html5QrCodeScannerPackageCode.stop();
            await html5QrCodeScannerPackageCode.clear();
        } catch (e) {
            console.warn("Error stopping main scanner:", e);
        }
        html5QrCodeScannerPackageCode = null;
    }
    if (scanOverlayDiv) scanOverlayDiv.classList.add('hidden');
    if (adminOrderQRContainer) adminOrderQRContainer.classList.add('hidden');
    if (adminOrderStopQRButton) adminOrderStopQRButton.classList.add('hidden');
    adminOrderStartQRButton.disabled = false;
}

function onScanSuccess_PackageCode(decodedText, decodedResult) {
    const packageCode = decodedText.trim();
    if (adminOrderScannedQRData) adminOrderScannedQRData.textContent = packageCode;
    if (adminOrderPackageCodeInput) {
        adminOrderPackageCodeInput.value = packageCode;
    }
    const detectedPlatform = detectPlatformFromPackageCode(packageCode);
    if (adminOrderPlatformInput) {
        adminOrderPlatformInput.value = detectedPlatform;
    }
    if (adminOrderPlatformOrderIdInput && !adminOrderPlatformOrderIdInput.value.trim()) {
        adminOrderPlatformOrderIdInput.focus();
    }
    stopPackageCodeScan();
}

function startPlatformIdScan() {
    if (!overlayScannerDiv || !scanOverlayDiv) { alert("QR Scanner element not found!"); return; }
    scanOverlayDiv.classList.remove('hidden');
    adminOrderScanPlatformIdButton.disabled = true;
    if (!html5QrCodeScannerPlatformOrderId) {
        html5QrCodeScannerPlatformOrderId = new Html5Qrcode(overlayScannerDiv.id, false);
    }
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            let cam = cameras.find(c => /back|rear|environment/i.test(c.label));
            if(!cam) cam = cameras[cameras.length - 1];
            const camId = cam.id;
            html5QrCodeScannerPlatformOrderId.start(
                { deviceId: { exact: camId } },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    videoConstraints: { focusMode: "continuous", facingMode: "environment" },
                    formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128]
                },
                (decodedText, decodedResult) => {
                    adminOrderPlatformOrderIdInput.value = decodedText.trim();
                    stopPlatformIdScan();
                },
                (errorMessage) => { console.warn("Platform Order ID Scan failure:", errorMessage); }
            ).catch(err => {
                alert("ไม่สามารถเปิดกล้องสแกน Platform Order ID ได้: " + (err?.message || err));
                stopPlatformIdScan();
            });
        } else {
            alert("ไม่พบกล้องบนอุปกรณ์");
            stopPlatformIdScan();
        }
    }).catch(err => {
        alert("ไม่สามารถเข้าถึงกล้อง: " + (err?.message || err));
        stopPlatformIdScan();
    });
}

async function stopPlatformIdScan() {
    if (html5QrCodeScannerPlatformOrderId) {
        try {
            await html5QrCodeScannerPlatformOrderId.stop();
            await html5QrCodeScannerPlatformOrderId.clear();
        } catch (e) {
            console.warn("Error stopping Platform ID scanner:", e);
        }
        html5QrCodeScannerPlatformOrderId = null;
    }
    if (scanOverlayDiv) scanOverlayDiv.classList.add('hidden');
    if (adminOrderPlatformIdQRContainer) adminOrderPlatformIdQRContainer.classList.add('hidden');
    if (adminOrderStopPlatformIdQRButton) adminOrderStopPlatformIdQRButton.classList.add('hidden');
    adminOrderScanPlatformIdButton.disabled = false;
}

async function saveInitialOrder() {
    const currentUser = getCurrentUser();
    const currentUserRole = getCurrentUserRole();
    if (!currentUser || currentUserRole !== 'administrator') {
        showAppStatus("คุณไม่มีสิทธิ์", 'error', adminOrderAppStatus);
        return;
    }

    const platform = adminOrderPlatformInput ? adminOrderPlatformInput.value.trim() : '';
    const platformOrderId = adminOrderPlatformOrderIdInput ? adminOrderPlatformOrderIdInput.value.trim() : '';
    const packageCode = adminOrderPackageCodeInput ? adminOrderPackageCodeInput.value.trim() : '';
    const dueDateStr = adminOrderDueDateInput ? adminOrderDueDateInput.value : '';
    const notes = adminOrderNotesInput ? adminOrderNotesInput.value.trim() : '';

    if (!packageCode || !dueDateStr) {
        showAppStatus('กรุณากรอกข้อมูลให้ครบ', 'error', adminOrderAppStatus);
        return;
    }

    const dueDate = new Date(dueDateStr).getTime();

    if (adminOrderSaveButton) adminOrderSaveButton.disabled = true;
    showAppStatus('กำลังบันทึกออเดอร์...', 'info', adminOrderAppStatus);

    try {
        const newRef = push(ref(database, 'orders'));
        const orderData = {
            platform: platform || 'Unknown',
            platformOrderId: platformOrderId || null,
            packageCode: packageCode,
            dueDate: dueDate,
            createdAt: serverTimestamp(),
            createdBy_adminUid: currentUser.uid,
            notes: notes || null,
            status: 'Adding Items'
        };
        await set(newRef, orderData);
        showAppStatus('สร้างออเดอร์เรียบร้อย', 'success', adminOrderAppStatus);
        loadOrderForAddingItems(newRef.key);
    } catch (err) {
        console.error('save initial order error', err);
        showAppStatus('เกิดข้อผิดพลาด: ' + err.message, 'error', adminOrderAppStatus);
    } finally {
        if (adminOrderSaveButton) adminOrderSaveButton.disabled = false;
    }
}
