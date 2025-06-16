// js/operatorTasksPage.js
import { showPage, uiElements } from './ui.js'; // uiElements for DOM, showPage for navigation
import { database } from './config.js';        // Firebase database service
import { ref, query, orderByChild, equalTo, get, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showAppStatus, showToast, formatDateDDMMYYYY, beepSuccess, beepError } from './utils.js';
import { getCurrentUserRole } from './auth.js';

let html5QrScannerForPacking = null;
let isPackingScannerStopping = false;
let isProcessingPackingScan = false; // Prevent double handling of a scan
const orderDataMap = {};
const selectedOrdersForPick = new Set();


export function initializeOperatorTasksPageListeners() {
    if (uiElements.refreshOperatorTaskList) {
        uiElements.refreshOperatorTaskList.addEventListener('click', loadOperatorPendingTasks);
    } else {
        console.warn("Refresh button for Operator Task List not found.");
    }
    if (uiElements.startScanForPackingButton) {
        uiElements.startScanForPackingButton.addEventListener('click', startScanForPacking);
    }
    if (uiElements.stopScanForPackingButton) {
        uiElements.stopScanForPackingButton.addEventListener('click', stopScanForPacking);
    }
    if (uiElements.selectAllPendingOrdersButton) {
        uiElements.selectAllPendingOrdersButton.addEventListener('click', selectAllPendingOrders);
    }
}

export async function loadOperatorPendingTasks() {
    const currentUserRole = getCurrentUserRole();
    // Allow admin and supervisor to also view this page
    if (currentUserRole !== 'operator' && currentUserRole !== 'administrator' && currentUserRole !== 'supervisor') {
        showAppStatus("คุณไม่มีสิทธิ์เข้าถึงหน้านี้", "error", uiElements.appStatus);
        // Consider redirecting to dashboard or login if not authorized
        // showPage('dashboardPage');
        return;
    }

    if (!uiElements.operatorOrderListContainer || !uiElements.noOperatorTasksMessage || !uiElements.appStatus) {
        console.error("Required DOM elements for operator task list are missing.");
        return;
    }

    selectedOrdersForPick.clear();
    Object.keys(orderDataMap).forEach(k => delete orderDataMap[k]);
    updatePickListSummary();
    showAppStatus("กำลังโหลดรายการออเดอร์ที่รอแพ็ก...", "info", uiElements.appStatus);
    uiElements.operatorOrderListContainer.innerHTML = '<p style="text-align:center; padding:15px;">กำลังโหลด...</p>';
    uiElements.noOperatorTasksMessage.classList.add('hidden');

    try {
        const ordersRef = ref(database, 'orders');
        // Query for orders with status "Ready to Pack"
        const dataQuery = query(ordersRef, orderByChild('status'), equalTo('Ready to Pack'));
        const snapshot = await get(dataQuery);

        uiElements.operatorOrderListContainer.innerHTML = ''; // Clear loading message
        let tasksFound = 0;

        if (snapshot.exists()) {
            const tasksArray = [];
            snapshot.forEach(childSnapshot => {
                tasksFound++;
                tasksArray.push({ key: childSnapshot.key, ...childSnapshot.val() });
            });

            tasksArray.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

            tasksArray.forEach(task => {
                const orderKey = task.key;
                const orderData = task;
                orderDataMap[orderKey] = orderData;

                const orderItemDiv = document.createElement('div');
                orderItemDiv.className = 'order-item';
                orderItemDiv.style.marginBottom = '10px';
                orderItemDiv.style.padding = '10px';
                orderItemDiv.style.border = '1px solid #eee';
                orderItemDiv.style.borderRadius = '8px';

                const canManage = currentUserRole === 'administrator' || currentUserRole === 'supervisor';
                const editBtnHtml = canManage ?
                    `<button type="button" class="edit-items-btn" data-orderkey="${orderKey}" style="width:auto; padding:8px 15px; margin-top:10px; margin-left:5px; font-size:0.9em; background-color:#f39c12;">แก้ไขรายการ</button>` : '';
                const deleteBtnHtml = canManage ?
                    `<button type="button" class="delete-order-btn" data-orderkey="${orderKey}" style="width:auto; padding:8px 15px; margin-top:10px; margin-left:5px; font-size:0.9em; background-color:#e74c3c;">ลบ</button>` : '';

                orderItemDiv.innerHTML = `
                    <h4 style="margin-top:0; margin-bottom:8px;">Package Code: ${orderData.packageCode || 'N/A'}</h4>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>Platform:</strong> ${orderData.platform || 'N/A'}</p>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>Due Date:</strong> ${formatDateDDMMYYYY(orderData.dueDate)}</p>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>หมายเหตุ:</strong> ${orderData.notes || '-'}</p>
                    <button type="button" class="start-packing-btn" data-orderkey="${orderKey}" style="width:auto; padding:8px 15px; margin-top:10px; font-size:0.9em;">เริ่มแพ็กรายการนี้</button>
                    ${editBtnHtml}
                    ${deleteBtnHtml}
                `;
                const selectCb = document.createElement('input');
                selectCb.type = 'checkbox';
                selectCb.dataset.orderkey = orderKey;
                selectCb.style.marginRight = '8px';
                selectCb.addEventListener('change', handleOrderSelectChange);
                orderItemDiv.prepend(selectCb);
                uiElements.operatorOrderListContainer.appendChild(orderItemDiv);
            });

            if (tasksFound === 0) {
                uiElements.noOperatorTasksMessage.classList.remove('hidden');
                 showAppStatus("ไม่พบออเดอร์ที่รอแพ็กในขณะนี้", "info", uiElements.appStatus);
            } else {
                 showAppStatus(`พบ ${tasksFound} ออเดอร์รอแพ็ก`, "success", uiElements.appStatus);
            }

            // Add event listeners to the "เริ่มแพ็กรายการนี้" buttons
            uiElements.operatorOrderListContainer.querySelectorAll('.start-packing-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const orderKeyToPack = e.target.dataset.orderkey;
                    console.log(`Operator wants to pack order: ${orderKeyToPack}`);
                    // Call the function to load details for packing this specific order
                    // This function should be in operatorPackingPage.js and made globally accessible or imported
                    if (typeof window.loadOrderForPacking === 'function') {
                        window.loadOrderForPacking(orderKeyToPack);
                    } else {
                        console.error("loadOrderForPacking function is not available globally.");
                        showToast('เกิดข้อผิดพลาด: ไม่สามารถโหลดรายละเอียดออเดอร์ได้', 'error');
                    }
                });
            });

            // Add event listeners to the "แก้ไขรายการ" buttons (only for admin/supervisor)
            uiElements.operatorOrderListContainer.querySelectorAll('.edit-items-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const orderKeyToEdit = e.target.dataset.orderkey;
                    if (typeof window.loadOrderForAddingItems === 'function') {
                        window.loadOrderForAddingItems(orderKeyToEdit);
                    } else {
                        console.error('loadOrderForAddingItems function is not available globally.');
                        showToast('เกิดข้อผิดพลาด: ไม่สามารถโหลดหน้าปรับรายการสินค้าได้', 'error');
                    }
                });
            });

            // Add event listeners to the "ลบ" buttons
            uiElements.operatorOrderListContainer.querySelectorAll('.delete-order-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const orderKeyToDelete = e.target.dataset.orderkey;
                    deleteOrder(orderKeyToDelete);
                });
            });

        } else {
            uiElements.noOperatorTasksMessage.classList.remove('hidden');
            showAppStatus("ไม่พบออเดอร์ที่รอแพ็กในขณะนี้", "info", uiElements.appStatus);
        }
        if (typeof window.setNavBadgeCount === 'function') window.setNavBadgeCount('operatorTaskListPage', tasksFound);
    } catch (error) {
        console.error("Error loading operator pending tasks:", error);
        uiElements.operatorOrderListContainer.innerHTML = '<p style="color:red; text-align:center;">เกิดข้อผิดพลาดในการโหลดรายการ</p>';
        showAppStatus("เกิดข้อผิดพลาดในการโหลดรายการ: " + error.message, "error", uiElements.appStatus);
    }
}

async function deleteOrder(orderKey) {
    if (!confirm('ต้องการลบออเดอร์นี้หรือไม่?')) return;
    try {
        await remove(ref(database, 'orders/' + orderKey));
        showAppStatus('ลบออเดอร์เรียบร้อย', 'success', uiElements.appStatus);
        loadOperatorPendingTasks();
    } catch (err) {
        console.error('Delete order error', err);
        showAppStatus('เกิดข้อผิดพลาดในการลบ: ' + err.message, 'error', uiElements.appStatus);
    }
}

function handleOrderSelectChange(e) {
    const key = e.target.dataset.orderkey;
    if (!key) return;
    if (e.target.checked) {
        selectedOrdersForPick.add(key);
    } else {
        selectedOrdersForPick.delete(key);
    }
    updatePickListSummary();
}

function selectAllPendingOrders() {
    if (!uiElements.operatorOrderListContainer) return;
    uiElements.operatorOrderListContainer.querySelectorAll('input[type="checkbox"][data-orderkey]').forEach(cb => {
        if (!cb.checked) {
            cb.checked = true;
            selectedOrdersForPick.add(cb.dataset.orderkey);
        }
    });
    updatePickListSummary();
}

function updatePickListSummary() {
    if (!uiElements.pickListSummaryContainer || !uiElements.pickListSummaryTableBody) return;
    const totals = {};
    selectedOrdersForPick.forEach(key => {
        const order = orderDataMap[key];
        if (order && order.items) {
            Object.values(order.items).forEach(item => {
                const name = item.productName || 'N/A';
                if (!totals[name]) totals[name] = { qty: 0, unit: item.unit || '' };
                totals[name].qty += Number(item.quantity) || 0;
            });
        }
    });
    const names = Object.keys(totals).sort((a,b) => a.localeCompare(b));
    uiElements.pickListSummaryTableBody.innerHTML = '';
    names.forEach(name => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${name}</td><td>${totals[name].qty}</td><td>${totals[name].unit}</td>`;
        uiElements.pickListSummaryTableBody.appendChild(tr);
    });
    if (names.length > 0) {
        uiElements.pickListSummaryContainer.classList.remove('hidden');
    } else {
        uiElements.pickListSummaryContainer.classList.add('hidden');
    }
}

function startScanForPacking() {
    if (!uiElements.qrScanner_OperatorTask_div) { showToast('QR Scanner element not found!', 'error'); return; }

    uiElements.qrScannerContainer_OperatorTask.classList.remove('hidden');
    uiElements.stopScanForPackingButton.classList.remove('hidden');
    uiElements.startScanForPackingButton.disabled = true;

    if (!html5QrScannerForPacking) {
        html5QrScannerForPacking = new Html5Qrcode(uiElements.qrScanner_OperatorTask_div.id, false);
    }
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            let cam = cameras.find(c => /back|rear|environment/i.test(c.label));
            if (!cam) cam = cameras[cameras.length - 1];
            const camId = cam.id;
            html5QrScannerForPacking.start(
                { deviceId: { exact: camId } },
                { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { focusMode: "continuous", facingMode: "environment" } },
                onPackingScanSuccess,
                () => { beepError(); }
            ).catch(err => {
                beepError();
                showToast('ไม่สามารถเปิดกล้องสแกน QR ได้: ' + (err?.message || err), 'error');
                uiElements.qrScannerContainer_OperatorTask.classList.add('hidden');
                uiElements.stopScanForPackingButton.classList.add('hidden');
                uiElements.startScanForPackingButton.disabled = false;
            });
        } else {
            beepError();
            showToast('ไม่พบกล้องบนอุปกรณ์', 'error');
            uiElements.qrScannerContainer_OperatorTask.classList.add('hidden');
            uiElements.stopScanForPackingButton.classList.add('hidden');
            uiElements.startScanForPackingButton.disabled = false;
        }
    }).catch(err => {
        beepError();
        showToast('ไม่สามารถเข้าถึงกล้อง: ' + (err?.message || err), 'error');
        uiElements.qrScannerContainer_OperatorTask.classList.add('hidden');
        uiElements.stopScanForPackingButton.classList.add('hidden');
        uiElements.startScanForPackingButton.disabled = false;
    });
}

async function stopScanForPacking() {
    if (isPackingScannerStopping) return;
    isPackingScannerStopping = true;
    if (html5QrScannerForPacking) {
        try {
            if (html5QrScannerForPacking.isScanning) {
                await html5QrScannerForPacking.stop();
            }
            await html5QrScannerForPacking.clear();
        } catch (e) {
            console.warn('Error stopping packing scanner:', e);
        }
        html5QrScannerForPacking = null;
    }
    uiElements.qrScannerContainer_OperatorTask.classList.add('hidden');
    uiElements.stopScanForPackingButton.classList.add('hidden');
    uiElements.startScanForPackingButton.disabled = false;
    isPackingScannerStopping = false;
}

window.stopScanForPacking = stopScanForPacking;

async function onPackingScanSuccess(decodedText) {
    if (isProcessingPackingScan) return;
    isProcessingPackingScan = true;
    const code = decodedText.trim();
    const ordersRef = ref(database, 'orders');
    const ordersQuery = query(ordersRef, orderByChild('packageCode'), equalTo(code));
    const snapshot = await get(ordersQuery);

    let orderKeyFound = null;
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            if (child.val().status === 'Ready to Pack') {
                orderKeyFound = child.key;
            }
        });
    }

    if (orderKeyFound) {
        beepSuccess();
        await stopScanForPacking();
        if (typeof window.loadOrderForPacking === 'function') {
            window.loadOrderForPacking(orderKeyFound);
        }
    } else {
        showAppStatus('ไม่พบออเดอร์พร้อมแพ็กสำหรับรหัสพัสดุ: ' + code, 'error', uiElements.appStatus);
    }
    isProcessingPackingScan = false;
}
