// js/operatorShippingPage.js
import { showPage, uiElements } from './ui.js';
import { database, storage, auth } from './config.js';
import { ref, set, get, update, serverTimestamp, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { ref as storageRefFirebase, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"; // Renamed to avoid conflict
import { showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentActiveBatchId = null; // Stores the ID of the batch currently being worked on
let itemsInCurrentBatch = {}; // Stores { orderKey: packageCode } for the current batch
let shipmentGroupPhotoFile = null; // Stores the selected group photo file for shipment

export function initializeOperatorShippingPageListeners() {
    if (!uiElements.createNewBatchButton || !uiElements.startScanForBatchButton || 
        !uiElements.confirmBatchAndProceedButton || !uiElements.finalizeShipmentButton ||
        !uiElements.courierSelect || !uiElements.otherCourierInput ||
        !uiElements.stopScanForBatchButton || !uiElements.getGpsButton || !uiElements.shipmentGroupPhoto) {
        console.warn("Operator Shipping Page elements not fully initialized for listeners.");
        return;
    }

    uiElements.courierSelect.addEventListener('change', () => {
        uiElements.otherCourierInput.classList.toggle('hidden', uiElements.courierSelect.value !== 'Other');
    });

    uiElements.createNewBatchButton.addEventListener('click', createOrSelectBatch);
    uiElements.startScanForBatchButton.addEventListener('click', startScanForBatch);
    uiElements.stopScanForBatchButton.addEventListener('click', stopScanForBatch);
    uiElements.confirmBatchAndProceedButton.addEventListener('click', confirmBatchAndMoveToPhoto);
    
    uiElements.shipmentGroupPhoto.addEventListener('change', handleShipmentGroupPhotoSelect);
    uiElements.getGpsButton.addEventListener('click', getGpsLocation);
    uiElements.finalizeShipmentButton.addEventListener('click', finalizeShipment);
}

export function setupShippingBatchPage() {
    // This function is called when the 'operatorShippingBatchPage' is shown
    // Reset or load existing batch state if needed
    if (currentActiveBatchId) {
        if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = currentActiveBatchId;
        renderBatchItems(); // Re-render items if a batch is already active
    } else {
        if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = 'N/A';
        if (uiElements.batchItemList) uiElements.batchItemList.innerHTML = '<li>ยังไม่มีพัสดุใน Batch นี้</li>';
        if (uiElements.batchItemCount) uiElements.batchItemCount.textContent = '0';
    }
    if (uiElements.courierSelect) uiElements.courierSelect.value = "";
    if (uiElements.otherCourierInput) {
        uiElements.otherCourierInput.value = "";
        uiElements.otherCourierInput.classList.add('hidden');
    }
    showAppStatus("พร้อมสำหรับการจัดการ Batch การส่ง", "info", uiElements.appStatus);
}

async function createOrSelectBatch() {
    const currentUser = getCurrentUser();
    if (!currentUser) { showAppStatus("กรุณา Login ก่อน", "error", uiElements.appStatus); return; }

    let courier = uiElements.courierSelect.value;
    if (courier === 'Other') {
        courier = uiElements.otherCourierInput.value.trim();
    }
    if (!courier) {
        showAppStatus("กรุณาเลือกหรือระบุ Courier", "error", uiElements.appStatus);
        return;
    }

    // For simplicity, we'll always create a new batch ID.
    // In a real app, you might want to let users resume an existing open batch.
    const newBatchRef = push(ref(database, 'shipmentBatches'));
    currentActiveBatchId = newBatchRef.key;
    itemsInCurrentBatch = {}; // Reset items for the new batch

    const batchData = {
        batchId: currentActiveBatchId,
        courierShop: courier,
        status: "Open", // Initial status for a new batch
        createdAt: serverTimestamp(),
        createdBy_operatorUid: currentUser.uid,
        orders: {} // Will be populated as items are scanned
    };

    try {
        await set(newBatchRef, batchData);
        if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = currentActiveBatchId;
        renderBatchItems(); // Clear list and show 'no items'
        showAppStatus(`สร้าง Batch ID: ${currentActiveBatchId} สำหรับ ${courier} สำเร็จ`, "success", uiElements.appStatus);
    } catch (error) {
        console.error("Error creating new batch:", error);
        showAppStatus("เกิดข้อผิดพลาดในการสร้าง Batch: " + error.message, "error", uiElements.appStatus);
        currentActiveBatchId = null;
    }
}

let html5QrScannerForBatch = null;
function startScanForBatch() {
    if (!currentActiveBatchId) {
        showAppStatus("กรุณาสร้างหรือเลือก Batch ก่อนสแกนพัสดุ", "error", uiElements.appStatus);
        return;
    }
    if (!uiElements.qrScanner_Batch_div) { alert("QR Scanner element for Batch not found!"); return; }

    uiElements.qrScannerContainer_Batch.classList.remove('hidden');
    uiElements.stopScanForBatchButton.classList.remove('hidden');
    uiElements.startScanForBatchButton.disabled = true;

    if (!html5QrScannerForBatch) {
        html5QrScannerForBatch = new Html5Qrcode(uiElements.qrScanner_Batch_div.id, false);
    }
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            const backCamera = cameras.find(c => c.label.toLowerCase().includes('back'));
            const camId = (backCamera || cameras[0]).id;
            html5QrScannerForBatch.start(
                { deviceId: { exact: camId } }, { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText, decodedResult) => { // onScanSuccess
            const packageCodeScanned = decodedText.trim();
            console.log(`Scanned for batch: ${packageCodeScanned}`);
            // Find the order with this packageCode that is "Ready for Shipment" or similar
            // This requires a query or fetching all relevant orders and filtering client-side (less efficient for many orders)
            // For now, a simplified approach: assume packageCode is unique enough or part of a constructed orderKey
            
            // Find order by package code (this is a simplified search, ideally query by packageCode index)
            const ordersRef = ref(database, 'orders');
            const ordersQuery = query(ordersRef, orderByChild('packageCode'), equalTo(packageCodeScanned));
            const snapshot = await get(ordersQuery);

            let orderKeyFound = null;
            let orderDataFound = null;

            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    // Pick the first one that's ready for shipment if multiple match (unlikely if package codes are unique)
                    if (child.val().status === "Ready for Shipment" || child.val().status === "Pack Approved") {
                        orderKeyFound = child.key;
                        orderDataFound = child.val();
                    }
                });
            }

            if (orderKeyFound) {
                if (itemsInCurrentBatch[orderKeyFound]) {
                    showAppStatus(`พัสดุ ${packageCodeScanned} (Order: ${orderKeyFound}) อยู่ใน Batch นี้แล้ว`, "info", uiElements.appStatus);
                } else {
                    itemsInCurrentBatch[orderKeyFound] = packageCodeScanned; // Store package code for display
                    renderBatchItems();
                    showAppStatus(`เพิ่ม ${packageCodeScanned} (Order: ${orderKeyFound}) เข้า Batch สำเร็จ`, "success", uiElements.appStatus);
                }
            } else {
                showAppStatus(`ไม่พบออเดอร์ที่พร้อมส่งสำหรับรหัสพัสดุ: ${packageCodeScanned} หรือสถานะไม่ถูกต้อง`, "error", uiElements.appStatus);
            }
            // Scanner does not stop automatically here, user can scan multiple items
        },
                (errorMessage) => { /* console.warn("Batch Scan failure:", errorMessage); */ }
            ).catch(err => {
                alert("ไม่สามารถเปิดกล้องสแกน QR สำหรับ Batch ได้: " + (err?.message || err));
                uiElements.qrScannerContainer_Batch.classList.add('hidden');
                uiElements.stopScanForBatchButton.classList.add('hidden');
                uiElements.startScanForBatchButton.disabled = false;
            });
        } else {
            alert("ไม่พบกล้องบนอุปกรณ์");
            uiElements.qrScannerContainer_Batch.classList.add('hidden');
            uiElements.stopScanForBatchButton.classList.add('hidden');
            uiElements.startScanForBatchButton.disabled = false;
        }
    }).catch(err => {
        alert("ไม่สามารถเข้าถึงกล้อง: " + (err?.message || err));
        uiElements.qrScannerContainer_Batch.classList.add('hidden');
        uiElements.stopScanForBatchButton.classList.add('hidden');
        uiElements.startScanForBatchButton.disabled = false;
    });
}

function stopScanForBatch() {
    if (html5QrScannerForBatch) {
        html5QrScannerForBatch.stop().catch(e => console.warn("Error stopping batch scanner:", e));
    }
    uiElements.qrScannerContainer_Batch.classList.add('hidden');
    uiElements.stopScanForBatchButton.classList.add('hidden');
    uiElements.startScanForBatchButton.disabled = false;
}

function renderBatchItems() {
    if (!uiElements.batchItemList || !uiElements.batchItemCount) return;
    uiElements.batchItemList.innerHTML = '';
    const itemCount = Object.keys(itemsInCurrentBatch).length;
    uiElements.batchItemCount.textContent = itemCount;

    if (itemCount === 0) {
        uiElements.batchItemList.innerHTML = '<li>ยังไม่มีพัสดุใน Batch นี้</li>';
        return;
    }
    for (const orderKey in itemsInCurrentBatch) {
        const packageCode = itemsInCurrentBatch[orderKey];
        const li = document.createElement('li');
        li.textContent = `Order: ${orderKey.substring(0,10)}... - Pkg: ${packageCode}`;
        // Add a remove button if needed
        uiElements.batchItemList.appendChild(li);
    }
}

function confirmBatchAndMoveToPhoto() {
    if (!currentActiveBatchId || Object.keys(itemsInCurrentBatch).length === 0) {
        showAppStatus("กรุณาสร้าง Batch และเพิ่มพัสดุอย่างน้อย 1 รายการก่อน", "error", uiElements.appStatus);
        return;
    }
    // Populate info on the confirm shipment page
    if(uiElements.confirmShipBatchIdDisplay) uiElements.confirmShipBatchIdDisplay.textContent = currentActiveBatchId;
    if(uiElements.confirmShipCourierDisplay) uiElements.confirmShipCourierDisplay.textContent = document.getElementById('courierSelect').value === 'Other' ? document.getElementById('otherCourierInput').value : document.getElementById('courierSelect').value; // Get current courier
    if(uiElements.confirmShipItemCountDisplay) uiElements.confirmShipItemCountDisplay.textContent = Object.keys(itemsInCurrentBatch).length;
    
    if(uiElements.shipmentGroupPhoto) uiElements.shipmentGroupPhoto.value = ''; // Reset file input
    if(uiElements.shipmentGroupPhotoPreview) {
        uiElements.shipmentGroupPhotoPreview.classList.add('hidden');
        uiElements.shipmentGroupPhotoPreview.src = '#';
    }
    if(uiElements.shipmentGpsLocationDisplay) uiElements.shipmentGpsLocationDisplay.textContent = "กำลังรอข้อมูล GPS...";
    
    shipmentGroupPhotoFile = null; // Reset photo file
    showPage('operatorConfirmShipmentPage');
}


function handleShipmentGroupPhotoSelect(event) {
    if (!uiElements.shipmentGroupPhotoPreview) return;
    const file = event.target.files[0];
    if (file) {
        shipmentGroupPhotoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => { uiElements.shipmentGroupPhotoPreview.src = e.target.result; uiElements.shipmentGroupPhotoPreview.classList.remove('hidden'); }
        reader.readAsDataURL(file);
    } else {
        shipmentGroupPhotoFile = null;
        uiElements.shipmentGroupPhotoPreview.classList.add('hidden'); uiElements.shipmentGroupPhotoPreview.src = '#';
    }
}

function getGpsLocation() {
    if (!uiElements.shipmentGpsLocationDisplay) return;
    if (navigator.geolocation) {
        uiElements.shipmentGpsLocationDisplay.textContent = "กำลังดึงพิกัด GPS...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                uiElements.shipmentGpsLocationDisplay.textContent = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
                // You might want to store lat, lon in global variables to save with the batch
                window.currentShipmentLatitude = lat;
                window.currentShipmentLongitude = lon;
            },
            (error) => {
                console.warn("Error getting GPS location:", error);
                uiElements.shipmentGpsLocationDisplay.textContent = "ไม่สามารถดึง GPS: " + error.message;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        uiElements.shipmentGpsLocationDisplay.textContent = "เบราว์เซอร์นี้ไม่รองรับ Geolocation";
    }
}

async function finalizeShipment() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentActiveBatchId) { showAppStatus("ข้อมูลไม่ครบถ้วนสำหรับการยืนยันการส่ง", "error", uiElements.appStatus); return; }
    if (!shipmentGroupPhotoFile) { showAppStatus("กรุณาถ่ายรูปรวมพัสดุก่อน", "error", uiElements.appStatus); return; }

    uiElements.finalizeShipmentButton.disabled = true;
    showAppStatus("กำลังยืนยันการส่งและอัปโหลดรูป...", "info", uiElements.appStatus);

    try {
        // 1. Upload group photo
        const photoFileName = `shipment_${currentActiveBatchId}_${Date.now()}_${shipmentGroupPhotoFile.name}`;
        const photoPath = `shipmentGroupPhotos/${currentActiveBatchId}/${photoFileName}`;
        const imageRef = storageRefFirebase(storage, photoPath); // Use aliased storageRef
        await uploadBytes(imageRef, shipmentGroupPhotoFile);
        const groupPhotoUrl = await getDownloadURL(imageRef);

        // 2. Prepare updates for the batch
        const batchUpdates = {};
        batchUpdates[`/shipmentBatches/${currentActiveBatchId}/status`] = "Shipped - Pending Supervisor Check"; // Or "Shipped"
        batchUpdates[`/shipmentBatches/${currentActiveBatchId}/groupPhotoUrl`] = groupPhotoUrl;
        batchUpdates[`/shipmentBatches/${currentActiveBatchId}/shippedAt_actual`] = serverTimestamp();
        if (window.currentShipmentLatitude && window.currentShipmentLongitude) {
            batchUpdates[`/shipmentBatches/${currentActiveBatchId}/gpsLocation`] = {
                latitude: window.currentShipmentLatitude,
                longitude: window.currentShipmentLongitude
            };
        }
        // Add order keys to the batch orders node
        for (const orderKey in itemsInCurrentBatch) {
            batchUpdates[`/shipmentBatches/${currentActiveBatchId}/orders/${orderKey}`] = true;
        }

        // 3. Prepare updates for each order within the batch
        const orderUpdates = {};
        for (const orderKey in itemsInCurrentBatch) {
            orderUpdates[`/orders/${orderKey}/status`] = "Shipped";
            orderUpdates[`/orders/${orderKey}/shipmentInfo/batchId`] = currentActiveBatchId;
            orderUpdates[`/orders/${orderKey}/shipmentInfo/shippedAt_actual`] = serverTimestamp(); // Redundant but can be useful per order
            orderUpdates[`/orders/${orderKey}/lastUpdatedAt`] = serverTimestamp();
        }

        // Perform all updates (batch and individual orders)
        // It's better to combine these into a single multi-path update if possible,
        // but Realtime DB might require separate updates or careful structuring for atomic operations.
        // For now, separate updates:
        await update(ref(database), batchUpdates); // Update batch details
        await update(ref(database), orderUpdates); // Update individual orders

        showAppStatus(`Batch ${currentActiveBatchId} ยืนยันการส่งเรียบร้อย!`, "success", uiElements.appStatus);
        currentActiveBatchId = null; // Clear active batch
        itemsInCurrentBatch = {};
        shipmentGroupPhotoFile = null;
        window.currentShipmentLatitude = null;
        window.currentShipmentLongitude = null;
        showPage('dashboardPage'); // Or operator's task list

    } catch (error) {
        console.error("Error finalizing shipment:", error);
        showAppStatus("เกิดข้อผิดพลาดในการยืนยันการส่ง: " + error.message, "error", uiElements.appStatus);
    } finally {
        uiElements.finalizeShipmentButton.disabled = false;
    }
}
