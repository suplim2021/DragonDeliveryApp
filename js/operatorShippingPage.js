// js/operatorShippingPage.js
import { showPage, uiElements } from './ui.js';
import { database, storage, auth } from './config.js';
import { ref, set, get, update, serverTimestamp, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { ref as storageRefFirebase, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"; // Renamed to avoid conflict
import { showAppStatus, showToast, beepSuccess, beepError, getTimestampForFilename, resizeImageFileIfNeeded } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentActiveBatchId = null; // Stores the ID of the batch currently being worked on
let currentBatchCourier = '';
let itemsInCurrentBatch = {}; // Stores { orderKey: {packageCode, notes, items} }
let shipmentGroupPhotoFile = null; // Stores the selected group photo file for shipment
let readyToShipPackages = []; // Array of {orderKey, packageCode, platform}
let filteredReadyPackages = [];
let preserveBatchStateForReturn = false;

export function initializeOperatorShippingPageListeners() {
    if (!uiElements.createNewBatchButton || !uiElements.startScanForBatchButton || 
        !uiElements.confirmBatchAndProceedButton || !uiElements.finalizeShipmentButton ||
        !uiElements.courierSelect || !uiElements.otherCourierInput ||
        !uiElements.stopScanForBatchButton || !uiElements.shipmentGroupPhoto) {
        console.warn("Operator Shipping Page elements not fully initialized for listeners.");
        return;
    }

    uiElements.courierSelect.addEventListener('change', () => {
        uiElements.otherCourierInput.classList.toggle('hidden', uiElements.courierSelect.value !== 'Other');
        filterReadyPackagesByCourier();
    });

    uiElements.createNewBatchButton.addEventListener('click', createOrSelectBatch);
    uiElements.startScanForBatchButton.addEventListener('click', startScanForBatch);
    uiElements.stopScanForBatchButton.addEventListener('click', stopScanForBatch);
    uiElements.confirmBatchAndProceedButton.addEventListener('click', confirmBatchAndMoveToPhoto);

    if (uiElements.addManualPackageButton && uiElements.manualBatchPackageInput) {
        uiElements.addManualPackageButton.addEventListener('click', () => {
            const code = uiElements.manualBatchPackageInput.value.trim();
            if (code) { addPackageCodeManually(code); uiElements.manualBatchPackageInput.value = ''; }
        });
        uiElements.manualBatchPackageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); const code = uiElements.manualBatchPackageInput.value.trim(); if (code) { addPackageCodeManually(code); uiElements.manualBatchPackageInput.value = ''; } }
        });
    }

    if (uiElements.readyToShipCheckboxList) {
        uiElements.readyToShipCheckboxList.addEventListener('change', (e) => {
            const cb = e.target;
            if (cb && cb.matches('input[type="checkbox"]')) {
                const orderKey = cb.dataset.orderkey;
                const code = cb.dataset.code;
                if (cb.checked) {
                    addPackageCodeManually(code);
                } else {
                    removePackageFromBatch(orderKey);
                }
            }
        });
    }

    if (uiElements.selectAllReadyPackagesButton) {
        uiElements.selectAllReadyPackagesButton.addEventListener('click', selectAllFilteredPackages);
    }
    
    uiElements.shipmentGroupPhoto.addEventListener('change', handleShipmentGroupPhotoSelect);
    uiElements.finalizeShipmentButton.addEventListener('click', finalizeShipment);
    if (uiElements.backToShippingBatchButton) {
        uiElements.backToShippingBatchButton.addEventListener('click', () => {
            preserveBatchStateForReturn = true;
            showPage('operatorShippingBatchPage');
        });
    }

    updateBatchIdVisibilityForRole();
}

export function setupShippingBatchPage() {
    // This function is called when the 'operatorShippingBatchPage' is shown
    // Reset or load existing batch state if needed
    if (currentActiveBatchId) {
        if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = currentActiveBatchId;
        renderBatchItems(); // Re-render items if a batch is already active
    } else {
        if (uiElements.currentBatchIdDisplay) uiElements.currentBatchIdDisplay.textContent = 'N/A';
        if (uiElements.batchItemsTableBody) uiElements.batchItemsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">ยังไม่มีพัสดุในรอบส่งนี้</td></tr>';
        if (uiElements.batchItemCount) uiElements.batchItemCount.textContent = '0';
    }
    if (preserveBatchStateForReturn && currentActiveBatchId) {
        if (uiElements.courierSelect) uiElements.courierSelect.value = currentBatchCourier || '';
        if (uiElements.otherCourierInput) {
            uiElements.otherCourierInput.value = uiElements.courierSelect.value === 'Other' ? currentBatchCourier : '';
            uiElements.otherCourierInput.classList.toggle('hidden', uiElements.courierSelect.value !== 'Other');
        }
    } else {
        if (uiElements.courierSelect) uiElements.courierSelect.value = "";
        if (uiElements.otherCourierInput) {
            uiElements.otherCourierInput.value = "";
            uiElements.otherCourierInput.classList.add('hidden');
        }
        currentBatchCourier = '';
    }
    preserveBatchStateForReturn = false;
    loadReadyToShipPackages();
    showAppStatus("พร้อมสำหรับการจัดการรอบส่ง", "info", uiElements.appStatus);
}

export function updateBatchIdVisibilityForRole() {
    const role = getCurrentUserRole();
    const hide = role === 'operator' || role === 'supervisor';
    const batchIdParent = uiElements.currentBatchIdDisplay ? uiElements.currentBatchIdDisplay.parentElement : null;
    if (batchIdParent) batchIdParent.classList.toggle('hidden', hide);
    const confirmParent = uiElements.confirmShipBatchIdDisplay ? uiElements.confirmShipBatchIdDisplay.parentElement : null;
    if (confirmParent) confirmParent.classList.toggle('hidden', hide);
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
    currentBatchCourier = courier;

    // Create batch ID based on timestamp to make it human readable
    currentActiveBatchId = getTimestampForFilename();
    itemsInCurrentBatch = {}; // Reset items for the new batch
    const newBatchRef = ref(database, `shipmentBatches/${currentActiveBatchId}`);

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
        showAppStatus(`สร้างรอบส่งใหม่ (ID: ${currentActiveBatchId}) สำหรับ ${courier} สำเร็จ`, "success", uiElements.appStatus);
    } catch (error) {
        console.error("Error creating new batch:", error);
        showAppStatus("เกิดข้อผิดพลาดในการสร้างรอบส่ง: " + error.message, "error", uiElements.appStatus);
        currentActiveBatchId = null;
    }
}

let html5QrScannerForBatch = null;
let isBatchScannerStopping = false; // Flag to prevent double stop calls
function startScanForBatch() {
    if (!uiElements.qrScanner_Batch_div) { showToast("QR Scanner element for Batch not found!", "error"); return; }

    uiElements.qrScannerContainer_Batch.classList.remove('hidden');
    uiElements.stopScanForBatchButton.classList.remove('hidden');
    uiElements.startScanForBatchButton.disabled = true;

    if (!html5QrScannerForBatch) {
        html5QrScannerForBatch = new Html5Qrcode(uiElements.qrScanner_Batch_div.id, false);
    }
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            let cam = cameras.find(c => /back|rear|environment/i.test(c.label));
            if (!cam) cam = cameras[cameras.length - 1];
            const camId = cam.id;
            html5QrScannerForBatch.start(
                { deviceId: { exact: camId } },
                { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { focusMode: "continuous", facingMode: "environment" } },
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
                    showAppStatus(`พัสดุ ${packageCodeScanned} อยู่ใน Batch นี้แล้ว`, 'info', uiElements.appStatus);
                } else {
                    itemsInCurrentBatch[orderKeyFound] = {
                        packageCode: packageCodeScanned,
                        notes: orderDataFound.notes || '',
                        items: orderDataFound.items ? Object.values(orderDataFound.items).map(i => `${i.productName} - ${i.quantity} ${i.unit}`).join(', ') : ''
                    };
                    renderBatchItems();
                    showAppStatus(`เพิ่ม ${packageCodeScanned} เข้า Batch สำเร็จ`, 'success', uiElements.appStatus);
                }
                beepSuccess();
            } else {
                showAppStatus(`ไม่พบออเดอร์ที่พร้อมส่งสำหรับรหัสพัสดุ: ${packageCodeScanned} หรือสถานะไม่ถูกต้อง`, "error", uiElements.appStatus);
            }
            // Scanner does not stop automatically here, user can scan multiple items
        },
                (errorMessage) => { /* console.warn("Batch Scan failure:", errorMessage); */ beepError(); }
            ).catch(err => {
                beepError();
                showToast("ไม่สามารถเปิดกล้องสแกน QR สำหรับรอบส่งได้: " + (err?.message || err), "error");
                uiElements.qrScannerContainer_Batch.classList.add('hidden');
                uiElements.stopScanForBatchButton.classList.add('hidden');
                uiElements.startScanForBatchButton.disabled = false;
            });
        } else {
            beepError();
            showToast("ไม่พบกล้องบนอุปกรณ์", "error");
            uiElements.qrScannerContainer_Batch.classList.add('hidden');
            uiElements.stopScanForBatchButton.classList.add('hidden');
            uiElements.startScanForBatchButton.disabled = false;
        }
    }).catch(err => {
        beepError();
        showToast("ไม่สามารถเข้าถึงกล้อง: " + (err?.message || err), "error");
        uiElements.qrScannerContainer_Batch.classList.add('hidden');
        uiElements.stopScanForBatchButton.classList.add('hidden');
        uiElements.startScanForBatchButton.disabled = false;
    });
}

async function stopScanForBatch() {
    if (isBatchScannerStopping) return; // Prevent concurrent stop attempts
    isBatchScannerStopping = true;
    if (html5QrScannerForBatch) {
        try {
            // Some devices may trigger stop twice; check if scanner is running
            if (html5QrScannerForBatch.isScanning) {
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

async function loadReadyToShipPackages() {
    if (!uiElements.readyToShipDatalist || !uiElements.readyToShipCheckboxList) return;
    readyToShipPackages = [];
    const statuses = ['Ready for Shipment', 'Pack Approved'];
    try {
        for (const status of statuses) {
            const q = query(ref(database, 'orders'), orderByChild('status'), equalTo(status));
            const snap = await get(q);
            if (snap.exists()) {
                snap.forEach(child => {
                    const pkg = child.val().packageCode;
                    if (pkg) {
                        readyToShipPackages.push({
                            orderKey: child.key,
                            packageCode: pkg,
                            platform: child.val().platform || 'Other',
                            notes: child.val().notes || '',
                            items: child.val().items ? Object.values(child.val().items).map(i => `${i.productName} - ${i.quantity} ${i.unit}`).join(', ') : ''
                        });
                    }
                });
            }
        }
        filterReadyPackagesByCourier();
    } catch (err) {
        console.error('Error loading ready to ship packages', err);
    }
}

function addPackageCodeManually(packageCode) {
    const entry = readyToShipPackages.find(p => p.packageCode === packageCode);
    if (!entry) {
        showAppStatus(`ไม่พบพัสดุที่พร้อมส่งสำหรับรหัส: ${packageCode}`, 'error', uiElements.appStatus);
        return;
    }
    if (itemsInCurrentBatch[entry.orderKey]) {
        showAppStatus(`พัสดุ ${packageCode} อยู่ในรอบส่งนี้แล้ว`, 'info', uiElements.appStatus);
        return;
    }
    itemsInCurrentBatch[entry.orderKey] = {
        packageCode: entry.packageCode,
        notes: entry.notes,
        items: entry.items
    };
    if (uiElements.readyToShipCheckboxList) {
        const cb = uiElements.readyToShipCheckboxList.querySelector(`input[data-orderkey="${entry.orderKey}"]`);
        if (cb) cb.checked = true;
    }
    renderBatchItems();
    showAppStatus(`เพิ่ม ${packageCode} เข้ารอบส่งสำเร็จ`, 'success', uiElements.appStatus);
}

function removePackageFromBatch(orderKey) {
    const entry = itemsInCurrentBatch[orderKey];
    if (!entry) return;
    delete itemsInCurrentBatch[orderKey];
    if (uiElements.readyToShipCheckboxList) {
        const cb = uiElements.readyToShipCheckboxList.querySelector(`input[data-orderkey="${orderKey}"]`);
        if (cb) cb.checked = false;
    }
    renderBatchItems();
    showAppStatus(`ลบ ${entry.packageCode} ออกจากรอบส่ง`, 'info', uiElements.appStatus);
}

function getPlatformFilter(value) {
    if (!value) return '';
    if (value === 'บริษัทส่งเอง') return 'บริษัทส่งเอง';
    if (value.startsWith('ส่งด่วน Shopee')) return 'ส่งด่วน Shopee';
    if (value.startsWith('Shopee')) return 'Shopee';
    if (value.startsWith('Lazada')) return 'Lazada';
    if (value.startsWith('Tiktok')) return 'Tiktok';
    return '';
}

function filterReadyPackagesByCourier() {
    if (!uiElements.readyToShipDatalist || !uiElements.readyToShipCheckboxList) return;
    uiElements.readyToShipDatalist.innerHTML = '';
    uiElements.readyToShipCheckboxList.innerHTML = '';
    const platform = getPlatformFilter(uiElements.courierSelect.value);
    filteredReadyPackages = platform ? readyToShipPackages.filter(p => p.platform === platform) : readyToShipPackages.slice();

    const uniqueCodes = Array.from(new Set(filteredReadyPackages.map(p => p.packageCode)));
    uniqueCodes.forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        uiElements.readyToShipDatalist.appendChild(opt);
    });

    filteredReadyPackages.forEach(entry => {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.orderkey = entry.orderKey;
        cb.dataset.code = entry.packageCode;
        if (itemsInCurrentBatch[entry.orderKey]) cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + entry.packageCode));
        li.appendChild(label);
        if (entry.notes) {
            const noteEl = document.createElement('small');
            noteEl.className = 'order-note';
            noteEl.textContent = entry.notes;
            li.appendChild(noteEl);
        }
        uiElements.readyToShipCheckboxList.appendChild(li);
    });

    if (typeof window.setNavBadgeCount === 'function') {
        window.setNavBadgeCount('operatorShippingBatchPage', filteredReadyPackages.length);
    }
}

function selectAllFilteredPackages() {
    if (!uiElements.readyToShipCheckboxList) return;
    uiElements.readyToShipCheckboxList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) {
            cb.checked = true;
            addPackageCodeManually(cb.dataset.code);
        }
    });
}

function renderBatchItems() {
    if (!uiElements.batchItemsTableBody || !uiElements.batchItemCount) return;
    uiElements.batchItemsTableBody.innerHTML = '';
    const itemCount = Object.keys(itemsInCurrentBatch).length;
    uiElements.batchItemCount.textContent = itemCount;

    if (itemCount === 0) {
        uiElements.batchItemsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">ยังไม่มีพัสดุในรอบส่งนี้</td></tr>';
        return;
    }
    for (const orderKey in itemsInCurrentBatch) {
        const entry = itemsInCurrentBatch[orderKey];
        const tr = document.createElement('tr');
        const codeTd = document.createElement('td');
        codeTd.textContent = entry.packageCode;
        tr.appendChild(codeTd);
        const noteTd = document.createElement('td');
        noteTd.innerHTML = entry.notes ? `<span class="order-note">${entry.notes}</span>` : '';
        tr.appendChild(noteTd);
        const itemsTd = document.createElement('td');
        itemsTd.textContent = entry.items || '';
        tr.appendChild(itemsTd);
        const removeTd = document.createElement('td');
        const btn = document.createElement('button');
        btn.textContent = '✖';
        btn.className = 'remove-batch-item-btn';
        btn.addEventListener('click', () => removePackageFromBatch(orderKey));
        removeTd.appendChild(btn);
        tr.appendChild(removeTd);
        uiElements.batchItemsTableBody.appendChild(tr);
    }
}

function confirmBatchAndMoveToPhoto() {
    if (Object.keys(itemsInCurrentBatch).length === 0) {
        showAppStatus("กรุณาเพิ่มพัสดุอย่างน้อย 1 รายการก่อน", "error", uiElements.appStatus);
        return;
    }
    let courier = uiElements.courierSelect.value;
    if (courier === 'Other') courier = uiElements.otherCourierInput.value.trim();
    if (!currentBatchCourier && !courier) {
        showAppStatus("กรุณาเลือกหรือระบุ Courier", "error", uiElements.appStatus);
        return;
    }
    if (!currentBatchCourier) currentBatchCourier = courier;
    if(uiElements.confirmShipBatchIdDisplay) uiElements.confirmShipBatchIdDisplay.textContent = currentActiveBatchId || 'จะสร้างอัตโนมัติ';
    if(uiElements.confirmShipCourierDisplay) uiElements.confirmShipCourierDisplay.textContent = currentBatchCourier;
    if(uiElements.confirmShipItemCountDisplay) uiElements.confirmShipItemCountDisplay.textContent = Object.keys(itemsInCurrentBatch).length;

    if(uiElements.confirmPackagesTableBody){
        uiElements.confirmPackagesTableBody.innerHTML = '';
        for(const orderKey in itemsInCurrentBatch){
            const entry = itemsInCurrentBatch[orderKey];
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${entry.packageCode}</td><td>${entry.notes ? `<span class="order-note">${entry.notes}</span>` : ''}</td><td>${entry.items || ''}</td>`;
            uiElements.confirmPackagesTableBody.appendChild(tr);
        }
    }

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


async function finalizeShipment() {
    const currentUser = getCurrentUser();
    if (!currentUser || Object.keys(itemsInCurrentBatch).length === 0) { showAppStatus("ข้อมูลไม่ครบถ้วนสำหรับการยืนยันการส่ง", "error", uiElements.appStatus); return; }
    if (!currentBatchCourier) { showAppStatus("กรุณาเลือกหรือระบุ Courier", "error", uiElements.appStatus); return; }
    if (!shipmentGroupPhotoFile) { showAppStatus("กรุณาถ่ายรูปรวมพัสดุก่อน", "error", uiElements.appStatus); return; }

    uiElements.finalizeShipmentButton.disabled = true;
    showAppStatus("กำลังยืนยันการส่งและอัปโหลดรูป...", "info", uiElements.appStatus);

    try {
        if (!currentActiveBatchId) {
            currentActiveBatchId = getTimestampForFilename();
        }

        // 1. Upload group photo
        const timestamp = getTimestampForFilename();
        const extension = shipmentGroupPhotoFile.name.split('.').pop();
        const photoFileName = `shipment_${currentActiveBatchId}_${timestamp}.${extension}`;
        const photoPath = `shipmentGroupPhotos/${currentActiveBatchId}/${photoFileName}`;
        const imageRef = storageRefFirebase(storage, photoPath); // Use aliased storageRef
        const resized = await resizeImageFileIfNeeded(shipmentGroupPhotoFile, 500);
        await uploadBytes(imageRef, resized);
        const groupPhotoUrl = await getDownloadURL(imageRef);

        // 2. Prepare updates for the batch
        const batchRef = ref(database, `shipmentBatches/${currentActiveBatchId}`);
        const batchUpdates = {};
        if (await get(batchRef).then(s => !s.exists())) {
            batchUpdates.batchId = currentActiveBatchId;
            batchUpdates.courierShop = currentBatchCourier;
            batchUpdates.createdAt = serverTimestamp();
            batchUpdates.createdBy_operatorUid = currentUser.uid;
        }
        batchUpdates.status = "Shipped - Pending Supervisor Check";
        batchUpdates.groupPhotoUrl = groupPhotoUrl;
        batchUpdates.shippedAt_actual = serverTimestamp();
        for (const orderKey in itemsInCurrentBatch) {
            batchUpdates[`orders/${orderKey}`] = true;
        }
        await update(batchRef, batchUpdates);

        // 3. Prepare updates for each order within the batch
        const orderUpdates = {};
        for (const orderKey in itemsInCurrentBatch) {
            orderUpdates[`/orders/${orderKey}/status`] = "Shipped";
            orderUpdates[`/orders/${orderKey}/shipmentInfo/batchId`] = currentActiveBatchId;
            orderUpdates[`/orders/${orderKey}/shipmentInfo/shippedAt_actual`] = serverTimestamp(); // Redundant but can be useful per order
            orderUpdates[`/orders/${orderKey}/lastUpdatedAt`] = serverTimestamp();
        }

        // Perform order updates
        await update(ref(database), orderUpdates); // Update individual orders

        showAppStatus(`รอบส่ง ${currentActiveBatchId} ยืนยันการส่งเรียบร้อย!`, "success", uiElements.appStatus);
        currentActiveBatchId = null; // Clear active batch
        currentBatchCourier = '';
        itemsInCurrentBatch = {};
        shipmentGroupPhotoFile = null;
        showPage('dashboardPage'); // Or operator's task list

    } catch (error) {
        console.error("Error finalizing shipment:", error);
        showAppStatus("เกิดข้อผิดพลาดในการยืนยันการส่ง: " + error.message, "error", uiElements.appStatus);
    } finally {
        uiElements.finalizeShipmentButton.disabled = false;
    }
}
