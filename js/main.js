// js/main.js
import { auth, database, storage } from './config.js'; // Import initialized Firebase services
import { initializeAuthEventListeners, onAuthStateChangeHandler } from './auth.js';
import { initializeDOMElements, addEventListeners as addMainEventListeners, showPage } from './ui.js';
import { initializeAdminOrderPageListeners } from './adminOrderPage.js';
import { initializeAdminItemsPageListeners } from './adminItemsPage.js';
import { initializeOperatorPackingPageListeners } from './operatorPackingPage.js';
import { initializeDashboardPageListeners } from './dashboardPage.js';

// Global state variables that might be shared or accessed by multiple modules
// Or they can be managed within their respective modules and exposed via functions if needed
let currentUser = null;
let currentUserRole = null;

// Function to update global currentUser and currentUserRole
// This can be called from auth.js after successful login and role fetch
function setCurrentUser(user, role) {
    currentUser = user;
    currentUserRole = role;
    console.log("Current user set in main.js:", currentUser, "Role:", currentUserRole);
}

// Pass setCurrentUser function to auth module if needed, or auth module can directly update UI elements related to user info
// For simplicity, auth.js will handle UI updates for user info (email, role display)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    initializeDOMElements(); // Initialize all DOM element variables from ui.js
    
    // Initialize authentication state listener (this is crucial)
    onAuthStateChangeHandler(setCurrentUser); // Pass the callback to update user state

    // Add global event listeners (like login, logout which are always present)
    initializeAuthEventListeners(); // Sets up login, logout button listeners

    // Add event listeners specific to different pages/modules
    // These functions will be defined in their respective JS files
    initializeAdminOrderPageListeners();
    initializeAdminItemsPageListeners();
    initializeOperatorPackingPageListeners();
    initializeDashboardPageListeners();

    // Note: Initial page to show (e.g., 'dashboardPage' or 'loginPage')
    // will be handled by onAuthStateChangeHandler based on login status.
});

// Export global state or functions if needed by other modules directly,
// though it's often better to pass them as parameters or use callbacks.
export { currentUser, currentUserRole, setCurrentUser, auth, database, storage };