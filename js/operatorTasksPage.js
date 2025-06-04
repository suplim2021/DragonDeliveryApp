// js/operatorTasksPage.js
import { showPage } from './ui.js'; // showPage for navigation
import { database } from './config.js';        // Firebase database service
import { ref, query, orderByChild, equalTo, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showAppStatus } from './utils.js';
import { getCurrentUserRole } from './auth.js';


export function initializeOperatorTasksPageListeners() {
    if (uiElements.refreshOperatorTaskList) {
        uiElements.refreshOperatorTaskList.addEventListener('click', loadOperatorPendingTasks);
    } else {
        console.warn("Refresh button for Operator Task List not found.");
    }
    // Add other listeners if needed for this page (e.g., sorting, filtering within the list)
}

export async function loadOperatorPendingTasks() {
    const currentUserRole = getCurrentUserRole();
    // Allow admin to also view this page
    if (currentUserRole !== 'operator' && currentUserRole !== 'administrator') {
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

        if (snapshot.exists()) {
            let tasksFound = 0;
            snapshot.forEach(childSnapshot => {
                tasksFound++;
                const orderKey = childSnapshot.key;
                const orderData = childSnapshot.val();
                
                const orderItemDiv = document.createElement('div');
                orderItemDiv.className = 'order-item'; // You can style this class
                orderItemDiv.style.marginBottom = '10px';
                orderItemDiv.style.padding = '10px';
                orderItemDiv.style.border = '1px solid #eee';
                orderItemDiv.style.borderRadius = '8px';

                orderItemDiv.innerHTML = `
                    <h4 style="margin-top:0; margin-bottom:8px;">Order Key: ${orderKey.length > 20 ? orderKey.substring(0,17)+'...' : orderKey}</h4>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>Platform:</strong> ${orderData.platform || 'N/A'}</p>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>Package Code:</strong> ${orderData.packageCode || 'N/A'}</p>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>Due Date:</strong> ${orderData.dueDate ? new Date(orderData.dueDate).toLocaleDateString('th-TH') : 'N/A'}</p>
                    <button type="button" class="start-packing-btn" data-orderkey="${orderKey}" style="width:auto; padding:8px 15px; margin-top:10px; font-size:0.9em;">เริ่มแพ็กรายการนี้</button>
                `;
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
                        alert("เกิดข้อผิดพลาด: ไม่สามารถโหลดรายละเอียดออเดอร์ได้");
                    }
                });
            });

        } else {
            uiElements.noOperatorTasksMessage.classList.remove('hidden');
            showAppStatus("ไม่พบออเดอร์ที่รอแพ็กในขณะนี้", "info", uiElements.appStatus);
        }
    } catch (error) {
        console.error("Error loading operator pending tasks:", error);
        uiElements.operatorOrderListContainer.innerHTML = '<p style="color:red; text-align:center;">เกิดข้อผิดพลาดในการโหลดรายการ</p>';
        showAppStatus("เกิดข้อผิดพลาดในการโหลดรายการ: " + error.message, "error", uiElements.appStatus);
    }
}