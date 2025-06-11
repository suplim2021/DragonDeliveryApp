// js/shippedOrdersPage.js
import { database } from './config.js';
import { ref, query, orderByChild, equalTo, get, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showPage } from './ui.js';
import { showAppStatus, formatDateTimeDDMMYYYYHHMM } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentDetailOrderKey = null;

export function initializeShippedOrdersPageListeners() {
    const refreshBtn = document.getElementById('refreshShippedOrders');
    if (refreshBtn) refreshBtn.addEventListener('click', loadShippedOrders);

    const backBtn = document.getElementById('backToShippedListButton');
    if (backBtn) backBtn.addEventListener('click', () => showPage('shippedOrdersPage'));

    const confirmBtn = document.getElementById('confirmShipmentButton');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmShipmentAdmin);

    const confirmSelectedBtn = document.getElementById('confirmSelectedShipmentsButton');
    if (confirmSelectedBtn) confirmSelectedBtn.addEventListener('click', confirmSelectedShipments);
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
        listContainer.innerHTML = '';
        const batchMap = {};
        const statuses = ['Shipped', 'Shipment Approved'];
        for (const status of statuses) {
            const q = query(ref(database, 'orders'), orderByChild('status'), equalTo(status));
            const snap = await get(q);
            if (snap.exists()) {
                snap.forEach(child => {
                    const data = child.val();
                    const batchId = data.shipmentInfo?.batchId || 'NO_BATCH';
                    if (!batchMap[batchId]) batchMap[batchId] = { orders: [], batchId };
                    batchMap[batchId].orders.push({ key: child.key, data });
                });
            }
        }

        // Fetch batch details
        await Promise.all(Object.keys(batchMap).filter(id => id !== 'NO_BATCH').map(async id => {
            const bsnap = await get(ref(database, `shipmentBatches/${id}`));
            if (bsnap.exists()) {
                const bdata = bsnap.val();
                batchMap[id].courierShop = bdata.courierShop || '';
                batchMap[id].groupPhotoUrl = bdata.groupPhotoUrl || '';
                batchMap[id].shippedAt = bdata.shippedAt_actual || bdata.createdAt || null;
            }
        }));

        const role = getCurrentUserRole();
        const batchArr = Object.values(batchMap).sort((a, b) => (b.shippedAt || 0) - (a.shippedAt || 0));
        let totalCount = 0;
        let pendingCount = 0;
        batchArr.forEach(batch => {
            totalCount += batch.orders.length;
            const div = document.createElement('div');
            const complete = batch.orders.every(o => o.data.status === 'Shipment Approved');
            div.className = 'batch-item' + (complete ? ' complete' : '');

            let heading = '';
            if (batch.courierShop) heading += batch.courierShop;
            if (batch.shippedAt) heading += (heading ? ' - ' : '') + formatDateTimeDDMMYYYYHHMM(batch.shippedAt);
            if (!heading) heading = 'การส่ง';
            let html = `<h3 class="batch-heading">${heading}</h3><div class="batch-details hidden">`;
            if (role === 'administrator') {
                html += `<p style="font-size:0.9em;margin:2px 0;"><strong>Batch ID:</strong> ${batch.batchId}</p>`;
            }
            if (batch.groupPhotoUrl) {
                const photoId = `batch_photo_${batch.batchId}`;
                html += `<button type="button" class="toggle-batch-photo-btn" data-target="${photoId}" style="width:auto;margin:5px 0;">ดูรูปการส่ง</button>`;
                html += `<img id="${photoId}" src="${batch.groupPhotoUrl}" class="batch-photo lightbox-thumb hidden" alt="Batch Photo" />`;
            }
            html += `<button type="button" class="select-all-batch secondary" style="width:auto;margin:5px 0;" data-batch="${batch.batchId}">เลือกทั้งหมด</button>`;
            html += '<ul class="batch-order-list" style="list-style-type:none;padding-left:0;">';
            batch.orders.forEach(o => {
                if (!o.data.shipmentInfo?.adminVerifiedBy) pendingCount++;
                const checked = o.data.shipmentInfo?.adminVerifiedBy ? 'disabled checked' : '';
                const cb = `<input type="checkbox" class="admin-verify-checkbox" data-orderkey="${o.key}" ${checked}>`;
                const detailBtn = `<button type="button" class="shipped-detail-btn" data-orderkey="${o.key}" style="width:auto;padding:4px 8px;font-size:0.8em;margin-left:5px;">ดูรายละเอียด</button>`;
                html += `<li style="border-bottom:1px solid #eee;padding:5px 0;">${cb} ${o.data.packageCode || o.key} (${o.data.platform || 'N/A'}) ${detailBtn}</li>`;
            });
            html += '</ul></div>';
            div.innerHTML = html;
            listContainer.appendChild(div);
            const toggleBtn = div.querySelector('.toggle-batch-photo-btn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const img = div.querySelector(`#${toggleBtn.dataset.target}`);
                    if (img) img.classList.toggle('hidden');
                });
            }
            const headingEl = div.querySelector('.batch-heading');
            const detailDiv = div.querySelector('.batch-details');
            if (headingEl && detailDiv) {
                headingEl.addEventListener('click', () => { detailDiv.classList.toggle('hidden'); });
            }
            const selectAllBtn = div.querySelector('.select-all-batch');
            if (selectAllBtn) {
                selectAllBtn.addEventListener('click', () => {
                    div.querySelectorAll('.admin-verify-checkbox:not(:disabled)').forEach(cb => { cb.checked = true; });
                });
            }
        });

        if (totalCount === 0) {
            noMsg.classList.remove('hidden');
            showAppStatus('ไม่พบพัสดุที่ส่งแล้ว', 'info', appStatus);
        } else {
            showAppStatus(`พบ ${totalCount} รายการที่ส่งแล้ว`, 'success', appStatus);
        }

        listContainer.querySelectorAll('.shipped-detail-btn').forEach(btn => {
            btn.addEventListener('click', e => loadShippedOrderDetail(e.target.dataset.orderkey));
        });

        if (typeof window.setNavBadgeCount === 'function') {
            window.setNavBadgeCount('shippedOrdersPage', pendingCount);
        }
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
        const photoImg = document.getElementById('shippedOrderBatchPhoto');
        if (photoImg) { photoImg.classList.add('hidden'); photoImg.src = '#'; }
        if (snap.exists()) {
            const data = snap.val();
            packageSpan.textContent = data.packageCode || orderKey;
            let courier = '-';
            let groupPhotoUrl = '';
            if (data.shipmentInfo?.batchId) {
                const bsnap = await get(ref(database, `shipmentBatches/${data.shipmentInfo.batchId}`));
                if (bsnap.exists()) {
                    const bdata = bsnap.val();
                    courier = bdata.courierShop || '-';
                    groupPhotoUrl = bdata.groupPhotoUrl || '';
                    if (photoImg && groupPhotoUrl) { photoImg.src = groupPhotoUrl; photoImg.classList.remove('hidden'); }
                }
            }
            const role = getCurrentUserRole();
            let html = `
                <p><strong>Platform:</strong> ${data.platform || 'N/A'}</p>
                <p><strong>ส่งจริงเมื่อ:</strong> ${data.shipmentInfo?.shippedAt_actual ? formatDateTimeDDMMYYYYHHMM(data.shipmentInfo.shippedAt_actual) : '-'}</p>
            `;
            if (role === 'administrator') {
                html += `<p><strong>Batch ID:</strong> ${data.shipmentInfo?.batchId || '-'}</p>`;
            }
            html += `
                <p><strong>Courier:</strong> ${courier}</p>
                <p><strong>ยืนยันโดยผู้ดูแล:</strong> ${data.shipmentInfo?.adminVerifiedBy ? '✓' : 'ยังไม่ได้ยืนยัน'}</p>
            `;
            infoDiv.innerHTML = html;
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
    updates[`/orders/${currentDetailOrderKey}/status`] = 'Shipment Approved';
    try {
        await update(ref(database), updates);
        showAppStatus('ยืนยันแล้ว', 'success', appStatus);
        await loadShippedOrders();
        showPage('shippedOrdersPage');
        if (typeof window.loadDashboardDataGlobal === 'function') {
            const df = document.getElementById('dashboardDateFilter');
            const ds = document.getElementById('dateFilterStart');
            const de = document.getElementById('dateFilterEnd');
            window.loadDashboardDataGlobal('all', '', df ? df.value : 'today', ds ? ds.value : null, de ? de.value : null);
        }
    } catch (err) {
        console.error('confirmShipmentAdmin error', err);
        showAppStatus('เกิดข้อผิดพลาดในการยืนยัน', 'error', appStatus);
    }
}

async function confirmSelectedShipments() {
    const user = getCurrentUser();
    const appStatus = document.getElementById('appStatus');
    const listContainer = document.getElementById('shippedOrdersListContainer');
    if (!user || !listContainer || !appStatus) return;
    const checked = listContainer.querySelectorAll('.admin-verify-checkbox:checked');
    if (checked.length === 0) {
        showAppStatus('กรุณาเลือกอย่างน้อย 1 รายการ', 'info', appStatus);
        return;
    }
    const updates = {};
    checked.forEach(cb => {
        const key = cb.dataset.orderkey;
        updates[`/orders/${key}/shipmentInfo/adminVerifiedBy`] = user.uid;
        updates[`/orders/${key}/shipmentInfo/adminVerifiedAt`] = serverTimestamp();
        updates[`/orders/${key}/status`] = 'Shipment Approved';
    });
    try {
        await update(ref(database), updates);
        showAppStatus('ยืนยันหลายรายการเรียบร้อย', 'success', appStatus);
        await loadShippedOrders();
        showPage('shippedOrdersPage');
        if (typeof window.loadDashboardDataGlobal === 'function') {
            const df = document.getElementById('dashboardDateFilter');
            const ds = document.getElementById('dateFilterStart');
            const de = document.getElementById('dateFilterEnd');
            window.loadDashboardDataGlobal('all', '', df ? df.value : 'today', ds ? ds.value : null, de ? de.value : null);
        }
    } catch (err) {
        console.error('confirmSelectedShipments error', err);
        showAppStatus('เกิดข้อผิดพลาดในการยืนยัน', 'error', appStatus);
    }
}
