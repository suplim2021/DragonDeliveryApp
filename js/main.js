// js/main.js
import { auth, database, storage } from './config.js';
import { initializeAuthEventListeners, onAuthStateChangeHandler } from './auth.js';
// initializeCoreDOMElements is from ui.js, showPage and setupRoleBasedUI are also from ui.js
import { initializeCoreDOMElements, showPage, setupRoleBasedUI } from './ui.js'; 
// No need to import uiElements object from ui.js anymore if modules get their own elements

import { initializeAdminOrderPageListeners } from './adminOrderPage.js';
import { initializeAdminItemsPageListeners, loadOrderForAddingItems } from './adminItemsPage.js';
import { initializeOperatorPackingPageListeners, loadOrderForPacking as operatorLoadOrderForPacking } from './operatorPackingPage.js';
import { initializeDashboardPageListeners, updateCurrentDateOnDashboard, loadDashboardData } from './dashboardPage.js';
import { initializeSupervisorPackCheckListeners, loadOrdersForPackCheck } from './supervisorPackCheckPage.js';
import { initializeOperatorTasksPageListeners, loadOperatorPendingTasks } from './operatorTasksPage.js';
import { initializeOperatorShippingPageListeners, setupShippingBatchPage } from './operatorShippingPage.js'; 

window.currentUserFromAuth = null; 
window.currentUserRoleFromAuth = null;

function setCurrentUserAndUpdateUI(user, role) {
    window.currentUserFromAuth = user;
    window.currentUserRoleFromAuth = role;
    console.log("User state updated in main.js: User:", user ? user.email : null, "Role:", role);
    
    // Get global UI elements directly here if needed, or assume ui.js handles its own global elements
    const userDisplayEmailEl = document.getElementById('userDisplayEmail');
    const userDisplayRoleEl = document.getElementById('userDisplayRole');
    const loginPageEl = document.getElementById('loginPage');
    const mainAppEl = document.getElementById('mainApp');
    const bottomNavContainerEl = document.getElementById('bottomNavContainer');

    if (userDisplayEmailEl && userDisplayRoleEl && loginPageEl && mainAppEl && bottomNavContainerEl) {
        if (user) { 
            userDisplayEmailEl.textContent = user.email;
            userDisplayRoleEl.textContent = role || 'N/A';
            loginPageEl.classList.add('hidden');
            mainAppEl.classList.remove('hidden');
            bottomNavContainerEl.classList.remove('hidden');
            setupRoleBasedUI(role); // This function is imported from ui.js and uses its own DOM knowledge
            showPage('dashboardPage'); // This function is imported from ui.js
        } else { 
            userDisplayEmailEl.textContent = '';
            userDisplayRoleEl.textContent = '';
            mainAppEl.classList.add('hidden');
            bottomNavContainerEl.classList.add('hidden');
            if(bottomNavContainerEl) bottomNavContainerEl.innerHTML = ''; // Check if exists
            loginPageEl.classList.remove('hidden');
            console.log("UI reset for login page (main.js).");
        }
    } else {
        console.error("Core UI elements for login/logout state missing in setCurrentUserAndUpdateUI. Check IDs.");
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
    
    console.log("Initial event listeners set up (main.js)");

    // Expose page-specific load/setup functions to be callable from ui.js's showPage via window object
    window.updateCurrentDateOnDashboardGlobal = updateCurrentDateOnDashboard;
    window.loadDashboardDataGlobal = loadDashboardData;
    window.loadOrdersForPackCheckGlobal = loadOrdersForPackCheck;
    window.loadOperatorPendingTasksGlobal = loadOperatorPendingTasks;
    window.setupShippingBatchPageGlobal = setupShippingBatchPage;
    window.loadOrderForPacking = operatorLoadOrderForPacking;
    window.loadOrderForAddingItems = loadOrderForAddingItems;
});

export { auth, database, storage };
