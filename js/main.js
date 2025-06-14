// js/main.js
import { auth, database, storage } from './config.js';
import { initializeAuthEventListeners, onAuthStateChangeHandler } from './auth.js';
// initializeCoreDOMElements is from ui.js, showPage and setupRoleBasedUI are also from ui.js
import { initializeCoreDOMElements, showPage, setupRoleBasedUI } from './ui.js'; 
// No need to import uiElements object from ui.js anymore if modules get their own elements

import { initializeAdminOrderPageListeners } from './adminOrderPage.js';
import { initializeAdminItemsPageListeners, loadOrderForAddingItems } from './adminItemsPage.js';
import { initializeOperatorPackingPageListeners, loadOrderForPacking as operatorLoadOrderForPacking } from './operatorPackingPage.js';
import { initializeDashboardPageListeners, updateCurrentDateOnDashboard, loadDashboardData, startDashboardRealtime, stopDashboardRealtime, updateDashboardVisibilityForRole } from './dashboardPage.js';
import { initializeSupervisorPackCheckListeners, loadOrdersForPackCheck } from './supervisorPackCheckPage.js';
import { initializeOperatorTasksPageListeners, loadOperatorPendingTasks } from './operatorTasksPage.js';
import { initializeOperatorShippingPageListeners, setupShippingBatchPage, updateBatchIdVisibilityForRole } from './operatorShippingPage.js';
import { initializeShippedOrdersPageListeners, loadShippedOrders } from './shippedOrdersPage.js';
import { initializeAdminParcelListPageListeners, loadParcelList } from './adminParcelListPage.js';
import { initializeAdminParcelDetailPageListeners, loadParcelDetail } from './adminParcelDetailPage.js';
import { initializeImageLightbox, showImageAlbum } from './utils.js';

window.currentUserFromAuth = null; 
window.currentUserRoleFromAuth = null;

function setCurrentUserAndUpdateUI(user, role, displayName) {
    window.currentUserFromAuth = user;
    window.currentUserRoleFromAuth = role;
    window.currentUserDisplayNameFromAuth = displayName;
    console.log("User state updated in main.js: User:", user ? user.email : null, "Role:", role, "Name:", displayName);
    
    // Get global UI elements directly here if needed, or assume ui.js handles its own global elements
    const userDisplayNameEl = document.getElementById('userDisplayName');
    const userDisplayEmailEl = document.getElementById('userDisplayEmail');
    const userDisplayRoleEl = document.getElementById('userDisplayRole');
    const loginPageEl = document.getElementById('loginPage');
    const mainAppEl = document.getElementById('mainApp');
    const bottomNavContainerEl = document.getElementById('bottomNavContainer');

    if (userDisplayEmailEl && userDisplayRoleEl && userDisplayNameEl && mainAppEl) {
        if (user) {
            userDisplayEmailEl.textContent = user.email;
            userDisplayRoleEl.textContent = role || 'N/A';
            if (userDisplayNameEl) userDisplayNameEl.textContent = displayName || user.displayName || '';
            if (loginPageEl) loginPageEl.classList.add('hidden');
            mainAppEl.classList.remove('hidden');
            if (bottomNavContainerEl) {
                bottomNavContainerEl.classList.remove('hidden');
                setupRoleBasedUI(role);
            }
            startDashboardRealtime();
            showPage('dashboardPage');
        } else {
            userDisplayEmailEl.textContent = '';
            userDisplayRoleEl.textContent = '';
            if (userDisplayNameEl) userDisplayNameEl.textContent = '';
            mainAppEl.classList.add('hidden');
            if (bottomNavContainerEl) {
                bottomNavContainerEl.classList.add('hidden');
                bottomNavContainerEl.innerHTML = '';
            }
            stopDashboardRealtime();
            if (loginPageEl) {
                loginPageEl.classList.remove('hidden');
            } else {
                console.warn('Login page not found, redirecting to home.');
                window.location.href = 'index.html';
            }
            console.log("UI reset for login state (main.js).");
        }
    } else {
        console.error("Core UI elements missing in setCurrentUserAndUpdateUI. Check IDs.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed (main.js)");
    initializeCoreDOMElements(); // Initialize core UI elements needed by ui.js itself
    
    onAuthStateChangeHandler(setCurrentUserAndUpdateUI);
    
    // Initialize event listeners for all components/pages
    // These modules will now query their own DOM elements internally
    initializeAuthEventListeners(); 
    initializeAdminOrderPageListeners();
    initializeAdminItemsPageListeners();
    initializeOperatorPackingPageListeners();
    initializeDashboardPageListeners();
    initializeSupervisorPackCheckListeners();
    initializeOperatorTasksPageListeners();
    initializeOperatorShippingPageListeners();
    initializeShippedOrdersPageListeners();
    initializeAdminParcelListPageListeners();
    initializeAdminParcelDetailPageListeners();
    initializeImageLightbox();
    
    console.log("Initial event listeners set up (main.js)");

    // Expose page-specific load/setup functions to be callable from ui.js's showPage via window object
    window.updateCurrentDateOnDashboardGlobal = updateCurrentDateOnDashboard;
    window.loadDashboardDataGlobal = loadDashboardData;
    window.updateDashboardVisibilityForRoleGlobal = updateDashboardVisibilityForRole;
    window.loadOrdersForPackCheckGlobal = loadOrdersForPackCheck;
    window.loadOperatorPendingTasksGlobal = loadOperatorPendingTasks;
    window.setupShippingBatchPageGlobal = setupShippingBatchPage;
    window.loadShippedOrdersGlobal = loadShippedOrders;
    window.updateBatchIdVisibilityForRoleGlobal = updateBatchIdVisibilityForRole;
    window.loadParcelListGlobal = loadParcelList;
    window.loadParcelDetail = loadParcelDetail;
    window.loadOrderForPacking = operatorLoadOrderForPacking;
    window.loadOrderForAddingItems = loadOrderForAddingItems;
    window.showImageAlbum = showImageAlbum;

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('bottomNavContainer');
        if (!nav) return;
        const doc = document.documentElement;
        const scrollHeight = Math.max(doc.scrollHeight, document.body.scrollHeight);
        const canScroll = scrollHeight > window.innerHeight + 1;
        const atBottom = window.innerHeight + window.pageYOffset >= scrollHeight - 1;
        if (canScroll && atBottom) {
            nav.classList.add('hide');
        } else {
            nav.classList.remove('hide');
        }
    });
});

export { auth, database, storage };
