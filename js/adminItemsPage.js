// js/adminItemsPage.js
import { database } from './config.js';
import { ref, set, get, update, push, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showAppStatus } from './utils.js';
import { getCurrentUserRole, getCurrentUser } from './auth.js';
import { showPage } from './ui.js';

let adminItemsAppStatus,
    adminItemsCurrentOrderIdSpan,
    adminItemsProductSearchInput,
    adminItemsQuantityInput,
    adminItemsUnitInput,
    adminItemsItemListUL,
    adminItemsNotesInput,
    adminItemsAddItemButton,
    adminItemsConfirmButton;

let currentOrderKeyForItems = null;

export function initializeAdminItemsPageListeners() {
    adminItemsAppStatus = document.getElementById('appStatus');
    adminItemsCurrentOrderIdSpan = document.getElementById('currentOrderIdForItems');
    adminItemsProductSearchInput = document.getElementById('productSearch');
    adminItemsQuantityInput = document.getElementById('quantity');
    adminItemsUnitInput = document.getElementById('unit');
    adminItemsItemListUL = document.getElementById('itemListCurrentOrder');
    adminItemsNotesInput = document.getElementById('adminItemsNotes');
    adminItemsAddItemButton = document.getElementById('addItemToOrderButton');
    adminItemsConfirmButton = document.getElementById('confirmAllItemsButton');

    if (adminItemsAddItemButton) adminItemsAddItemButton.addEventListener('click', addItemToOrder);
    if (adminItemsConfirmButton) adminItemsConfirmButton.addEventListener('click', confirmAllItems);

    window.deleteItemFromList = async function(orderKey, itemId) {
        if (!confirm('ต้องการลบรายการนี้หรือไม่?')) return;
        try {
            await remove(ref(database, `orders/${orderKey}/items/${itemId}`));
            showAppStatus('ลบรายการแล้ว', 'success', adminItemsAppStatus);
            loadOrderForAddingItems(orderKey);
        } catch (err) {
            console.error('delete item error', err);
            showAppStatus('เกิดข้อผิดพลาด: ' + err.message, 'error', adminItemsAppStatus);
        }
    };
}

export async function loadOrderForAddingItems(orderKey) {
    const role = getCurrentUserRole();
    if (!['administrator','supervisor'].includes(role)) {
        showAppStatus('คุณไม่มีสิทธิ์', 'error', adminItemsAppStatus);
        return;
    }
    if (!orderKey) {
        showPage('dashboardPage');
        return;
    }
    currentOrderKeyForItems = orderKey;
    if (adminItemsProductSearchInput) adminItemsProductSearchInput.value = '';
    if (adminItemsQuantityInput) adminItemsQuantityInput.value = '1';
    if (adminItemsUnitInput) adminItemsUnitInput.value = 'ถุง';
    if (adminItemsItemListUL) adminItemsItemListUL.innerHTML = '';

    try {
        const snap = await get(ref(database, 'orders/' + orderKey));
        if (snap.exists()) {
            const data = snap.val();
            if (adminItemsCurrentOrderIdSpan) adminItemsCurrentOrderIdSpan.textContent = data.packageCode || orderKey;
            if (adminItemsNotesInput) adminItemsNotesInput.value = data.notes || '';
            if (data.items) {
                Object.keys(data.items).forEach(id => {
                    renderItemInList(id, data.items[id]);
                });
            }
            showAppStatus('โหลดข้อมูลออเดอร์แล้ว', 'success', adminItemsAppStatus);
        } else {
            showAppStatus('ไม่พบออเดอร์', 'error', adminItemsAppStatus);
            showPage('dashboardPage');
            return;
        }
    } catch(err) {
        console.error('loadOrderForAddingItems error', err);
        showAppStatus('เกิดข้อผิดพลาด', 'error', adminItemsAppStatus);
    }
    showPage('adminItemsPage');
}

function renderItemInList(itemId, itemData) {
    if (!adminItemsItemListUL) return;
    const li = document.createElement('li');
    li.textContent = `${itemData.productName} - ${itemData.quantity} ${itemData.unit}`;
    const btn = document.createElement('button');
    btn.textContent = 'ลบ';
    btn.style.marginLeft = '10px';
    btn.addEventListener('click', () => window.deleteItemFromList(currentOrderKeyForItems, itemId));
    li.appendChild(btn);
    adminItemsItemListUL.appendChild(li);
}

async function addItemToOrder() {
    const name = adminItemsProductSearchInput ? adminItemsProductSearchInput.value.trim() : '';
    const qty = parseInt(adminItemsQuantityInput ? adminItemsQuantityInput.value : '1', 10) || 1;
    const unit = adminItemsUnitInput ? adminItemsUnitInput.value.trim() : '';
    if (!name || !currentOrderKeyForItems) {
        showAppStatus('กรุณาระบุชื่อสินค้า', 'error', adminItemsAppStatus);
        return;
    }
    try {
        const newRef = push(ref(database, `orders/${currentOrderKeyForItems}/items`));
        await set(newRef, { productName: name, quantity: qty, unit });
        renderItemInList(newRef.key, { productName: name, quantity: qty, unit });
        if (adminItemsProductSearchInput) adminItemsProductSearchInput.value = '';
        if (adminItemsQuantityInput) adminItemsQuantityInput.value = '1';
        if (adminItemsUnitInput) adminItemsUnitInput.value = 'ถุง';
        showAppStatus('เพิ่มสินค้าแล้ว', 'success', adminItemsAppStatus);
    } catch (err) {
        console.error('addItemToOrder error', err);
        showAppStatus('เกิดข้อผิดพลาด: ' + err.message, 'error', adminItemsAppStatus);
    }
}

async function confirmAllItems() {
    const user = getCurrentUser();
    const role = getCurrentUserRole();
    if (!user || !['administrator','supervisor'].includes(role) || !currentOrderKeyForItems) {
        showAppStatus('คุณไม่มีสิทธิ์', 'error', adminItemsAppStatus);
        return;
    }
    try {
        const notesText = adminItemsNotesInput ? adminItemsNotesInput.value.trim() : '';
        await update(ref(database, 'orders/' + currentOrderKeyForItems), {
            status: 'Ready to Pack',
            lastUpdatedAt: serverTimestamp(),
            notes: notesText || null
        });
        showAppStatus('ยืนยันรายการสินค้าแล้ว', 'success', adminItemsAppStatus);
        currentOrderKeyForItems = null;
        showPage('dashboardPage');
    } catch(err) {
        console.error('confirmAllItems error', err);
        showAppStatus('เกิดข้อผิดพลาด: ' + err.message, 'error', adminItemsAppStatus);
    }
}
