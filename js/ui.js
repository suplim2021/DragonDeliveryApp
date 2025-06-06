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

    uiElements.createNewBatchButton = document.getElementById('createNewBatchButton');
    uiElements.startScanForBatchButton = document.getElementById('startScanForBatchButton');
    uiElements.stopScanForBatchButton = document.getElementById('stopScanForBatchButton');
    uiElements.confirmBatchAndProceedButton = document.getElementById('confirmBatchAndProceedButton');
    uiElements.courierSelect = document.getElementById('courierSelect');
    uiElements.otherCourierInput = document.getElementById('otherCourierInput');
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
    uiElements.getGpsButton = document.getElementById('getGpsButton');
    uiElements.shipmentGpsLocationDisplay = document.getElementById('shipmentGpsLocationDisplay');
    uiElements.finalizeShipmentButton = document.getElementById('finalizeShipmentButton');

    uiElements.refreshSupervisorPackCheckList = document.getElementById('refreshSupervisorPackCheckList');
    uiElements.packCheckListContainer = document.getElementById('packCheckListContainer');
    uiElements.noPackCheckOrdersMessage = document.getElementById('noPackCheckOrdersMessage');
    uiElements.approvePackButton = document.getElementById('approvePackButton');
    uiElements.rejectPackButton = document.getElementById('rejectPackButton');
    uiElements.checkOrderPackageCodeDisplay = document.getElementById('checkOrderPackageCodeDisplay');
    uiElements.checkOrderPlatformDisplay = document.getElementById('checkOrderPlatformDisplay');
    uiElements.checkOrderItemListDisplay = document.getElementById('checkOrderItemListDisplay');
    uiElements.checkOrderPackingPhotoDisplay = document.getElementById('checkOrderPackingPhotoDisplay');
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
            const addItemsSection = document.getElementById('adminAddItemsSection');
            if(addItemsSection) addItemsSection.classList.add('hidden');

        } else if (pageId === 'dashboardPage') {
            if (window.currentUserFromAuth) {
                if (typeof window.updateCurrentDateOnDashboardGlobal === 'function') window.updateCurrentDateOnDashboardGlobal();
                const filterSelect = document.getElementById('logFilterStatus');
                if (typeof window.loadDashboardDataGlobal === 'function') {
                    window.loadDashboardDataGlobal(filterSelect ? filterSelect.value : 'all');
                } else { console.error("loadDashboardDataGlobal function not found on window."); }
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
        }
    } else {
        console.error(`UI: Page with ID "${pageId}" not found in HTML. Defaulting to dashboard.`);
        const dashboardFallback = document.getElementById('dashboardPage');
        if (dashboardFallback) {
            dashboardFallback.classList.remove('hidden');
            dashboardFallback.classList.add('current-page');
            if (window.currentUserFromAuth && typeof window.loadDashboardDataGlobal === 'function') {
                 if (typeof window.updateCurrentDateOnDashboardGlobal === 'function') window.updateCurrentDateOnDashboardGlobal();
                window.loadDashboardDataGlobal('all');
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
    let navHtml = '';
    navHtml += `<button type="button" data-pageid="dashboardPage"><span class="nav-icon">🏠</span>Dashboard</button>`;
    navHtml += `<button type="button" data-pageid="adminCreateOrderPage"><span class="nav-icon">➕</span>สร้างออเดอร์</button>`;
    navHtml += `<button type="button" data-pageid="operatorTaskListPage"><span class="nav-icon">📦</span>รายการรอแพ็ก</button>`;
    navHtml += `<button type="button" data-pageid="supervisorPackCheckListPage"><span class="nav-icon">✅</span>รอตรวจแพ็ก</button>`;
    navHtml += `<button type="button" data-pageid="operatorShippingBatchPage"><span class="nav-icon">🚚</span>เตรียมส่งของ</button>`;

    bottomNavContainerDiv.innerHTML = navHtml;

    bottomNavContainerDiv.querySelectorAll('button[data-pageid]').forEach(btn => {
        const pageId = btn.dataset.pageid;
        // Disable buttons based on role
        if (currentUserRoleForNav === 'operator') {
            if (pageId === 'adminCreateOrderPage' || pageId === 'supervisorPackCheckListPage') btn.disabled = true;
        } else if (currentUserRoleForNav === 'supervisor') {
            if (pageId === 'adminCreateOrderPage' || pageId === 'operatorShippingBatchPage') btn.disabled = true;
        } else if (currentUserRoleForNav !== 'administrator') {
            // Unknown role: disable everything except dashboard
            if (pageId !== 'dashboardPage') btn.disabled = true;
        }

        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                console.log("UI: Nav button clicked, attempting to show page:", pageId);
                showPage(pageId);
            }
        });
    });
}

// Expose uiElements globally for modules that expect it without importing
window.uiElements = uiElements;
