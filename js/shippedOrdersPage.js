// js/shippedOrdersPage.js
import { database } from './config.js';
import { ref, query, orderByChild, equalTo, get, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showPage } from './ui.js';
import { showAppStatus, formatDateDDMMYYYY, formatDateTimeDDMMYYYYHHMM } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentDetailOrderKey = null;

export function initializeShippedOrdersPageListeners() {
    const refreshBtn = document.getElementById('refreshShippedOrders');
    if (refreshBtn) refreshBtn.addEventListener('click', loadShippedOrders);

    const backBtn = document.getElementById('backToShippedListButton');
    if (backBtn) backBtn.addEventListener('click', () => showPage('shippedOrdersPage'));

    const confirmBtn = document.getElementById('confirmShipmentButton');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmShipmentAdmin);
}

export async function loadShippedOrders() {
    const listContainer = document.getElementById('shippedOrdersListContainer');
    const noMsg = document.getElementById('noShippedOrdersMessage');
    const appStatus = document.getElementById('appStatus');
    if (!listContainer || !noMsg || !appStatus) return;

    showAppStatus('กำลังโหลดรายการที่ส่งแล้ว...', 'info', appStatus);
    listContainer.innerHTML = '<p style="text-align:center; padding:15px;">กำลังโหลด...</p>';
    noMsg.classList.add('hidden');

    try {
        const q = query(ref(database, 'orders'), orderByChild('status'), equalTo('Shipped'));
        const snap = await get(q);
        listContainer.innerHTML = '';
        let count = 0;
        if (snap.exists()) {
            snap.forEach(child => {
                count++;
                const data = child.val();
                const div = document.createElement('div');
                div.className = 'order-item';
                div.style.marginBottom = '10px';
                div.style.padding = '10px';
                div.style.border = '1px solid #eee';
                div.style.borderRadius = '8px';
                div.innerHTML = `
                    <h4 style="margin-top:0;margin-bottom:8px;">Package Code: ${data.packageCode || 'N/A'}</h4>
                    <p style="font-size:0.9em;margin:3px 0;"><strong>Platform:</strong> ${data.platform || 'N/A'}</p>
                    <button type="button" class="shipped-detail-btn" data-orderkey="${child.key}" style="width:auto;padding:8px 15px;margin-top:10px;font-size:0.9em;">ดูรายละเอียด</button>`;
                listContainer.appendChild(div);
            });
        }
        if (count === 0) {
            noMsg.classList.remove('hidden');
            showAppStatus('ไม่พบพัสดุที่ส่งแล้ว', 'info', appStatus);
        } else {
            showAppStatus(`พบ ${count} รายการที่ส่งแล้ว`, 'success', appStatus);
        }

        listContainer.querySelectorAll('.shipped-detail-btn').forEach(btn => {
            btn.addEventListener('click', e => loadShippedOrderDetail(e.target.dataset.orderkey));
        });
    } catch (err) {
        console.error('loadShippedOrders error', err);
        listContainer.innerHTML = '<p style="color:red;text-align:center;">เกิดข้อผิดพลาด</p>';
        showAppStatus('เกิดข้อผิดพลาดในการโหลดรายการ', 'error', appStatus);
    }
}

async function loadShippedOrderDetail(orderKey) {
    currentDetailOrderKey = orderKey;
    const appStatus = document.getElementById('appStatus');
    const infoDiv = document.getElementById('shippedOrderDetailInfo');
    const packageSpan = document.getElementById('detailPackageCode');
    const confirmBtn = document.getElementById('confirmShipmentButton');
    if (!infoDiv || !packageSpan || !appStatus) return;

    showAppStatus('กำลังโหลดรายละเอียด...', 'info', appStatus);
    try {
        const snap = await get(ref(database, 'orders/' + orderKey));
        if (snap.exists()) {
            const data = snap.val();
            packageSpan.textContent = data.packageCode || orderKey;
            infoDiv.innerHTML = `
                <p><strong>Platform:</strong> ${data.platform || 'N/A'}</p>
                <p><strong>ส่งจริงเมื่อ:</strong> ${data.shipmentInfo?.shippedAt_actual ? formatDateTimeDDMMYYYYHHMM(data.shipmentInfo.shippedAt_actual) : '-'}</p>
                <p><strong>Batch ID:</strong> ${data.shipmentInfo?.batchId || '-'}</p>
                <p><strong>ยืนยันโดยผู้ดูแล:</strong> ${data.shipmentInfo?.adminVerifiedBy ? '✓' : 'ยังไม่ได้ยืนยัน'}</p>
            `;
            const role = getCurrentUserRole();
            if (role === 'administrator' || role === 'supervisor') {
                confirmBtn.classList.remove('hidden');
            } else {
                confirmBtn.classList.add('hidden');
            }
            showPage('shippedOrderDetailPage');
            showAppStatus('โหลดรายละเอียดแล้ว', 'success', appStatus);
        } else {
            showAppStatus('ไม่พบข้อมูลพัสดุ', 'error', appStatus);
        }
    } catch (err) {
        console.error('loadShippedOrderDetail error', err);
        showAppStatus('เกิดข้อผิดพลาดในการโหลดรายละเอียด', 'error', appStatus);
    }
}

async function confirmShipmentAdmin() {
    const user = getCurrentUser();
    const appStatus = document.getElementById('appStatus');
    if (!user || !currentDetailOrderKey || !appStatus) return;
    const updates = {};
    updates[`/orders/${currentDetailOrderKey}/shipmentInfo/adminVerifiedBy`] = user.uid;
    updates[`/orders/${currentDetailOrderKey}/shipmentInfo/adminVerifiedAt`] = serverTimestamp();
    try {
        await update(ref(database), updates);
        showAppStatus('ยืนยันแล้ว', 'success', appStatus);
        loadShippedOrderDetail(currentDetailOrderKey);
    } catch (err) {
        console.error('confirmShipmentAdmin error', err);
        showAppStatus('เกิดข้อผิดพลาดในการยืนยัน', 'error', appStatus);
    }
}
