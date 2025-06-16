import { database } from './config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getCurrentUserRole } from './auth.js';
import { formatDateTimeDDMMYYYYHHMM, formatDateDDMMYYYY, translateStatusToThai } from './utils.js';

let el_tableBody, el_noMsg, el_dateFilterSelect, el_startInput, el_endInput, el_applyDateButton, el_platformFilter;
let currentSort = { column: 'createdAt', dir: 'desc' };

export function initializeAdminParcelListPageListeners() {
    el_tableBody = document.getElementById('parcelListTableBody');
    el_noMsg = document.getElementById('noParcelsMessage');
    el_dateFilterSelect = document.getElementById('parcelDateFilter');
    el_startInput = document.getElementById('parcelDateStart');
    el_endInput = document.getElementById('parcelDateEnd');
    el_applyDateButton = document.getElementById('applyParcelDateFilterButton');
    el_platformFilter = document.getElementById('parcelPlatformFilter');

    if (el_dateFilterSelect) {
        el_dateFilterSelect.addEventListener('change', () => {
            const showCustom = el_dateFilterSelect.value === 'custom';
            const span = document.getElementById('parcelCustomDates');
            if (span) span.classList.toggle('hidden', !showCustom);
            if (!showCustom) {
                loadParcelList(el_dateFilterSelect.value, null, null, el_platformFilter ? el_platformFilter.value : 'all');
            }
        });
    }

    if (el_applyDateButton) {
        el_applyDateButton.addEventListener('click', () => {
            loadParcelList(el_dateFilterSelect ? el_dateFilterSelect.value : 'today', el_startInput ? el_startInput.value : null, el_endInput ? el_endInput.value : null, el_platformFilter ? el_platformFilter.value : 'all');
        });
    }

    if (el_platformFilter) {
        el_platformFilter.addEventListener('change', () => {
            loadParcelList(el_dateFilterSelect ? el_dateFilterSelect.value : 'today', el_startInput ? el_startInput.value : null, el_endInput ? el_endInput.value : null, el_platformFilter.value);
        });
    }

    document.querySelectorAll('#parcelListTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.field;
            if (currentSort.column === field) {
                currentSort.dir = currentSort.dir === 'asc' ? 'desc' : currentSort.dir === 'desc' ? '' : 'asc';
            } else {
                currentSort.column = field;
                currentSort.dir = 'asc';
            }
            loadParcelList(el_dateFilterSelect ? el_dateFilterSelect.value : 'today', el_startInput ? el_startInput.value : null, el_endInput ? el_endInput.value : null, el_platformFilter ? el_platformFilter.value : 'all');
        });
    });
}

function applyTimeFilter(orders, filterVal, startDateStr, endDateStr) {
    if (!orders || filterVal === 'all') return orders.slice();
    let startTs = null, endTs = null;
    const today = new Date();
    today.setHours(0,0,0,0);
    switch(filterVal) {
        case 'today':
            startTs = today.getTime() + 60000; // 00:01
            endTs = Date.now();
            break;
        case 'yesterday':
            endTs = today.getTime() - 1;
            startTs = endTs - 86400000 + 1;
            break;
        case 'last7':
            startTs = today.getTime() - 6*86400000;
            endTs = today.getTime() + 86400000 - 1;
            break;
        case 'last30':
            startTs = today.getTime() - 29*86400000;
            endTs = today.getTime() + 86400000 - 1;
            break;
        case 'custom':
            if (startDateStr) startTs = new Date(startDateStr).setHours(0,0,0,0);
            if (endDateStr) endTs = new Date(endDateStr).setHours(23,59,59,999);
            break;
        default:
            return orders.slice();
    }
    return orders.filter(o => {
        const ts = o.createdAt || 0;
        if (startTs !== null && ts < startTs) return false;
        if (endTs !== null && ts > endTs) return false;
        return true;
    });
}

export async function loadParcelList(timeFilter = 'today', startDate = null, endDate = null, platformFilter = 'all') {
    if (!el_tableBody) return;
    el_tableBody.innerHTML = '';
    if (el_noMsg) el_noMsg.classList.add('hidden');
    try {
        const snap = await get(ref(database, 'orders'));
        let orders = [];
        if (snap.exists()) {
            snap.forEach(child => {
                const data = child.val();
                orders.push({
                    key: child.key,
                    ...data,
                    shippedAt_actual: data.shipmentInfo?.shippedAt_actual || null
                });
            });
        }
        orders.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        orders = applyTimeFilter(orders, timeFilter, startDate, endDate);
        if (platformFilter && platformFilter !== 'all') orders = orders.filter(o => o.platform === platformFilter);

        if (currentSort.dir) {
            orders.sort((a,b) => {
                let va = a[currentSort.column];
                let vb = b[currentSort.column];
                if (typeof va === 'string') va = va.toLowerCase();
                if (typeof vb === 'string') vb = vb.toLowerCase();
                if (va === undefined) va = '';
                if (vb === undefined) vb = '';
                if (currentSort.dir === 'asc') return va > vb ? 1 : va < vb ? -1 : 0;
                else return va > vb ? -1 : va < vb ? 1 : 0;
            });
        }

        if (orders.length === 0) {
            if (el_noMsg) el_noMsg.classList.remove('hidden');
            return;
        }
        const role = getCurrentUserRole();
        orders.forEach(o => {
            const tr = el_tableBody.insertRow();
            const isVerified = (o.status === 'Shipment Approved') || (o.status === 'Shipped' && o.shipmentInfo?.adminVerifiedBy);
            if (isVerified) tr.classList.add('verified-row');
            tr.insertCell().textContent = o.packageCode || 'N/A';
            tr.insertCell().textContent = o.platformOrderId || '-';
            tr.insertCell().textContent = o.platform || 'N/A';
            tr.insertCell().textContent = o.notes || '-';
            tr.insertCell().textContent = translateStatusToThai(o.status, !!o.shipmentInfo?.adminVerifiedBy);
            tr.insertCell().textContent = formatDateTimeDDMMYYYYHHMM(o.createdAt);
            tr.insertCell().textContent = formatDateDDMMYYYY(o.dueDate);
            tr.insertCell().textContent = o.shippedAt_actual ? formatDateTimeDDMMYYYYHHMM(o.shippedAt_actual) : '-';

            tr.classList.add('clickable-row');
            tr.addEventListener('click', () => {
                if (typeof window.loadParcelDetail === 'function') window.loadParcelDetail(o.key);
            });
        });
    } catch (err) {
        console.error('loadParcelList error', err);
        if (el_noMsg) el_noMsg.textContent = 'เกิดข้อผิดพลาดในการโหลด';
        if (el_noMsg) el_noMsg.classList.remove('hidden');
    }
}
