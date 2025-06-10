// js/dashboardPage.js
import { database } from './config.js';
import { ref, get, update, remove, serverTimestamp, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showAppStatus, showToast, formatDateDDMMYYYY, formatDateYYYYMMDD, formatDateTimeDDMMYYYYHHMM, translateStatusToThai } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';
import { showPage } from './ui.js';
// ไม่ต้อง import uiElements จาก ui.js แล้ว

let dailyChartInstance = null;
let platformChartInstance = null;
let dashboardUnsub = null;
let currentFilter = 'all';
let currentSearch = '';

// DOM Elements specific to dashboard - get them when the module initializes or functions are called
let el_appStatus, el_currentDateDisplay, el_refreshDashboardButton,
    el_summaryCardsContainer, el_dailyStatsCanvas, el_platformStatsCanvas,
    el_logFilterSelect, el_applyLogFilterButton, el_logSearchInput,
    el_ordersTableBody, el_noOrdersMessage,
    el_dueTodayTableBody, el_noDueTodayMessage;

export function initializeDashboardPageListeners() {
    // Query for elements specific to this page when listeners are set up
    el_appStatus = document.getElementById('appStatus');
    el_currentDateDisplay = document.getElementById('currentDateDisplay');
    el_refreshDashboardButton = document.getElementById('refreshDashboardButton');
    el_summaryCardsContainer = document.getElementById('summaryCardsContainer');
    el_dailyStatsCanvas = document.getElementById('dailyStatsChart');
    el_platformStatsCanvas = document.getElementById('platformStatsChart');
    el_logFilterSelect = document.getElementById('logFilterStatus');
    el_applyLogFilterButton = document.getElementById('applyLogFilterButton');
    el_logSearchInput = document.getElementById('logSearchPackageCode');
    el_ordersTableBody = document.getElementById('ordersTableBody');
    el_noOrdersMessage = document.getElementById('noOrdersMessage');
    el_dueTodayTableBody = document.getElementById("dueTodayTableBody");
    el_noDueTodayMessage = document.getElementById("noDueTodayMessage");

    if (el_refreshDashboardButton) {
        el_refreshDashboardButton.addEventListener('click', () => loadDashboardData(el_logFilterSelect ? el_logFilterSelect.value : 'all', el_logSearchInput ? el_logSearchInput.value.trim() : ''));
    }
    if (el_applyLogFilterButton) {
        el_applyLogFilterButton.addEventListener('click', () => {
            const filter = el_logFilterSelect ? el_logFilterSelect.value : 'all';
            const search = el_logSearchInput ? el_logSearchInput.value.trim() : '';
            loadDashboardData(filter, search);
        });
    }
    if (el_logFilterSelect) {
        el_logFilterSelect.addEventListener('change', () => {
            const filter = el_logFilterSelect.value;
            const search = el_logSearchInput ? el_logSearchInput.value.trim() : '';
            loadDashboardData(filter, search);
        });
    }
    if (el_ordersTableBody) {
        el_ordersTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-order-btn')) {
                const key = e.target.dataset.orderkey;
                if (key) handleEditOrder(key);
            } else if (e.target.classList.contains('delete-order-btn')) {
                const key = e.target.dataset.orderkey;
                if (key) handleDeleteOrder(key);
            }
        });
    }
    if (el_dueTodayTableBody) {
        el_dueTodayTableBody.addEventListener("click", (e) => {
            if (e.target.classList.contains("edit-order-btn")) {
                const key = e.target.dataset.orderkey;
                if (key) handleEditOrder(key);
            } else if (e.target.classList.contains("delete-order-btn")) {
                const key = e.target.dataset.orderkey;
                if (key) handleDeleteOrder(key);
            }
        });
    }
    console.log("Dashboard listeners initialized.");
}

export function startDashboardRealtime() {
    const ordersRefNode = ref(database, 'orders');
    if (dashboardUnsub) dashboardUnsub();
    dashboardUnsub = onValue(ordersRefNode, () => {
        loadDashboardData(currentFilter, currentSearch);
    });
}

export function stopDashboardRealtime() {
    if (dashboardUnsub) {
        dashboardUnsub();
        dashboardUnsub = null;
    }
}

export function updateCurrentDateOnDashboard() {
    if (el_currentDateDisplay) {
        const now = new Date();
        el_currentDateDisplay.textContent = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' });
    }
}

export async function loadDashboardData(filterStatus = 'all', searchCode = '') {
    currentFilter = filterStatus;
    currentSearch = searchCode;
    const currentUser = getCurrentUser();
    if (!currentUser) { console.log("No user logged in, skipping dashboard load."); return; }
    if (!el_appStatus) { console.error("el_appStatus (appStatus element) not found for dashboard."); return; }

    showAppStatus("กำลังโหลดข้อมูล Dashboard...", "info", el_appStatus);

    try {
        const ordersRefNode = ref(database, 'orders');
        const snapshot = await get(ordersRefNode);
        let allOrders = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                allOrders.push({ key: childSnapshot.key, ...childSnapshot.val() });
            });
            allOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            allOrders = allOrders.slice(0, 150);
        }

        updateSummaryCards(allOrders);
        updateDueTodayTable(allOrders);
        updateOrdersLogTable(allOrders, filterStatus, searchCode);
        renderCharts(allOrders);

        showAppStatus("โหลดข้อมูล Dashboard สำเร็จ", "success", el_appStatus);
        if (el_noOrdersMessage) {
            let displayOrders = filterStatus === 'all' ? allOrders : allOrders.filter(o => o.status === filterStatus);
            if (searchCode) {
                const scLower = searchCode.toLowerCase();
                displayOrders = displayOrders.filter(o => (o.packageCode || '').toLowerCase().includes(scLower));
            }
            el_noOrdersMessage.classList.toggle('hidden', displayOrders.length > 0);
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showAppStatus("เกิดข้อผิดพลาด: " + error.message, "error", el_appStatus);
        if (el_noOrdersMessage) el_noOrdersMessage.classList.remove('hidden');
    }
}

function updateSummaryCards(orders) {
    if (!el_summaryCardsContainer) return;
    el_summaryCardsContainer.innerHTML = '';
    const total = orders.length;
    const readyToPack = orders.filter(o => o.status === 'Ready to Pack').length;
    const pendingCheck = orders.filter(o => o.status === 'Pending Supervisor Pack Check').length;
    const readyToShip = orders.filter(o => (o.status === 'Ready for Shipment' || o.status === 'Pack Approved')).length;
    const shipped = orders.filter(o => (o.status === 'Shipped' || o.status === 'Shipment Approved') && !o.shipmentInfo?.adminVerifiedBy).length;
    const completed = orders.filter(o => (
        o.status === 'Shipment Approved' ||
        (o.status === 'Shipped' && o.shipmentInfo?.adminVerifiedBy)
    )).length;
    const shippedAwaitingVerify = shipped;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.createdAt && typeof o.createdAt === 'number' && new Date(o.createdAt).toISOString().slice(0, 10) === todayStr).length;

    createSummaryCard('พัสดุทั้งหมด', total, `+${todayOrders} วันนี้`, 'inventory_2');
    createSummaryCard('รายการรอแพ็ก', readyToPack, total > 0 ? `${Math.round((readyToPack/total)*100)}%` : '0%', 'list_alt', 'operatorTaskListPage');
    createSummaryCard('รอตรวจเช็ค', pendingCheck, total > 0 ? `${Math.round((pendingCheck/total)*100)}%` : '0%', 'fact_check', 'supervisorPackCheckListPage');
    createSummaryCard('เตรียมส่ง', readyToShip, total > 0 ? `${Math.round((readyToShip/total)*100)}%` : '0%', 'local_shipping', 'operatorShippingBatchPage');
    createSummaryCard('ส่งแล้ว', shipped, total > 0 ? `${Math.round((shipped/total)*100)}%` : '0%', 'check_circle', 'shippedOrdersPage');
    createSummaryCard('เสร็จสิ้น', completed, total > 0 ? `${Math.round((completed/total)*100)}%` : '0%', 'done_all');
    if (typeof window.setNavBadgeCount === 'function') {
        window.setNavBadgeCount('operatorTaskListPage', readyToPack);
        window.setNavBadgeCount('supervisorPackCheckListPage', pendingCheck);
        window.setNavBadgeCount('operatorShippingBatchPage', readyToShip);
        window.setNavBadgeCount('shippedOrdersPage', shippedAwaitingVerify);
    }
}

function createSummaryCard(title, value, subValue, icon, pageId = null) {
    if (!el_summaryCardsContainer) return;
    const card = document.createElement('div');
    card.className = 'summary-card';
    if (pageId) {
        card.classList.add('clickable');
        card.addEventListener('click', () => showPage(pageId));
    }
    card.innerHTML = `<div class="summary-card-icon material-icons">${icon}</div><h4 class="summary-card-value">${value}</h4><p class="summary-card-title">${title}</p><p class="summary-card-subvalue">${subValue}</p>`;
    el_summaryCardsContainer.appendChild(card);
}

function updateDueTodayTable(orders) {
    if (!el_dueTodayTableBody) return;
    el_dueTodayTableBody.innerHTML = '';
    const todayStr = formatDateYYYYMMDD(new Date());
    const dueToday = orders.filter(o => o.dueDate && formatDateYYYYMMDD(o.dueDate) === todayStr && !o.shipmentInfo?.adminVerifiedBy);
    if (dueToday.length === 0) {
        const r = el_dueTodayTableBody.insertRow();
        const c = r.insertCell();
        c.colSpan = 7;
        c.textContent = 'ไม่พบข้อมูล';
        c.style.textAlign = 'center';
        c.style.padding = '20px';
        if (el_noDueTodayMessage) el_noDueTodayMessage.classList.remove('hidden');
        return;
    }
    if (el_noDueTodayMessage) el_noDueTodayMessage.classList.add('hidden');
    const role = getCurrentUserRole();
    dueToday.forEach(o => {
        const r = el_dueTodayTableBody.insertRow();
        r.classList.add('due-today-row');
        r.dataset.orderkey = o.key;
        r.insertCell().textContent = o.packageCode || 'N/A';
        r.insertCell().textContent = o.platformOrderId || '-';
        r.insertCell().textContent = o.platform || 'N/A';
        r.insertCell().textContent = translateStatusToThai(o.status, !!o.shipmentInfo?.adminVerifiedBy);
        r.insertCell().textContent = formatDateTimeDDMMYYYYHHMM(o.createdAt);
        r.insertCell().textContent = formatDateDDMMYYYY(o.dueDate);
        const actCell = r.insertCell();
        if (role === 'administrator' || role === 'supervisor') {
            const btn = document.createElement('button');
            btn.textContent = 'แก้ไข';
            btn.className = 'edit-order-btn';
            btn.dataset.orderkey = o.key;
            actCell.appendChild(btn);
            const delBtn = document.createElement('button');
            delBtn.textContent = 'ลบ';
            delBtn.className = 'delete-order-btn';
            delBtn.dataset.orderkey = o.key;
            actCell.appendChild(delBtn);
        } else {
            actCell.textContent = '-';
        }
    });
}

function updateOrdersLogTable(orders, filterStatus = 'all', searchCode = '') {
    if (!el_ordersTableBody) return;
    el_ordersTableBody.innerHTML = '';
    let filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);
    if (searchCode) {
        const scLower = searchCode.toLowerCase();
        filtered = filtered.filter(o => (o.packageCode || '').toLowerCase().includes(scLower));
    }
    if (filtered.length === 0) {
        const r = el_ordersTableBody.insertRow(); const c = r.insertCell(); c.colSpan = 7; c.textContent = "ไม่พบข้อมูล"; c.style.textAlign = "center"; c.style.padding="20px"; return;
    }
    const role = getCurrentUserRole();
    filtered.forEach(o => {
        const r = el_ordersTableBody.insertRow();
        r.dataset.orderkey = o.key;
        r.dataset.duedate = o.dueDate || '';
        r.dataset.status = o.status || '';
        const isCompleted = (o.status === 'Shipment Approved') || (o.status === 'Shipped' && o.shipmentInfo?.adminVerifiedBy);
        if (isCompleted) r.classList.add('completed-row');
        r.insertCell().textContent = o.packageCode || 'N/A';
        r.insertCell().textContent = o.platformOrderId || '-';
        r.insertCell().textContent = o.platform || 'N/A';
        r.insertCell().textContent = translateStatusToThai(o.status, !!o.shipmentInfo?.adminVerifiedBy);
        r.insertCell().textContent = formatDateTimeDDMMYYYYHHMM(o.createdAt);
        r.insertCell().textContent = formatDateDDMMYYYY(o.dueDate);
        const actCell = r.insertCell();
        if(role === 'administrator' || role === 'supervisor') {
            const btn = document.createElement('button');
            btn.textContent = 'แก้ไข';
            btn.className = 'edit-order-btn';
            btn.dataset.orderkey = o.key;
            actCell.appendChild(btn);
            const delBtn = document.createElement('button');
            delBtn.textContent = 'ลบ';
            delBtn.className = 'delete-order-btn';
            delBtn.dataset.orderkey = o.key;
            actCell.appendChild(delBtn);
            delBtn.addEventListener('click', () => handleDeleteOrder(o.key));
            btn.addEventListener('click', () => handleEditOrder(o.key));
        } else {
            actCell.textContent = '-';
        }
    });
}

async function handleEditOrder(orderKey) {
    const role = getCurrentUserRole();
    if (!(role === 'administrator' || role === 'supervisor')) {
        showToast('คุณไม่มีสิทธิ์แก้ไข', 'error');
        return;
    }
    const row = el_ordersTableBody ? el_ordersTableBody.querySelector(`tr[data-orderkey="${orderKey}"]`) : null;
    if (!row) return;
    if (row.dataset.editing === 'true') return;
    row.dataset.editing = 'true';

    const cells = row.querySelectorAll('td');
    const packageCodeCell = cells[0];
    const platformOrderCell = cells[1];
    const statusCell = cells[3];
    const dueDateCell = cells[5];
    const actionsCell = cells[6];

    const platformOrderInput = document.createElement('input');
    platformOrderInput.type = 'text';
    platformOrderInput.value = platformOrderCell.textContent.trim();

    const packageCodeInput = document.createElement('input');
    packageCodeInput.type = 'text';
    packageCodeInput.value = packageCodeCell.textContent.trim();

    const statusSelect = document.createElement('select');
    const statusOptions = {
        'Ready to Pack': 'รอแพ็ก',
        'Pending Supervisor Pack Check': 'รอตรวจแพ็ค',
        'Ready for Shipment': 'รอส่ง',
        'Shipped': 'ส่งแล้ว',
        'Shipment Approved': 'เสร็จสิ้น'
    };
    Object.entries(statusOptions).forEach(([val, text]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = text;
        statusSelect.appendChild(opt);
    });
    const currentStatus = row.dataset.status || statusCell.textContent.trim();
    statusSelect.value = currentStatus;

    const dueDateInput = document.createElement('input');
    dueDateInput.type = 'date';
    const dueDateVal = row.dataset.duedate;
    if (dueDateVal) {
        const ts = parseInt(dueDateVal, 10);
        if (!isNaN(ts)) {
            dueDateInput.value = formatDateYYYYMMDD(ts);
        }
    }

    platformOrderCell.innerHTML = '';
    packageCodeCell.innerHTML = '';
    statusCell.innerHTML = '';
    dueDateCell.innerHTML = '';
    platformOrderCell.appendChild(platformOrderInput);
    packageCodeCell.appendChild(packageCodeInput);
    statusCell.appendChild(statusSelect);
    dueDateCell.appendChild(dueDateInput);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'บันทึก';
    saveBtn.className = 'save-order-btn';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'ยกเลิก';
    cancelBtn.className = 'cancel-edit-btn';

    actionsCell.innerHTML = '';
    actionsCell.appendChild(saveBtn);
    actionsCell.appendChild(cancelBtn);

    saveBtn.addEventListener('click', async () => {
        try {
            const updates = {
                platformOrderId: platformOrderInput.value.trim(),
                packageCode: packageCodeInput.value.trim(),
                status: statusSelect.value,
                dueDate: dueDateInput.value ? new Date(dueDateInput.value).getTime() : null,
                lastUpdatedAt: serverTimestamp()
            };
            await update(ref(database, 'orders/' + orderKey), updates);
            const filter = el_logFilterSelect ? el_logFilterSelect.value : 'all';
            const search = el_logSearchInput ? el_logSearchInput.value.trim() : '';
            loadDashboardData(filter, search);
            showAppStatus('อัปเดตข้อมูลแล้ว', 'success', el_appStatus);
        } catch (err) {
            console.error('edit order error', err);
            showAppStatus('เกิดข้อผิดพลาด: ' + err.message, 'error', el_appStatus);
        }
    });

    cancelBtn.addEventListener('click', () => {
        const filter = el_logFilterSelect ? el_logFilterSelect.value : 'all';
        const search = el_logSearchInput ? el_logSearchInput.value.trim() : '';
        loadDashboardData(filter, search);
    });
}

function renderCharts(orders) {
    if (typeof Chart === 'undefined') { console.warn("Chart.js library not loaded."); return; }
    if (!el_dailyStatsCanvas || !el_platformStatsCanvas) {
        console.warn("One or both chart canvas elements not found in renderCharts (dashboardPage.js).");
        if (dailyChartInstance) { dailyChartInstance.destroy(); dailyChartInstance = null; }
        if (platformChartInstance) { platformChartInstance.destroy(); platformChartInstance = null; }
        return;
    }
    if (!orders || orders.length === 0 ) {
        console.warn("No data available for charts.");
        if (dailyChartInstance) { dailyChartInstance.destroy(); dailyChartInstance = null; }
        if (platformChartInstance) { platformChartInstance.destroy(); platformChartInstance = null; }
        if(el_dailyStatsCanvas) el_dailyStatsCanvas.getContext('2d').clearRect(0,0,el_dailyStatsCanvas.width, el_dailyStatsCanvas.height);
        if(el_platformStatsCanvas) el_platformStatsCanvas.getContext('2d').clearRect(0,0,el_platformStatsCanvas.width, el_platformStatsCanvas.height);
        return;
    }

    // Daily Stats
    const dailyData = {}; 
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dailyData[d.toISOString().slice(0, 10)] = { created: 0, shipped: 0 }; }
    orders.forEach(o => {
        if (o.createdAt && typeof o.createdAt === 'number') { const cd = new Date(o.createdAt).toISOString().slice(0, 10); if (dailyData[cd]) dailyData[cd].created++; }
        if ((o.status === "Shipped" || o.status === "Shipment Approved") && o.shipmentInfo?.shippedAt_actual && typeof o.shipmentInfo.shippedAt_actual === 'number') { const sd = new Date(o.shipmentInfo.shippedAt_actual).toISOString().slice(0, 10); if (dailyData[sd]) dailyData[sd].shipped++;}
    });
    const dailyLabels = Object.keys(dailyData).map(dStr => new Date(dStr).toLocaleDateString('th-TH', { day:'numeric', month:'short'}));
    const dailyCreatedCounts = Object.values(dailyData).map(data => data.created);
    const dailyShippedCounts = Object.values(dailyData).map(data => data.shipped);

    if (dailyChartInstance) dailyChartInstance.destroy();
    dailyChartInstance = new Chart(el_dailyStatsCanvas, { 
        type: 'bar', data: { labels: dailyLabels, datasets: [
            { label: 'สร้างใหม่', data: dailyCreatedCounts, backgroundColor: 'rgba(54, 162, 235, 0.7)', stack: 'Stack 0',},
            { label: 'ส่งแล้ว', data: dailyShippedCounts, backgroundColor: 'rgba(75, 192, 192, 0.7)', stack: 'Stack 0',}
        ]}, options: { scales: { y: { beginAtZero: true, stacked: true } , x: {stacked: true}}, responsive: true, maintainAspectRatio: false }
    });

    // Platform Stats
    const platformCounts = {}; orders.forEach(o => {
        let p = o.platform || 'Other';
        if (p === 'Unknown') p = 'Other';
        platformCounts[p] = (platformCounts[p] || 0) + 1;
    });
    const platformLabels = Object.keys(platformCounts);
    const defaultColors = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40'];
    const platformColors = platformLabels.map((label, idx) => {
        const lower = label.toLowerCase();
        if (lower.includes('shopee')) return '#EE4D2D'; // orange
        if (lower.includes('lazada')) return '#4B0082'; // blue-purple
        if (lower.includes('tiktok')) return '#000000'; // black
        if (lower.includes('other')) return '#2ecc71'; // green
        return defaultColors[idx % defaultColors.length];
    });
    if (platformChartInstance) platformChartInstance.destroy();
    platformChartInstance = new Chart(el_platformStatsCanvas, {
        type: 'doughnut', data: { labels: platformLabels, datasets: [{ data: Object.values(platformCounts), backgroundColor: platformColors }]},
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom'}}}
    });
}async function handleDeleteOrder(orderKey) {
    const role = getCurrentUserRole();
    if (!(role === 'administrator' || role === 'supervisor')) return;
    if (!confirm('ต้องการลบออเดอร์นี้หรือไม่?')) return;
    try {
        await remove(ref(database, 'orders/' + orderKey));
        const filter = el_logFilterSelect ? el_logFilterSelect.value : 'all';
        const search = el_logSearchInput ? el_logSearchInput.value.trim() : '';
        loadDashboardData(filter, search);
        showAppStatus('ลบออเดอร์แล้ว', 'success', el_appStatus);
    } catch (err) {
        console.error('delete order error', err);
        showAppStatus('เกิดข้อผิดพลาด: ' + err.message, 'error', el_appStatus);
    }
}
