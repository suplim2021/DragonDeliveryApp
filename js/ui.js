// js/ui.js
// This module will export references to DOM elements and UI utility functions

export const uiElements = {}; // Object to hold all DOM element references

export function initializeDOMElements() {
    // Login Page
    uiElements.loginPage = document.getElementById('loginPage');
    uiElements.mainApp = document.getElementById('mainApp');
    uiElements.loginButton = document.getElementById('loginButton');
    uiElements.emailInput = document.getElementById('email');
    uiElements.passwordInput = document.getElementById('password');
    uiElements.loginError = document.getElementById('loginError');
    
    // Main App Shell
    uiElements.userDisplayEmail = document.getElementById('userDisplayEmail');
    uiElements.userDisplayRole = document.getElementById('userDisplayRole');
    uiElements.logoutButton = document.getElementById('logoutButton');
    uiElements.appStatus = document.getElementById('appStatus'); // General status message
    uiElements.bottomNavContainer = document.getElementById('bottomNavContainer');
    uiElements.allPages = document.querySelectorAll('.page'); // Collection of all page divs

    // Dashboard Page
    uiElements.dashboardPage = document.getElementById('dashboardPage');
    uiElements.currentDateDisplay = document.getElementById('currentDateDisplay');
    uiElements.refreshDashboardButton = document.getElementById('refreshDashboardButton');
    uiElements.summaryCardsContainer = document.getElementById('summaryCardsContainer');
    uiElements.dailyStatsChartCanvas = document.getElementById('dailyStatsChart');
    uiElements.platformStatsChartCanvas = document.getElementById('platformStatsChart');
    uiElements.logFilterStatusSelect = document.getElementById('logFilterStatus');
    uiElements.applyLogFilterButton = document.getElementById('applyLogFilterButton');
    uiElements.ordersTableBody = document.getElementById('ordersTableBody');
    uiElements.noOrdersMessage = document.getElementById('noOrdersMessage');

    // Admin Create Order Page
    uiElements.adminCreateOrderPage = document.getElementById('adminCreateOrderPage');
    uiElements.startQRScanButton_AdminOrder = document.getElementById('startQRScanButton_AdminOrder');
    uiElements.qrScannerContainer_AdminOrder = document.getElementById('qrScannerContainer_AdminOrder');
    uiElements.qrScanner_AdminOrder_div = document.getElementById('qrScanner_AdminOrder');
    uiElements.stopQRScanButton_AdminOrder = document.getElementById('stopQRScanButton_AdminOrder');
    uiElements.scannedQRData_AdminOrder = document.getElementById('scannedQRData_AdminOrder');
    uiElements.adminPlatformInput = document.getElementById('adminPlatform');
    uiElements.adminPlatformOrderIdInput = document.getElementById('adminPlatformOrderId');
    uiElements.scanPlatformOrderIdButton = document.getElementById('scanPlatformOrderIdButton');
    uiElements.qrScannerContainer_PlatformOrderId = document.getElementById('qrScannerContainer_PlatformOrderId');
    uiElements.qrScanner_PlatformOrderId_div = document.getElementById('qrScanner_PlatformOrderId');
    uiElements.stopScanPlatformOrderIdButton = document.getElementById('stopScanPlatformOrderIdButton');
    uiElements.adminPackageCodeInput = document.getElementById('adminPackageCode');
    uiElements.adminDueDateInput = document.getElementById('adminDueDate');
    uiElements.adminNotesInput = document.getElementById('adminNotes');
    uiElements.saveInitialOrderButton = document.getElementById('saveInitialOrderButton');

    // Admin Add Items Page
    uiElements.adminAddItemsPage = document.getElementById('adminAddItemsPage');
    uiElements.currentOrderIdForItemsSpan = document.getElementById('currentOrderIdForItems');
    uiElements.productSearchInput = document.getElementById('productSearch');
    uiElements.quantityInput = document.getElementById('quantity');
    uiElements.unitInput = document.getElementById('unit');
    uiElements.addItemToOrderButton = document.getElementById('addItemToOrderButton');
    uiElements.itemListCurrentOrderUL = document.getElementById('itemListCurrentOrder');
    uiElements.confirmAllItemsButton = document.getElementById('confirmAllItemsButton');
    
    // Operator Packing Page
    uiElements.operatorPackingPage = document.getElementById('operatorPackingPage');
    uiElements.currentOrderIdForPackingSpan = document.getElementById('currentOrderIdForPacking');
    uiElements.packOrderPlatformSpan = document.getElementById('packOrderPlatform');
    uiElements.packOrderDueDateSpan = document.getElementById('packOrderDueDate');
    uiElements.packOrderItemListUL = document.getElementById('packOrderItemList');
    uiElements.packingPhotoInput = document.getElementById('packingPhoto');
    uiElements.packingPhotoPreviewImg = document.getElementById('packingPhotoPreview');
    uiElements.operatorPackNotesTextarea = document.getElementById('operatorPackNotes');
    uiElements.confirmPackingButton = document.getElementById('confirmPackingButton');
    uiElements.supervisorPackCheckResultDiv = document.getElementById('supervisorPackCheckResult');
    uiElements.packCheckStatusSpan = document.getElementById('packCheckStatus');
    uiElements.packCheckSupervisorSpan = document.getElementById('packCheckSupervisor');
    uiElements.packCheckNotesSpan = document.getElementById('packCheckNotes');

    console.log("All DOM elements initialized in ui.js");
}

export function showPage(pageId) {
    if (!uiElements.allPages || uiElements.allPages.length === 0) {
        console.error("Pages not initialized for showPage. Call initializeDOMElements first.");
        return;
    }
    uiElements.allPages.forEach(page => page.classList.add('hidden'));
    uiElements.allPages.forEach(page => page.classList.remove('current-page')); // Ensure only one current page
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('current-page');
        console.log(`Showing page: ${pageId}`);
    } else {
        console.error(`Page with ID "${pageId}" not found.`);
        // Optionally show a default page like dashboard if target not found
        // document.getElementById('dashboardPage').classList.remove('hidden');
        // document.getElementById('dashboardPage').classList.add('current-page');
    }
    updateBottomNavActiveState(pageId);

    // Page specific setup/reset when shown
    if (pageId === 'adminCreateOrderPage' && uiElements.adminDueDateInput) {
        // Call setDefaultDueDate from utils.js or define it here/import it
        // For now, direct call to a function expected to be in global scope or imported
        if (typeof setDefaultDueDate === 'function') setDefaultDueDate(); // Assumes setDefaultDueDate is globally available or imported
        else console.warn("setDefaultDueDate function not available in ui.js scope");

        if(uiElements.adminPlatformInput) { uiElements.adminPlatformInput.value = ''; uiElements.adminPlatformInput.readOnly = true; }
        if(uiElements.adminPlatformOrderIdInput) uiElements.adminPlatformOrderIdInput.value = '';
        if(uiElements.adminPackageCodeInput) { uiElements.adminPackageCodeInput.value = ''; uiElements.adminPackageCodeInput.readOnly = true; }
        if(uiElements.adminNotesInput) uiElements.adminNotesInput.value = '';
        if(uiElements.scannedQRData_AdminOrder) uiElements.scannedQRData_AdminOrder.textContent = 'N/A';
        
        if(uiElements.qrScannerContainer_AdminOrder) uiElements.qrScannerContainer_AdminOrder.classList.add('hidden');
        if(uiElements.stopQRScanButton_AdminOrder) uiElements.stopQRScanButton_AdminOrder.classList.add('hidden');
        if(uiElements.startQRScanButton_AdminOrder) uiElements.startQRScanButton_AdminOrder.disabled = false;
        
        if(uiElements.qrScannerContainer_PlatformOrderId) uiElements.qrScannerContainer_PlatformOrderId.classList.add('hidden');
        if(uiElements.stopScanPlatformOrderIdButton) uiElements.stopScanPlatformOrderIdButton.classList.add('hidden');
        if(uiElements.scanPlatformOrderIdButton) uiElements.scanPlatformOrderIdButton.disabled = false;

    } else if (pageId === 'dashboardPage') {
        if (typeof updateCurrentDate === 'function' && typeof loadDashboardData === 'function') {
             // These functions are expected to be imported or global, and check for currentUser internally
            updateCurrentDate();
            loadDashboardData();
        } else {
            console.warn("Dashboard utility functions (updateCurrentDate, loadDashboardData) not available in ui.js scope");
        }
    }
}

export function updateBottomNavActiveState(currentPageId) {
    if (!uiElements.bottomNavContainer) return;
    const navButtons = uiElements.bottomNavContainer.querySelectorAll('button');
    navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pageid === currentPageId);
    });
}

export function setupRoleBasedUI(currentUserRole) {
    if (!uiElements.bottomNavContainer) return;
    uiElements.bottomNavContainer.innerHTML = ''; // Clear previous nav
    let navHtml = `<button type="button" data-pageid="dashboardPage">Dashboard</button>`;

    if (currentUserRole === 'administrator') {
        navHtml += `<button type="button" data-pageid="adminCreateOrderPage">สร้างออเดอร์</button>`;
        // Add more admin specific nav buttons if needed (e.g., User Management, Product Management)
    }
    if (currentUserRole === 'operator') {
        // For operator, they'd likely see a list of orders to pack/ship first
        navHtml += `<button type="button" onclick="window.navigateToOperatorScanToPack()">แพ็กของ</button>`; // Assumes navigateToOperatorScanToPack is global
        // navHtml += `<button type="button" data-pageid="operatorPackingList">รายการแพ็ก</button>`;
        // navHtml += `<button type="button" data-pageid="operatorShippingList">รายการส่ง</button>`;
    }
    if (currentUserRole === 'supervisor') {
        // navHtml += `<button type="button" data-pageid="supervisorCheckListPage">รายการตรวจสอบ</button>`;
    }
    uiElements.bottomNavContainer.innerHTML = navHtml;

    // Add event listeners to new nav buttons for page navigation
    uiElements.bottomNavContainer.querySelectorAll('button[data-pageid]').forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.dataset.pageid));
    });
}