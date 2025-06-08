// js/home.js - handles login for the home page
import { initializeAuthEventListeners, onAuthStateChangeHandler } from './auth.js';

function setCurrentUserAndUpdateUI(user, role, displayName) {
    const loginPage = document.getElementById('loginPage');
    const mainApp = document.getElementById('mainApp');
    const userEmail = document.getElementById('userDisplayEmail');
    const userName = document.getElementById('userDisplayName');
    const userRole = document.getElementById('userDisplayRole');

    if (!loginPage || !mainApp || !userEmail || !userName || !userRole) {
        console.error('Required elements missing in setCurrentUserAndUpdateUI');
        return;
    }

    if (user) {
        userEmail.textContent = user.email;
        userName.textContent = displayName || user.displayName || '';
        userRole.textContent = role || '';
        loginPage.classList.add('hidden');
        mainApp.classList.remove('hidden');
    } else {
        userEmail.textContent = '';
        userName.textContent = '';
        userRole.textContent = '';
        mainApp.classList.add('hidden');
        loginPage.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAuthEventListeners();
    onAuthStateChangeHandler(setCurrentUserAndUpdateUI);
});
