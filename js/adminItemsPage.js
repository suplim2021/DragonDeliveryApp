// js/adminItemsPage.js
import { database, auth } from './config.js';
import { ref, set, get, update, push, child, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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

    window.deleteItemFromList = async function(orderKey, itemId) { /* ... (logic using local vars like adminItemsAppStatus and calling loadOrderForAddingItems) ... */ };
}

export function loadOrderForAddingItems(orderKey) {
    if (!orderKey) { /* ... */ showPage('dashboardPage'); return; }
    currentOrderKeyForItems = orderKey;
    if (adminItemsCurrentOrderIdSpan) adminItemsCurrentOrderIdSpan.textContent = orderKey;
    if (adminItemsItemListUL) adminItemsItemListUL.innerHTML = '';
    // ... (rest of logic using local vars like adminItemsProductSearchInput) ...
    // ...
    showPage('adminAddItemsPage'); // This showPage is imported from ui.js
}

function renderItemInList(itemId, itemData) {
    if (!adminItemsItemListUL) return;
    // ... (rest of logic using local vars) ...
}
async function addItemToOrder() {
    // ... (logic using local vars like adminItemsProductSearchInput, adminItemsQuantityInput) ...
}
async function confirmAllItems() {
    // ... (logic using local vars like adminItemsItemListUL and calling showPage('dashboardPage')) ...
}
// (โค้ดส่วนที่เหลือของ adminItemsPage.js ที่คุณมี ก็ปรับให้ใช้ Local Variables ที่ Get มาใน initializeAdminItemsPageListeners)