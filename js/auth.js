// js/auth.js
import { auth, database } from './config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


let localCurrentUser = null;
let localCurrentUserRole = null;
let localCurrentDisplayName = null;
let updateMainCurrentUserCallback = null;

// DOM Elements specific to auth - get them when module initializes listeners
let authLoginPage, authMainApp, authLoginButton, authEmailInput, authPasswordInput, authLoginError,
    authUserDisplayEmail, authUserDisplayRole, authUserDisplayName, authLogoutButton, authAppStatus, authBottomNavContainer;


export function initializeAuthEventListeners() {
    // Query for elements specific to auth functionality
    authLoginPage = document.getElementById('loginPage');
    authMainApp = document.getElementById('mainApp');
    authLoginButton = document.getElementById('loginButton');
    authEmailInput = document.getElementById('email');
    authPasswordInput = document.getElementById('password');
    authLoginError = document.getElementById('loginError');
    authUserDisplayEmail = document.getElementById('userDisplayEmail');
    authUserDisplayRole = document.getElementById('userDisplayRole');
    authUserDisplayName = document.getElementById('userDisplayName');
    authLogoutButton = document.getElementById('logoutButton');
    authAppStatus = document.getElementById('appStatus');
    authBottomNavContainer = document.getElementById('bottomNavContainer');


    if (!authLoginButton || !authLogoutButton || !authEmailInput || !authPasswordInput || !authLoginError || !authAppStatus) {
        console.error("Auth related DOM elements not found during listener setup in auth.js!");
        return;
    }

    authLoginButton.addEventListener('click', () => {
        const emailValue = authEmailInput.value.trim();
        const passwordValue = authPasswordInput.value;
        
        if (!emailValue || !passwordValue) {
            authLoginError.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
            authLoginError.classList.remove('hidden');
            return;
        }
        authAppStatus.textContent = "กำลังเข้าสู่ระบบ...";
        authLoginButton.disabled = true;

        signInWithEmailAndPassword(auth, emailValue, passwordValue)
            .then((userCredential) => {
                console.log("signInWithEmailAndPassword successful", userCredential);
                authLoginError.classList.add('hidden');
                authAppStatus.textContent = "";
                // onAuthStateChanged will handle UI changes via callback to main.js
            })
            .catch((error) => {
                console.error("signInWithEmailAndPassword error:", error.code, error.message);
                let friendlyMessage = `Error: ${error.message} (Code: ${error.code})`;
                 if (error.code === 'auth/invalid-email' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    friendlyMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                }
                authLoginError.textContent = friendlyMessage;
                authLoginError.classList.remove('hidden');
                authAppStatus.textContent = "";
            }).finally(() => {
                authLoginButton.disabled = false;
            });
    });

    authLogoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("User signed out from auth.js.");
            if(authAppStatus) authAppStatus.textContent = "ออกจากระบบแล้ว";
            // onAuthStateChanged will handle UI changes via callback to main.js
        }).catch(error => {
            console.error("Sign out error", error);
            if(authAppStatus) authAppStatus.textContent = "Error signing out.";
        });
    });
}

export function onAuthStateChangeHandler(mainUserUpdateCb) {
    updateMainCurrentUserCallback = mainUserUpdateCb; // This callback is crucial
    onAuthStateChanged(auth, async (user) => {
        // DOM elements needed within onAuthStateChanged are already queried in initializeAuthEventListeners
        // and stored in auth-module-scoped variables like authLoginError.

        if (user) {
            localCurrentUser = user;
            const userRefDb = ref(database, 'users/' + user.uid);
            try {
                const snapshot = await get(userRefDb);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    localCurrentUserRole = data.role || 'unknown';
                    localCurrentDisplayName = data.displayName || user.displayName || '';
                } else {
                    localCurrentUserRole = 'unknown';
                    localCurrentDisplayName = user.displayName || '';
                    console.warn(`Role not found for UID: ${user.uid}. Consider setting a default role.`);
                }

                if (updateMainCurrentUserCallback) {
                    updateMainCurrentUserCallback(localCurrentUser, localCurrentUserRole, localCurrentDisplayName);
                } else {
                    console.error("updateMainCurrentUserCallback is not defined in auth.js onAuthStateChangeHandler");
                }

            } catch (dbError) {
                console.error("Error fetching user role from Database:", dbError);
                if (authLoginError) { // Use the locally scoped authLoginError
                    authLoginError.textContent = "Error fetching user data. Logging out.";
                    authLoginError.classList.remove('hidden');
                }
                signOut(auth); // Sign out if fetching role fails
            }
        } else { // User is signed out
            localCurrentUser = null;
            localCurrentUserRole = null;
            localCurrentDisplayName = null;
            if (updateMainCurrentUserCallback) {
                updateMainCurrentUserCallback(null, null, null); // Notify main.js that user is signed out
            }
        }
    });
}

export function getCurrentUserRole() {
    return localCurrentUserRole;
}

export function getCurrentUser() {
    return localCurrentUser;
}

export function getCurrentUserDisplayName() {
    return localCurrentDisplayName;
}