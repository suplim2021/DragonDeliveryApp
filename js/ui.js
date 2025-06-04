// js/ui.js
import { setDefaultDueDate as utilSetDefaultDueDate } from './utils.js';

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

    console.log("Core DOM elements for UI initialized (ui.js)");
    // No need to populate a large global uiElements object here for other modules
}

export function showPage(pageId) {
    if (!allPagesNodeList || allPagesNodeList.length === 0) {
        console.error("Pages NodeList not initialized for showPage. Call initializeCoreDOMElements first.");
        // Attempt to re-initialize if called too early (though ideally main.js handles order)
        if (!allPagesNodeList) allPagesNodeList = document.querySelectorAll('.page');
        if (!allPagesNodeList || allPagesNodeList.length === 0) return;
    }
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
            if(packageCodeInput) packageCodeInput.readOnly = true;

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
    let navHtml = `<button type="button" data-pageid="dashboardPage">Dashboard</button>`;
    console.log("UI: Setting up nav for role:", currentUserRoleForNav);

    if (currentUserRoleForNav === 'administrator') {
        navHtml += `<button type="button" data-pageid="adminCreateOrderPage">สร้างออเดอร์</button>`;
        navHtml += `<button type="button" data-pageid="operatorTaskListPage">รอแพ็ก (View)</button>`;
        navHtml += `<button type="button" data-pageid="supervisorPackCheckListPage">รอตรวจแพ็ก (View)</button>`;
        navHtml += `<button type="button" data-pageid="operatorShippingBatchPage">เตรียมส่ง (View)</button>`;
    } else if (currentUserRoleForNav === 'operator') {
        navHtml += `<button type="button" data-pageid="operatorTaskListPage">รายการรอแพ็ก</button>`;
        navHtml += `<button type="button" data-pageid="operatorShippingBatchPage">เตรียมส่งของ</button>`;
    } else if (currentUserRoleForNav === 'supervisor') {
        navHtml += `<button type="button" data-pageid="supervisorPackCheckListPage">รอตรวจแพ็ก</button>`;
    }
    
    bottomNavContainerDiv.innerHTML = navHtml;
    bottomNavContainerDiv.querySelectorAll('button[data-pageid]').forEach(btn => {
        btn.addEventListener('click', () => {
             console.log("UI: Nav button clicked, attempting to show page:", btn.dataset.pageid);
             showPage(btn.dataset.pageid);
        });
    });
}