// js/ui.js
import { setDefaultDueDate as utilSetDefaultDueDate } from './utils.js';

// Exported object for other modules to grab shared DOM elements
export const uiElements = {}; // Holds references to commonly used elements

// DOM Elements that are truly global or managed directly by ui.js functions
let allPagesNodeList = null; // To store the NodeList of all page divs
let bottomNavContainerDiv = null;
let appStatusDiv = null;
let loginPageDiv = null;
let mainAppDiv = null;
// Add other global elements if ui.js directly manipulates them outside of specific page modules

export function initializeCoreDOMElements() { // Renamed for clarity
    loginPageDiv = document.getElementById('loginPage');
    mainAppDiv = document.getElementById('mainApp');
    appStatusDiv = document.getElementById('appStatus');
    bottomNavContainerDiv = document.getElementById('bottomNavContainer');
    allPagesNodeList = document.querySelectorAll('.page');

    // Populate shared uiElements object for other modules
    uiElements.appStatus = appStatusDiv;
    uiElements.bottomNavContainer = bottomNavContainerDiv;
    uiElements.refreshOperatorTaskList = document.getElementById('refreshOperatorTaskList');
    uiElements.operatorOrderListContainer = document.getElementById('operatorOrderListContainer');
    uiElements.noOperatorTasksMessage = document.getElementById('noOperatorTasksMessage');
    uiElements.startScanForPackingButton = document.getElementById('startScanForPackingButton');
    uiElements.stopScanForPackingButton = document.getElementById('stopScanForPackingButton');
    uiElements.qrScanner_OperatorTask_div = document.getElementById('qrScanner_OperatorTask');
    uiElements.qrScannerContainer_OperatorTask = document.getElementById('qrScannerContainer_OperatorTask');
    uiElements.pickListSummaryContainer = document.getElementById('pickListSummaryContainer');
    uiElements.pickListSummaryTableBody = document.querySelector('#pickListSummaryTable tbody');
    uiElements.selectAllPendingOrdersButton = document.getElementById('selectAllPendingOrdersButton');

    uiElements.parcelTableBody = document.getElementById('parcelListTableBody');
    uiElements.noParcelsMessage = document.getElementById('noParcelsMessage');
    uiElements.parcelDateFilter = document.getElementById('parcelDateFilter');
    uiElements.parcelDateStart = document.getElementById('parcelDateStart');
    uiElements.parcelDateEnd = document.getElementById('parcelDateEnd');
    uiElements.parcelPlatformFilter = document.getElementById('parcelPlatformFilter');

    uiElements.createNewBatchButton = document.getElementById('createNewBatchButton');
    uiElements.startScanForBatchButton = document.getElementById('startScanForBatchButton');
    uiElements.stopScanForBatchButton = document.getElementById('stopScanForBatchButton');
    uiElements.confirmBatchAndProceedButton = document.getElementById('confirmBatchAndProceedButton');
    uiElements.courierSelect = document.getElementById('courierSelect');
    uiElements.otherCourierInput = document.getElementById('otherCourierInput');
    uiElements.manualBatchPackageInput = document.getElementById('manualBatchPackageInput');
    uiElements.addManualPackageButton = document.getElementById('addManualPackageButton');
    uiElements.readyToShipDatalist = document.getElementById('readyToShipDatalist');
    uiElements.readyToShipCheckboxList = document.getElementById('readyToShipCheckboxList');
    uiElements.selectAllReadyPackagesButton = document.getElementById('selectAllReadyPackagesButton');
    uiElements.currentBatchIdDisplay = document.getElementById('currentBatchIdDisplay');
    uiElements.batchItemList = document.getElementById('batchItemList');
    uiElements.batchItemCount = document.getElementById('batchItemCount');
    uiElements.qrScanner_Batch_div = document.getElementById('qrScanner_Batch');
    uiElements.qrScannerContainer_Batch = document.getElementById('qrScannerContainer_Batch');
    uiElements.confirmShipBatchIdDisplay = document.getElementById('confirmShipBatchIdDisplay');
    uiElements.confirmShipCourierDisplay = document.getElementById('confirmShipCourierDisplay');
    uiElements.confirmShipItemCountDisplay = document.getElementById('confirmShipItemCountDisplay');
    uiElements.shipmentGroupPhoto = document.getElementById('shipmentGroupPhoto');
    uiElements.shipmentGroupPhotoPreview = document.getElementById('shipmentGroupPhotoPreview');
    uiElements.shipmentGpsLocationDisplay = document.getElementById('shipmentGpsLocationDisplay');
    uiElements.finalizeShipmentButton = document.getElementById('finalizeShipmentButton');
    uiElements.backToShippingBatchButton = document.getElementById('backToShippingBatchButton');

    uiElements.refreshSupervisorPackCheckList = document.getElementById('refreshSupervisorPackCheckList');
    uiElements.packCheckListContainer = document.getElementById('packCheckListContainer');
    uiElements.noPackCheckOrdersMessage = document.getElementById('noPackCheckOrdersMessage');
    uiElements.approvePackButton = document.getElementById('approvePackButton');
    uiElements.rejectPackButton = document.getElementById('rejectPackButton');
    uiElements.checkOrderPackageCodeDisplay = document.getElementById('checkOrderPackageCodeDisplay');
    uiElements.checkOrderPlatformDisplay = document.getElementById('checkOrderPlatformDisplay');
    uiElements.checkOrderItemListDisplay = document.getElementById('checkOrderItemListDisplay');
    uiElements.checkOrderPackingPhotoContainer = document.getElementById('checkOrderPackingPhotoContainer');
    uiElements.checkOrderOrderNotesDisplay = document.getElementById('checkOrderOrderNotesDisplay');
    uiElements.checkOrderOperatorNotesDisplay = document.getElementById('checkOrderOperatorNotesDisplay');
    uiElements.supervisorPackCheckNotes = document.getElementById('supervisorPackCheckNotes');

    console.log("Core DOM elements for UI initialized (ui.js)");
}

export function showPage(pageId) {
    if (!allPagesNodeList || allPagesNodeList.length === 0) {
        console.error("Pages NodeList not initialized for showPage. Call initializeCoreDOMElements first.");
        // Attempt to re-initialize if called too early (though ideally main.js handles order)
        if (!allPagesNodeList) allPagesNodeList = document.querySelectorAll('.page');
        if (!allPagesNodeList || allPagesNodeList.length === 0) return;
    }
    if (typeof window.stopPackageCodeScan === 'function') window.stopPackageCodeScan();
    if (typeof window.stopPlatformIdScan === 'function') window.stopPlatformIdScan();
    if (typeof window.stopScanForBatch === 'function') window.stopScanForBatch();
    if (typeof window.stopScanForPacking === 'function') window.stopScanForPacking();
    window.scrollTo(0, 0);
    console.log(`UI: Attempting to show page: ${pageId}`);

    allPagesNodeList.forEach(page => {
        if(page) {
            page.classList.add('hidden');
            page.classList.remove('current-page');
        }
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('current-page');
        console.log(`UI: Successfully shown page: ${pageId}`);

        // Page specific setup/reset when shown
        // This part still relies on window functions for simplicity,
        // but ideally, page-specific modules would listen for a "pageShown" event or be called directly.
        if (pageId === 'adminCreateOrderPage') {
            const adminDueDateInput = document.getElementById('adminDueDate'); // Get element directly when needed
            if (adminDueDateInput) utilSetDefaultDueDate(adminDueDateInput);
            
            // Reset other form elements for adminCreateOrderPage directly
            ['adminPlatform', 'adminPlatformOrderId', 'adminPackageCode', 'adminNotes'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const scannedDataEl = document.getElementById('scannedQRData_AdminOrder');
            if(scannedDataEl) scannedDataEl.textContent = 'N/A';
            ['qrScannerContainer_AdminOrder', 'stopQRScanButton_AdminOrder', 
             'qrScannerContainer_PlatformOrderId', 'stopScanPlatformOrderIdButton'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.classList.add('hidden');
            });
            const startScanBtn = document.getElementById('startQRScanButton_AdminOrder');
            if(startScanBtn) startScanBtn.disabled = false;
            const scanPlatformIdBtn = document.getElementById('scanPlatformOrderIdButton');
            if(scanPlatformIdBtn) scanPlatformIdBtn.disabled = false;
            const platformInput = document.getElementById('adminPlatform');
            if(platformInput) platformInput.readOnly = true;
            const packageCodeInput = document.getElementById('adminPackageCode');
            if(packageCodeInput) packageCodeInput.readOnly = false;

        } else if (pageId === 'dashboardPage') {
            if (window.currentUserFromAuth) {
                if (typeof window.updateCurrentDateOnDashboardGlobal === 'function') window.updateCurrentDateOnDashboardGlobal();
                const filterSelect = document.getElementById('logFilterStatus');
                const dateFilter = document.getElementById('dashboardDateFilter');
                const startInput = document.getElementById('dateFilterStart');
                const endInput = document.getElementById('dateFilterEnd');
                if (typeof window.loadDashboardDataGlobal === 'function') {
                    window.loadDashboardDataGlobal(filterSelect ? filterSelect.value : 'all', '', dateFilter ? dateFilter.value : 'today', startInput ? startInput.value : null, endInput ? endInput.value : null);
                } else { console.error("loadDashboardDataGlobal function not found on window."); }
                if (typeof window.updateDashboardVisibilityForRoleGlobal === 'function') window.updateDashboardVisibilityForRoleGlobal();
            } else { console.warn("No user logged in, not loading dashboard data from showPage."); }
        } else if (pageId === 'operatorTaskListPage') {
            if (typeof window.loadOperatorPendingTasksGlobal === 'function') window.loadOperatorPendingTasksGlobal();
            else { console.error("loadOperatorPendingTasksGlobal function not found on window.");}
        } else if (pageId === 'supervisorPackCheckListPage') {
            if (typeof window.loadOrdersForPackCheckGlobal === 'function') window.loadOrdersForPackCheckGlobal();
            else { console.error("loadOrdersForPackCheckGlobal function not found on window.");}
        } else if (pageId === 'operatorShippingBatchPage') {
            if (typeof window.setupShippingBatchPageGlobal === 'function') window.setupShippingBatchPageGlobal();
            else { console.error("setupShippingBatchPageGlobal function not found on window.");}
            if (typeof window.updateBatchIdVisibilityForRoleGlobal === 'function') window.updateBatchIdVisibilityForRoleGlobal();
        } else if (pageId === 'parcelListPage') {
            if (typeof window.loadParcelListGlobal === 'function') {
                const df = document.getElementById('parcelDateFilter');
                const ds = document.getElementById('parcelDateStart');
                const de = document.getElementById('parcelDateEnd');
                const pf = document.getElementById('parcelPlatformFilter');
                window.loadParcelListGlobal(df ? df.value : 'last7', ds ? ds.value : null, de ? de.value : null, pf ? pf.value : 'all');
            }
        } else if (pageId === 'shippedOrdersPage') {
            if (typeof window.loadShippedOrdersGlobal === 'function') window.loadShippedOrdersGlobal();
            else { console.error("loadShippedOrdersGlobal function not found on window."); }
        }
    } else {
        console.error(`UI: Page with ID "${pageId}" not found in HTML. Defaulting to dashboard.`);
        const dashboardFallback = document.getElementById('dashboardPage');
        if (dashboardFallback) {
            dashboardFallback.classList.remove('hidden');
            dashboardFallback.classList.add('current-page');
            if (window.currentUserFromAuth && typeof window.loadDashboardDataGlobal === 'function') {
                 if (typeof window.updateCurrentDateOnDashboardGlobal === 'function') window.updateCurrentDateOnDashboardGlobal();
                const dateFilter = document.getElementById('dashboardDateFilter');
                const startInput = document.getElementById('dateFilterStart');
                const endInput = document.getElementById('dateFilterEnd');
                window.loadDashboardDataGlobal('all', '', dateFilter ? dateFilter.value : 'today', startInput ? startInput.value : null, endInput ? endInput.value : null);
                if (typeof window.updateDashboardVisibilityForRoleGlobal === 'function') window.updateDashboardVisibilityForRoleGlobal();
            }
        } else { console.error("UI: Dashboard fallback page also not found! Critical HTML missing."); }
    }
    updateBottomNavActiveState(pageId);
}

export function updateBottomNavActiveState(currentPageId) {
    if (!bottomNavContainerDiv) { console.warn("Bottom nav container not ready for state update."); return; }
    const navButtons = bottomNavContainerDiv.querySelectorAll('button');
    navButtons.forEach(btn => { btn.classList.toggle('active', btn.dataset.pageid === currentPageId); });
}

export function setupRoleBasedUI(currentUserRoleForNav) {
    if (!bottomNavContainerDiv) { console.error("Bottom Nav Container not found in setupRoleBasedUI."); return; }
    bottomNavContainerDiv.innerHTML = '';

    const navItems = [
        { pageId: 'dashboardPage', icon: 'home', label: 'Dashboard', roles: ['administrator','operator','supervisor'] },
        { pageId: 'adminCreateOrderPage', icon: 'add', label: 'สร้างออเดอร์', roles: ['administrator','supervisor'] },
        { pageId: 'operatorTaskListPage', icon: 'inventory_2', label: 'รายการรอแพ็ก', roles: ['administrator','operator','supervisor'] },
        { pageId: 'supervisorPackCheckListPage', icon: 'checklist', label: 'รอตรวจแพ็ก', roles: ['administrator','supervisor'] },
        { pageId: 'operatorShippingBatchPage', icon: 'local_shipping', label: 'เตรียมส่งของ', roles: ['administrator','operator','supervisor'] },
        { pageId: 'shippedOrdersPage', icon: 'check_circle', label: 'ส่งแล้ว', roles: ['administrator','operator','supervisor'] },
        { pageId: 'parcelListPage', icon: 'list', label: 'พัสดุทั้งหมด', roles: ['administrator','supervisor'] },
    ];

    const allowedItems = navItems.filter(item => item.roles.includes(currentUserRoleForNav));
    const navHtml = allowedItems.map(item =>
        `<button type="button" data-pageid="${item.pageId}"><span class="material-icons nav-icon">${item.icon}</span>${item.label}<span id="${item.pageId}Badge" class="nav-badge hidden"></span></button>`
    ).join('');

    bottomNavContainerDiv.innerHTML = navHtml;

    bottomNavContainerDiv.querySelectorAll('button[data-pageid]').forEach(btn => {
        const pageId = btn.dataset.pageid;
        btn.addEventListener('click', () => {
            console.log("UI: Nav button clicked, attempting to show page:", pageId);
            showPage(pageId);
        });
    });
}

export function setNavBadgeCount(pageId, count) {
    if (!bottomNavContainerDiv) return;
    const badgeEl = bottomNavContainerDiv.querySelector(`#${pageId}Badge`);
    if (!badgeEl) return;
    if (count > 0) {
        badgeEl.textContent = count;
        badgeEl.classList.remove('hidden');
    } else {
        badgeEl.textContent = '';
        badgeEl.classList.add('hidden');
    }
}

// Expose uiElements globally for modules that expect it without importing
window.uiElements = uiElements;
window.setNavBadgeCount = setNavBadgeCount;
