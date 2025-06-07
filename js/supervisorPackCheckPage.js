// js/supervisorPackCheckPage.js
import { showPage } from './ui.js';
import { database, auth } from './config.js'; // Assuming auth might be needed for supervisor UID
import { ref, get, query, orderByChild, equalTo, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js'; 

let currentOrderKeyForSupervisorCheck = null; // Stores the key of the order being checked

export function initializeSupervisorPackCheckListeners() {
    if (uiElements.approvePackButton) {
        uiElements.approvePackButton.addEventListener('click', () => handleSupervisorPackAction(true));
    } else {
        console.warn("Approve Pack Button not found for supervisor.");
    }

    if (uiElements.rejectPackButton) {
        uiElements.rejectPackButton.addEventListener('click', () => handleSupervisorPackAction(false));
    } else {
        console.warn("Reject Pack Button not found for supervisor.");
    }
    
    // Listener for refresh button on the supervisor's list page
    if (uiElements.refreshSupervisorPackCheckList) {
        uiElements.refreshSupervisorPackCheckList.addEventListener('click', loadOrdersForPackCheck);
    }
}

export async function loadOrdersForPackCheck() {
    const currentUserRole = getCurrentUserRole();
    // Allow admin to also view this page, but actions might be restricted or have different logging
    if (currentUserRole !== 'supervisor' && currentUserRole !== 'administrator') {
        showAppStatus("คุณไม่มีสิทธิ์เข้าถึงหน้านี้", "error", uiElements.appStatus);
        showPage('dashboardPage'); // Or appropriate fallback
        return;
    }

    if (!uiElements.packCheckListContainer || !uiElements.noPackCheckOrdersMessage || !uiElements.appStatus) {
        console.error("Required DOM elements for supervisor pack check list are missing.");
        return;
    }

    showAppStatus("กำลังโหลดรายการรอตรวจสอบการแพ็ก...", "info", uiElements.appStatus);
    uiElements.packCheckListContainer.innerHTML = '<p style="text-align:center; padding:15px;">กำลังโหลด...</p>';
    uiElements.noPackCheckOrdersMessage.classList.add('hidden');

    try {
        const ordersRef = ref(database, 'orders');
        // Query for orders with status "Pending Supervisor Pack Check"
        const dataQuery = query(ordersRef, orderByChild('status'), equalTo('Pending Supervisor Pack Check'));
        const snapshot = await get(dataQuery);

        uiElements.packCheckListContainer.innerHTML = ''; // Clear loading message
        let tasksFound = 0;

        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                tasksFound++;
                const orderKey = childSnapshot.key;
                const orderData = childSnapshot.val();
                
                const orderItemDiv = document.createElement('div');
                orderItemDiv.className = 'order-item'; // Use existing class or create new
                orderItemDiv.style.marginBottom = '10px';
                orderItemDiv.style.padding = '10px';
                orderItemDiv.style.border = '1px solid #eee';
                orderItemDiv.style.borderRadius = '8px';

                // Display some key information about the order
                orderItemDiv.innerHTML = `
                    <h4 style="margin-top:0; margin-bottom:8px;">Package Code: ${orderData.packageCode || 'N/A'}</h4>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>Platform:</strong> ${orderData.platform || 'N/A'}</p>
                    <p style="font-size:0.9em; margin:3px 0;"><strong>Packed by (Operator UID):</strong> ${orderData.packingInfo?.packedBy_operatorUid?.substring(0,8) || 'N/A'}...</p>
                    <button type="button" class="supervisor-check-btn" data-orderkey="${orderKey}" style="width:auto; padding:8px 15px; margin-top:10px; font-size:0.9em;">ตรวจสอบรายการนี้</button>
                `;
                uiElements.packCheckListContainer.appendChild(orderItemDiv);
            });

            if (tasksFound === 0) {
                uiElements.noPackCheckOrdersMessage.classList.remove('hidden');
                showAppStatus("ไม่พบออเดอร์ที่รอตรวจสอบการแพ็ก", "info", uiElements.appStatus);
            } else {
                 showAppStatus(`พบ ${tasksFound} ออเดอร์รอตรวจสอบการแพ็ก`, "success", uiElements.appStatus);
            }

            // Add event listeners to the "ตรวจสอบรายการนี้" buttons
            uiElements.packCheckListContainer.querySelectorAll('.supervisor-check-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const orderKeyToLoad = e.target.dataset.orderkey;
                    console.log(`Supervisor wants to check order: ${orderKeyToLoad}`);
                    loadIndividualOrderForSupervisorCheck(orderKeyToLoad);
                });
            });

        } else {
            uiElements.noPackCheckOrdersMessage.classList.remove('hidden');
            showAppStatus("ไม่พบออเดอร์ที่รอตรวจสอบการแพ็กในขณะนี้", "info", uiElements.appStatus);
        }
        if (typeof window.setNavBadgeCount === 'function') window.setNavBadgeCount('supervisorPackCheckListPage', tasksFound);
    } catch (error) {
        console.error("Error loading orders for supervisor pack check:", error);
        uiElements.packCheckListContainer.innerHTML = '<p style="color:red; text-align:center;">เกิดข้อผิดพลาดในการโหลดรายการ</p>';
        showAppStatus("เกิดข้อผิดพลาดในการโหลดรายการ: " + error.message, "error", uiElements.appStatus);
    }
}

async function loadIndividualOrderForSupervisorCheck(orderKey) {
    currentOrderKeyForSupervisorCheck = orderKey; // Store the key for approve/reject actions
    showAppStatus(`กำลังโหลดรายละเอียดพัสดุสำหรับการตรวจสอบ...`, "info", uiElements.appStatus);

    // Ensure all relevant DOM elements for the individual check page are available
    if (!uiElements.checkOrderPackageCodeDisplay || !uiElements.checkOrderPlatformDisplay ||
        !uiElements.checkOrderItemListDisplay || !uiElements.checkOrderPackingPhotoDisplay ||
        !uiElements.checkOrderOperatorNotesDisplay || !uiElements.supervisorPackCheckNotes ||
        !uiElements.approvePackButton || !uiElements.rejectPackButton) {
        console.error("One or more DOM elements for supervisor individual check page are missing.");
        showAppStatus("เกิดข้อผิดพลาด: UI สำหรับหน้าตรวจสอบไม่สมบูรณ์", "error", uiElements.appStatus);
        return;
    }
    
    const orderRef = ref(database, `orders/${orderKey}`);
    try {
        const snapshot = await get(orderRef);
        if (snapshot.exists()) {
            const orderData = snapshot.val();
            
            uiElements.checkOrderPackageCodeDisplay.textContent = orderData.packageCode || 'N/A';
            uiElements.checkOrderPlatformDisplay.textContent = orderData.platform || 'N/A';
            
            uiElements.checkOrderItemListDisplay.innerHTML = ''; // Clear previous items
            if(orderData.items){
                for(const itemId in orderData.items){
                    const item = orderData.items[itemId];
                    const li = document.createElement('li');
                    li.textContent = `${item.productName} - ${item.quantity} ${item.unit}`;
                    uiElements.checkOrderItemListDisplay.appendChild(li);
                }
            }

            uiElements.checkOrderPackingPhotoDisplay.src = orderData.packingInfo?.packingPhotoUrl || '#';
            uiElements.checkOrderPackingPhotoDisplay.alt = orderData.packingInfo?.packingPhotoUrl ? 'รูปภาพการแพ็กจาก Operator' : 'ไม่มีรูปภาพการแพ็ก';
            uiElements.checkOrderOperatorNotesDisplay.textContent = orderData.packingInfo?.operatorNotes || 'ไม่มีหมายเหตุจาก Operator';
            
            uiElements.supervisorPackCheckNotes.value = ''; // Clear supervisor's previous notes for this new check

            showPage('supervisorIndividualPackCheckPage'); // Show the page with details
            showAppStatus('แสดงรายละเอียดพัสดุสำหรับการตรวจสอบ', 'success', uiElements.appStatus);
        } else {
            showAppStatus('ไม่พบข้อมูลพัสดุนี้', 'error', uiElements.appStatus);
            showPage('supervisorPackCheckListPage'); // Go back to the list if order not found
        }
    } catch (error) {
        console.error("Error loading individual order for supervisor check:", error);
        showAppStatus("เกิดข้อผิดพลาดในการโหลดรายละเอียดพัสดุ: " + error.message, 'error', uiElements.appStatus);
    }
}

async function handleSupervisorPackAction(isApproved) {
    if (!currentOrderKeyForSupervisorCheck) {
        showAppStatus("ไม่ได้เลือกพัสดุที่จะดำเนินการตรวจสอบ", 'error', uiElements.appStatus);
        return;
    }
    const currentUser = getCurrentUser(); // From auth.js
    if (!currentUser) {
        showAppStatus("ไม่พบข้อมูลผู้ใช้ปัจจุบัน (Supervisor)", "error", uiElements.appStatus);
        return;
    }

    const supervisorNotesText = uiElements.supervisorPackCheckNotes.value.trim();
    const newStatus = isApproved ? "Ready for Shipment" : "Pack Rejected";

    const supervisorCheckData = {
        checkedBy_supervisorUid: currentUser.uid,
        checkedAt: serverTimestamp(),
        isApproved: isApproved,
        supervisorNotes: supervisorNotesText || null // Store null if notes are empty
    };

    // Prepare multi-location updates
    const updates = {};
    updates[`/orders/${currentOrderKeyForSupervisorCheck}/supervisorPackCheck`] = supervisorCheckData;
    updates[`/orders/${currentOrderKeyForSupervisorCheck}/status`] = newStatus;
    updates[`/orders/${currentOrderKeyForSupervisorCheck}/lastUpdatedAt`] = serverTimestamp();

    const actionText = isApproved ? 'อนุมัติ' : 'ปฏิเสธ';
    showAppStatus(`กำลัง${actionText}การแพ็ก...`, 'info', uiElements.appStatus);
    uiElements.approvePackButton.disabled = true;
    uiElements.rejectPackButton.disabled = true;

    try {
        await update(ref(database), updates); // Perform the multi-location update
        showAppStatus(`การแพ็กได้ถูก${actionText}แล้ว`, 'success', uiElements.appStatus);
        
        currentOrderKeyForSupervisorCheck = null; // Reset current order key
        showPage('supervisorPackCheckListPage'); // Navigate back to the list
        loadOrdersForPackCheck(); // Refresh the list on the previous page
    } catch (error) {
        console.error(`Error during supervisor pack ${actionText} action:`, error);
        showAppStatus(`เกิดข้อผิดพลาดในการ${actionText}การแพ็ก: ${error.message}`, "error", uiElements.appStatus);
    } finally {
        if(uiElements.approvePackButton) uiElements.approvePackButton.disabled = false;
        if(uiElements.rejectPackButton) uiElements.rejectPackButton.disabled = false;
    }
}