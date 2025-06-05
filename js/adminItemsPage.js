// js/adminItemsPage.js
import { database, auth } from './config.js';
import { ref, set, get, update, push, child, serverTimestamp, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// import { uiElements, showPage } from './ui.js'; // <<<--- ลบออก
import { showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';
// Import showPage from ui.js if needed for navigation, or let main.js handle it
import { showPage } from './ui.js';


// DOM Elements specific to this page
let adminItemsAppStatus, adminItemsCurrentOrderIdSpan, adminItemsProductSearchInput,
    adminItemsQuantityInput, adminItemsUnitInput, adminItemsItemListUL,
    adminItemsAddItemButton, adminItemsConfirmButton;

let currentOrderKeyForItems = null;

export function initializeAdminItemsPageListeners() {
    adminItemsAppStatus = document.getElementById('appStatus');
    adminItemsCurrentOrderIdSpan = document.getElementById('currentOrderIdForItems');
    adminItemsProductSearchInput = document.getElementById('productSearch');
    adminItemsQuantityInput = document.getElementById('quantity');
    adminItemsUnitInput = document.getElementById('unit');
    adminItemsItemListUL = document.getElementById('itemListCurrentOrder');
    adminItemsAddItemButton = document.getElementById('addItemToOrderButton');
    adminItemsConfirmButton = document.getElementById('confirmAllItemsButton');

    if (!adminItemsAddItemButton || !adminItemsConfirmButton) {
        console.warn("Admin Items Page core elements not found.");
        return;
    }
    adminItemsAddItemButton.addEventListener('click', addItemToOrder);
    adminItemsConfirmButton.addEventListener('click', confirmAllItems);

    window.deleteItemFromList = async function(orderKey, itemId) {
        if (!orderKey || !itemId) return;
        if (!confirm('ลบสินค้านี้ออกจากออเดอร์?')) return;
        try {
            await remove(ref(database, `orders/${orderKey}/items/${itemId}`));
            showAppStatus('ลบสินค้าแล้ว', 'success', adminItemsAppStatus);
            loadOrderForAddingItems(orderKey);
        } catch (err) {
            console.error('Error deleting item:', err);
            showAppStatus('เกิดข้อผิดพลาดในการลบสินค้า: ' + err.message, 'error', adminItemsAppStatus);
        }
    };
}

export async function loadOrderForAddingItems(orderKey) {
    if (!orderKey) {
        showAppStatus('ไม่พบ Order Key สำหรับแก้ไข', 'error', adminItemsAppStatus);
        showPage('dashboardPage');
        return;
    }
    currentOrderKeyForItems = orderKey;
    if (adminItemsCurrentOrderIdSpan) adminItemsCurrentOrderIdSpan.textContent = orderKey;
    if (adminItemsItemListUL) adminItemsItemListUL.innerHTML = '';

    showAppStatus(`กำลังโหลดรายการของออเดอร์ ${orderKey}...`, 'info', adminItemsAppStatus);
    try {
        const itemsSnap = await get(child(ref(database), `orders/${orderKey}/items`));
        if (itemsSnap.exists()) {
            itemsSnap.forEach(itemSnap => {
                renderItemInList(itemSnap.key, itemSnap.val());
            });
        }
        showAppStatus(`แก้ไขรายการของออเดอร์ ${orderKey}`, 'success', adminItemsAppStatus);
    } catch (err) {
        console.error('Error loading items for edit:', err);
        showAppStatus('เกิดข้อผิดพลาดในการโหลดรายการสินค้า: ' + err.message, 'error', adminItemsAppStatus);
    }

    if (adminItemsProductSearchInput) adminItemsProductSearchInput.value = '';
    if (adminItemsQuantityInput) adminItemsQuantityInput.value = '1';
    if (adminItemsUnitInput) adminItemsUnitInput.value = '';

    showPage('adminAddItemsPage');
}

function renderItemInList(itemId, itemData) {
    if (!adminItemsItemListUL) return;
    const li = document.createElement('li');
    li.textContent = `${itemData.productName || 'ไม่ทราบชื่อ'} - ${itemData.quantity} ${itemData.unit || ''}`;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'ลบ';
    delBtn.style.marginLeft = '10px';
    delBtn.dataset.itemid = itemId;
    delBtn.addEventListener('click', async () => {
        if (confirm('ลบสินค้านี้ออกจากออเดอร์?')) {
            if (!currentOrderKeyForItems) return;
            try {
                await remove(ref(database, `orders/${currentOrderKeyForItems}/items/${itemId}`));
                li.remove();
                showAppStatus('ลบสินค้าแล้ว', 'success', adminItemsAppStatus);
            } catch (err) {
                console.error('Error deleting item:', err);
                showAppStatus('เกิดข้อผิดพลาดในการลบสินค้า: ' + err.message, 'error', adminItemsAppStatus);
            }
        }
    });
    li.appendChild(delBtn);
    adminItemsItemListUL.appendChild(li);
}
async function addItemToOrder() {
    // ... (logic using local vars like adminItemsProductSearchInput, adminItemsQuantityInput) ...
}
async function confirmAllItems() {
    // ... (logic using local vars like adminItemsItemListUL and calling showPage('dashboardPage')) ...
}
// (โค้ดส่วนที่เหลือของ adminItemsPage.js ที่คุณมี ก็ปรับให้ใช้ Local Variables ที่ Get มาใน initializeAdminItemsPageListeners)