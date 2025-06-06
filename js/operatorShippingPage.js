// js/operatorShippingPage.js
import { showPage, uiElements } from './ui.js';
import { database, storage, auth } from './config.js';
import { ref, set, get, update, serverTimestamp, push, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { ref as storageRefFirebase, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"; // Renamed to avoid conflict
import { showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentActiveBatchId = null; // Stores the ID of the batch currently being worked on
let itemsInCurrentBatch = {}; // Stores { orderKey: packageCode } for the current batch
let shipmentGroupPhotoFile = null; // Stores the selected group photo file for shipment

async function getExistingOpenBatchForUser(userUid) {
    const batchesRef = ref(database, 'shipmentBatches');
    const userBatchesQuery = query(batchesRef, orderByChild('createdBy_operatorUid'), equalTo(userUid));
    const snapshot = await get(userBatchesQuery);
    if (snapshot.exists()) {
        let found = null;
        snapshot.forEach(child => {
            if (!found && child.val().status === 'Open') {
                found = { id: child.key, data: child.val() };
            }
        });
        return found;
    }
    return null;
}

async function ensureBatchExists(showMessages = false) {
    if (currentActiveBatchId) return;
    const currentUser = getCurrentUser();
    if (!currentUser) { if (showMessages) showAppStatus("กรุณา Login ก่อน", "error", uiElements.appStatus); return; }

    const existing = await getExistingOpenBatchForUser(currentUser.uid);
    if (existing) {
        currentActiveBatchId = existing.id;
        itemsInCurrentBatch = {}; // No items are persisted before finalizing
        if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = currentActiveBatchId;
        renderBatchItems();
        if (showMessages) showAppStatus(`ใช้ Batch เดิม: ${currentActiveBatchId}`, 'info', uiElements.appStatus);
        return;
    }

    let courier = uiElements.courierSelect ? uiElements.courierSelect.value : '';
    if (courier === 'Other') {
        courier = uiElements.otherCourierInput.value.trim();
    }
    if (!courier) {
        courier = 'Unknown';
    }

    const newBatchRef = push(ref(database, 'shipmentBatches'));
    currentActiveBatchId = newBatchRef.key;
    itemsInCurrentBatch = {};

    const batchData = {
        batchId: currentActiveBatchId,
        courierShop: courier,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy_operatorUid: currentUser.uid,
        orders: {}
    };

    try {
        await set(newBatchRef, batchData);
        if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = currentActiveBatchId;
        renderBatchItems();
        if (showMessages) showAppStatus(`สร้าง Batch ID: ${currentActiveBatchId} สำหรับ ${courier} สำเร็จ`, "success", uiElements.appStatus);
    } catch (error) {
        console.error("Error creating new batch:", error);
        if (showMessages) showAppStatus("เกิดข้อผิดพลาดในการสร้าง Batch: " + error.message, "error", uiElements.appStatus);
        currentActiveBatchId = null;
    }
}

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
    ensureBatchExists(false).then(() => {
        if (currentActiveBatchId) {
            if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = currentActiveBatchId;
            renderBatchItems();
        } else {
            if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = 'N/A';
            if (uiElements.batchItemList) uiElements.batchItemList.innerHTML = '<li>ยังไม่มีพัสดุใน Batch นี้</li>';
            if (uiElements.batchItemCount) uiElements.batchItemCount.textContent = '0';
        }
    });
    if (uiElements.courierSelect) uiElements.courierSelect.value = "";
    if (uiElements.otherCourierInput) {
        uiElements.otherCourierInput.value = "";
        uiElements.otherCourierInput.classList.add('hidden');
    }
    showAppStatus("พร้อมสำหรับการจัดการ Batch การส่ง", "info", uiElements.appStatus);
}

async function createOrSelectBatch() {
    await ensureBatchExists(true);
}

let html5QrScannerForBatch = null;
let isBatchScannerStopping = false; // Flag to prevent double stop calls
function startScanForBatch() {
    ensureBatchExists(false).then(() => {
        if (!currentActiveBatchId) {
            showAppStatus("กรุณาเลือก Courier และสร้าง Batch ก่อน", "error", uiElements.appStatus);
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
                const camId = cameras[0].id;
                html5QrScannerForBatch.start(
                    { deviceId: { exact: camId } }, { fps: 10, qrbox: { width: 250, height: 250 } },
                    async (decodedText, decodedResult) => {
                        const packageCodeScanned = decodedText.trim();
                        console.log(`Scanned for batch: ${packageCodeScanned}`);

                        const ordersRef = ref(database, 'orders');
                        const ordersQuery = query(ordersRef, orderByChild('packageCode'), equalTo(packageCodeScanned));
                        const snapshot = await get(ordersQuery);

                        let orderKeyFound = null;
                        if (snapshot.exists()) {
                            snapshot.forEach(child => {
                                if (!orderKeyFound && (child.val().status === "Ready for Shipment" || child.val().status === "Pack Approved")) {
                                    orderKeyFound = child.key;
                                }
                            });
                        }

                        if (orderKeyFound) {
                            if (itemsInCurrentBatch[orderKeyFound]) {
                                showAppStatus(`พัสดุ ${packageCodeScanned} อยู่ใน Batch นี้แล้ว`, 'info', uiElements.appStatus);
                            } else {
                                itemsInCurrentBatch[orderKeyFound] = packageCodeScanned;
                                renderBatchItems();
                                showAppStatus(`เพิ่ม ${packageCodeScanned} เข้า Batch สำเร็จ`, 'success', uiElements.appStatus);
                            }
                        } else {
                            showAppStatus(`ไม่พบออเดอร์ที่พร้อมส่งสำหรับรหัสพัสดุ: ${packageCodeScanned} หรือสถานะไม่ถูกต้อง`, "error", uiElements.appStatus);
                        }
                    },
                    (errorMessage) => { /* ignore scan errors */ }
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
    });
}

async function stopScanForBatch() {
    if (isBatchScannerStopping) return; // Prevent concurrent stop attempts
    isBatchScannerStopping = true;
    if (html5QrScannerForBatch) {
        try {
            // Some devices may trigger stop twice; check if scanner is running
            if (html5QrScannerForBatch._isScanning) {
                await html5QrScannerForBatch.stop();
            }
            await html5QrScannerForBatch.clear();
        } catch (e) {
            console.warn("Error stopping batch scanner:", e);
        }
        html5QrScannerForBatch = null;
    }
    uiElements.qrScannerContainer_Batch.classList.add('hidden');
    uiElements.stopScanForBatchButton.classList.add('hidden');
    uiElements.startScanForBatchButton.disabled = false;
    isBatchScannerStopping = false;
}

window.stopScanForBatch = stopScanForBatch;

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
        li.textContent = packageCode;
        // Add a remove button if needed
        uiElements.batchItemList.appendChild(li);
    }
}

async function confirmBatchAndMoveToPhoto() {
    await ensureBatchExists(false);
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
