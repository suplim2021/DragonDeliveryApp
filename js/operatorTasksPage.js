// js/operatorTasksPage.js
import { showPage, uiElements } from './ui.js'; // uiElements for DOM, showPage for navigation
import { database } from './config.js';        // Firebase database service
import { ref, query, orderByChild, equalTo, get, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showAppStatus, showToast, formatDateDDMMYYYY, beepSuccess, beepError } from './utils.js';
import { getCurrentUserRole } from './auth.js';

let taskScanStartBtn, taskScanStopBtn, taskScanContainer, taskScanDiv;
let html5QrScannerForTask = null;

export function initializeOperatorTasksPageListeners() {
    if (uiElements.refreshOperatorTaskList) {
        uiElements.refreshOperatorTaskList.addEventListener('click', loadOperatorPendingTasks);
    } else {
        console.warn("Refresh button for Operator Task List not found.");
    }
    // QR scan elements
    taskScanStartBtn = document.getElementById('startScanForTaskButton');
    taskScanStopBtn = document.getElementById('stopScanForTaskButton');
    taskScanContainer = document.getElementById('qrScannerContainer_OperatorTask');
    taskScanDiv = document.getElementById('qrScanner_OperatorTask');
    if (taskScanStartBtn && taskScanStopBtn && taskScanContainer && taskScanDiv) {
        taskScanStartBtn.addEventListener('click', startScanForTask);
        taskScanStopBtn.addEventListener('click', stopScanForTask);
    } else {
        console.warn('QR scan elements for operator task list not found.');
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

        const tasksArray = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                tasksArray.push({ key: childSnapshot.key, data: childSnapshot.val() });
            });
            tasksArray.sort((a, b) => {
                const dueA = a.data.dueDate || 0;
                const dueB = b.data.dueDate || 0;
                if (dueA !== dueB) return dueA - dueB;
                const createdA = a.data.createdAt || 0;
                const createdB = b.data.createdAt || 0;
                return createdA - createdB;
            });
            tasksFound = tasksArray.length;
            tasksArray.forEach(({ key: orderKey, data: orderData }) => {
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
                    <button type="button" class="start-packing-btn" data-orderkey="${orderKey}" style="width:auto; padding:8px 15px; margin-top:10px; font-size:0.9em;">เริ่มแพ็กรายการนี้</button>
                    ${editBtnHtml}
                    ${deleteBtnHtml}
                `;
                uiElements.operatorOrderListContainer.appendChild(orderItemDiv);
            });
        }

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

function startScanForTask() {
    if (!taskScanDiv || !taskScanContainer || !taskScanStartBtn || !taskScanStopBtn) return;
    taskScanContainer.classList.remove('hidden');
    taskScanStopBtn.classList.remove('hidden');
    taskScanStartBtn.disabled = true;
    if (!html5QrScannerForTask) {
        html5QrScannerForTask = new Html5Qrcode(taskScanDiv.id, false);
    }
    Html5Qrcode.getCameras().then(cams => {
        if (cams && cams.length) {
            const camId = cams[0].id;
            html5QrScannerForTask.start(
                { deviceId: { exact: camId } },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onTaskScanSuccess,
                () => { beepError(); }
            ).catch(err => {
                beepError();
                showToast('ไม่สามารถเปิดกล้องสแกน QR ได้: ' + (err?.message || err), 'error');
                stopScanForTask();
            });
        } else {
            beepError();
            showToast('ไม่พบกล้องบนอุปกรณ์', 'error');
            stopScanForTask();
        }
    }).catch(err => {
        beepError();
        showToast('ไม่สามารถเข้าถึงกล้อง: ' + (err?.message || err), 'error');
        stopScanForTask();
    });
}

async function stopScanForTask() {
    if (html5QrScannerForTask) {
        try {
            if (html5QrScannerForTask._isScanning) {
                await html5QrScannerForTask.stop();
            }
            await html5QrScannerForTask.clear();
        } catch (e) {
            console.warn('Error stopping task scanner:', e);
        }
        html5QrScannerForTask = null;
    }
    if (taskScanContainer) taskScanContainer.classList.add('hidden');
    if (taskScanStopBtn) taskScanStopBtn.classList.add('hidden');
    if (taskScanStartBtn) taskScanStartBtn.disabled = false;
}

async function onTaskScanSuccess(decodedText, decodedResult) {
    const code = decodedText.trim();
    const ordersRef = ref(database, 'orders');
    const q = query(ordersRef, orderByChild('packageCode'), equalTo(code));
    const snap = await get(q);
    let foundKey = null;
    if (snap.exists()) {
        snap.forEach(child => {
            if (!foundKey && child.val().status === 'Ready to Pack') {
                foundKey = child.key;
            }
        });
    }
    if (foundKey) {
        beepSuccess();
        stopScanForTask();
        if (typeof window.loadOrderForPacking === 'function') {
            window.loadOrderForPacking(foundKey);
        }
    } else {
        beepError();
        showAppStatus('ไม่พบออเดอร์ที่รอแพ็กสำหรับรหัสพัสดุ: ' + code, 'error', uiElements.appStatus);
    }
}

window.stopScanForTask = stopScanForTask;
