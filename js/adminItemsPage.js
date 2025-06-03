// js/adminItemsPage.js
import { database, auth } from './config.js'; // Firebase services
import { ref, set, get, update, push, child, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { uiElements, showPage } from './ui.js';
import { showAppStatus } from './utils.js';
import { getCurrentUser, getCurrentUserRole } from './auth.js';

let currentOrderKeyForItems = null; // Stores the key of the order being edited

export function initializeAdminItemsPageListeners() {
    if (!uiElements.addItemToOrderButton || !uiElements.confirmAllItemsButton) {
        console.warn("Admin Items Page elements not fully initialized for listeners.");
        return;
    }

    uiElements.addItemToOrderButton.addEventListener('click', addItemToOrder);
    uiElements.confirmAllItemsButton.addEventListener('click', confirmAllItems);

    // Make deleteItem globally accessible for inline onclick, or refactor to use event delegation
    window.deleteItemFromList = async function(orderKey, itemId) {
        if (!orderKey || !itemId) {
            console.error("Order key or item ID missing for deletion.");
            return;
        }
        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสินค้ารายการนี้?`)) return;
        try {
            await set(ref(database, `orders/${orderKey}/items/${itemId}`), null); // Remove the item
            console.log(`Item ${itemId} deleted from order ${orderKey}`);
            showAppStatus("ลบรายการสินค้าแล้ว", "success", uiElements.appStatus);
            // Re-render the item list for the current order
            loadOrderForAddingItems(orderKey);
        } catch (error) {
            console.error("Error deleting item:", error);
            showAppStatus("เกิดข้อผิดพลาดในการลบสินค้า: " + error.message, "error", uiElements.appStatus);
        }
    }
}

export function loadOrderForAddingItems(orderKey) {
    if (!orderKey) {
        console.error("loadOrderForAddingItems: No orderKey provided.");
        showAppStatus("ไม่พบ Order Key สำหรับการเพิ่มสินค้า", "error", uiElements.appStatus);
        showPage('dashboardPage'); // Navigate to a safe page
        return;
    }
    currentOrderKeyForItems = orderKey;
    if (uiElements.currentOrderIdForItemsSpan) uiElements.currentOrderIdForItemsSpan.textContent = orderKey;
    
    // Clear previous item list and input fields
    if (uiElements.itemListCurrentOrderUL) uiElements.itemListCurrentOrderUL.innerHTML = '';
    if (uiElements.productSearchInput) uiElements.productSearchInput.value = '';
    if (uiElements.quantityInput) uiElements.quantityInput.value = '1';
    if (uiElements.unitInput) uiElements.unitInput.value = '';

    const itemsRef = ref(database, `orders/${orderKey}/items`);
    get(itemsRef).then(snapshot => {
        if (snapshot.exists()) {
            const items = snapshot.val();
            for (const itemId in items) {
                if (items.hasOwnProperty(itemId)) {
                    renderItemInList(itemId, items[itemId]);
                }
            }
        } else {
            console.log(`No items found for order ${orderKey}`);
        }
    }).catch(error => {
        console.error(`Error fetching items for order ${orderKey}:`, error);
        showAppStatus("เกิดข้อผิดพลาดในการโหลดรายการสินค้า", "error", uiElements.appStatus);
    });

    showPage('adminAddItemsPage');
}

function renderItemInList(itemId, itemData) {
    if (!uiElements.itemListCurrentOrderUL) return;
    const li = document.createElement('li');
    // Using currentOrderKeyForItems which is a module-level variable
    li.innerHTML = `<span>${itemData.productName} - ${itemData.quantity} ${itemData.unit}</span> 
                    <button type="button" class="secondary" style="padding:3px 8px; font-size:0.8em; width:auto; float:right;" 
                            onclick="window.deleteItemFromList('${currentOrderKeyForItems}', '${itemId}')">ลบ</button>`;
    uiElements.itemListCurrentOrderUL.appendChild(li);
}

async function addItemToOrder() {
    const currentUser = getCurrentUser();
    const currentUserRole = getCurrentUserRole();

    if (currentUserRole !== 'administrator' || !currentOrderKeyForItems) {
        showAppStatus("ไม่มีสิทธิ์หรือไม่ได้เลือกออเดอร์", "error", uiElements.appStatus);
        return;
    }

    const productName = uiElements.productSearchInput.value.trim();
    const quantity = parseInt(uiElements.quantityInput.value);
    const unit = uiElements.unitInput.value.trim();

    if (!productName || isNaN(quantity) || quantity <= 0 || !unit) {
        showAppStatus("กรุณากรอกข้อมูลสินค้า (ชื่อ, จำนวน, หน่วย) ให้ถูกต้อง", "error", uiElements.appStatus);
        return;
    }

    const newItemRef = push(child(ref(database, 'orders/' + currentOrderKeyForItems), 'items'));
    const itemData = {
        productName: productName,
        quantity: quantity,
        unit: unit,
        addedBy_adminUid: currentUser.uid,
        addedAt: serverTimestamp()
    };

    try {
        await set(newItemRef, itemData);
        showAppStatus(`เพิ่ม "${productName}" ในรายการแล้ว`, "success", uiElements.appStatus);
        renderItemInList(newItemRef.key, itemData); // Add to UI list
        // Clear input fields for next item
        uiElements.productSearchInput.value = '';
        uiElements.quantityInput.value = '1';
        uiElements.unitInput.value = '';
        uiElements.productSearchInput.focus();
    } catch (error) {
        console.error("Error adding item:", error);
        showAppStatus("เกิดข้อผิดพลาดในการเพิ่มสินค้า: " + error.message, "error", uiElements.appStatus);
    }
}

async function confirmAllItems() {
    const currentUserRole = getCurrentUserRole();
    if (currentUserRole !== 'administrator' || !currentOrderKeyForItems) {
        showAppStatus("ไม่มีสิทธิ์หรือไม่ได้เลือกออเดอร์", "error", uiElements.appStatus);
        return;
    }

    // Check if there are any items added
    if (uiElements.itemListCurrentOrderUL && uiElements.itemListCurrentOrderUL.children.length === 0) {
        showAppStatus("กรุณาเพิ่มอย่างน้อย 1 รายการสินค้าก่อนยืนยัน", "error", uiElements.appStatus);
        return;
    }
    
    uiElements.confirmAllItemsButton.disabled = true;
    showAppStatus("กำลังยืนยันรายการสินค้า...", "info", uiElements.appStatus);

    try {
        await update(ref(database, 'orders/' + currentOrderKeyForItems), {
            status: "Ready to Pack", // Update status
            lastUpdatedAt: serverTimestamp()
        });
        showAppStatus(`ออเดอร์ ${currentOrderKeyForItems} พร้อมสำหรับการแพ็กแล้ว`, "success", uiElements.appStatus);
        showPage('dashboardPage'); // Navigate back to dashboard or admin order list
    } catch (error) {
        console.error("Error confirming items:", error);
        showAppStatus("เกิดข้อผิดพลาดในการยืนยันรายการสินค้า: " + error.message, "error", uiElements.appStatus);
    } finally {
        uiElements.confirmAllItemsButton.disabled = false;
    }
}