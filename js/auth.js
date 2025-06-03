// js/auth.js
import { auth, database } from './config.js'; // Firebase services
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { uiElements, showPage, setupRoleBasedUI } from './ui.js'; // UI elements and functions

let localCurrentUser = null;
let localCurrentUserRole = null;
let updateMainCurrentUserCallback = null; // Callback to update user in main.js

export function initializeAuthEventListeners() {
    if (!uiElements.loginButton || !uiElements.logoutButton || !uiElements.emailInput || !uiElements.passwordInput || !uiElements.loginError || !uiElements.appStatus) {
        console.error("Auth related DOM elements not found during listener setup!");
        return;
    }

    uiElements.loginButton.addEventListener('click', () => {
        console.log("Login button clicked from auth.js!");
        const emailValue = uiElements.emailInput.value.trim();
        const passwordValue = uiElements.passwordInput.value; // Don't trim password

        console.log("Email value from input:", emailValue);
        console.log("Password value from input set:", passwordValue ? "Yes" : "No (Empty)");

        if (!emailValue || !passwordValue) {
            uiElements.loginError.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
            uiElements.loginError.classList.remove('hidden');
            console.warn("Email or Password field is empty.");
            return;
        }
        
        uiElements.appStatus.textContent = "กำลังเข้าสู่ระบบ...";
        uiElements.loginButton.disabled = true;

        signInWithEmailAndPassword(auth, emailValue, passwordValue)
            .then((userCredential) => {
                console.log("signInWithEmailAndPassword successful, userCredential:", userCredential);
                // onAuthStateChanged will handle UI and role fetching
                uiElements.loginError.classList.add('hidden');
                uiElements.appStatus.textContent = ""; // Clear status
            })
            .catch((error) => {
                console.error("signInWithEmailAndPassword error in auth.js:", error.code, error.message);
                let friendlyMessage = `Error: ${error.message} (Code: ${error.code})`;
                if (error.code === 'auth/invalid-email' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    friendlyMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                }
                uiElements.loginError.textContent = friendlyMessage;
                uiElements.loginError.classList.remove('hidden');
                uiElements.appStatus.textContent = ""; // Clear status
            }).finally(() => {
                uiElements.loginButton.disabled = false;
            });
    });

    uiElements.logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("User signed out from auth.js.");
            uiElements.appStatus.textContent = "ออกจากระบบแล้ว";
            // onAuthStateChanged will handle UI reset
        }).catch(error => {
            console.error("Sign out error in auth.js", error);
            uiElements.appStatus.textContent = "Error signing out.";
        });
    });
}

export function onAuthStateChangeHandler(mainUserUpdateCallback) {
    updateMainCurrentUserCallback = mainUserUpdateCallback;

    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered in auth.js. User object:", user);
        if (user) {
            localCurrentUser = user;
            const userRoleRef = ref(database, 'users/' + user.uid + '/role');
            console.log("Attempting to fetch role for UID:", user.uid, "from path:", `users/${user.uid}/role`);
            try {
                const snapshot = await get(userRoleRef);
                if (snapshot.exists()) {
                    localCurrentUserRole = snapshot.val();
                    console.log("Role fetched successfully in auth.js:", localCurrentUserRole);
                } else {
                    localCurrentUserRole = 'unknown'; // Default if not found
                    console.warn("Role not found for UID:", user.uid, "- User might be new or role not set in DB.");
                    // You might want to set a default role for new users here, e.g., 'operator'
                    // await set(ref(database, `users/${user.uid}`), { email: user.email, role: 'operator', displayName: user.email.split('@')[0] });
                    // localCurrentUserRole = 'operator';
                }

                if (updateMainCurrentUserCallback) {
                    updateMainCurrentUserCallback(localCurrentUser, localCurrentUserRole);
                }

                if (uiElements.userDisplayEmail) uiElements.userDisplayEmail.textContent = user.email;
                if (uiElements.userDisplayRole) uiElements.userDisplayRole.textContent = localCurrentUserRole;
                
                uiElements.loginPage.classList.add('hidden');
                uiElements.mainApp.classList.remove('hidden');
                uiElements.bottomNavContainer.classList.remove('hidden');
                
                setupRoleBasedUI(localCurrentUserRole); // Pass role to setup UI navigation
                showPage('dashboardPage'); // Show dashboard by default after login

            } catch (dbError) {
                console.error("Error fetching user role from Database in auth.js:", dbError);
                if (uiElements.loginError) {
                    uiElements.loginError.textContent = "Error fetching user data. Logging out.";
                    uiElements.loginError.classList.remove('hidden');
                }
                signOut(auth); // Sign out the user if role fetching fails
            }
        } else { // User is signed out
            localCurrentUser = null;
            localCurrentUserRole = null;
            if (updateMainCurrentUserCallback) {
                updateMainCurrentUserCallback(null, null);
            }

            if (uiElements.loginPage) uiElements.loginPage.classList.remove('hidden');
            if (uiElements.mainApp) uiElements.mainApp.classList.add('hidden');
            if (uiElements.bottomNavContainer) {
                uiElements.bottomNavContainer.classList.add('hidden');
                uiElements.bottomNavContainer.innerHTML = ''; // Clear nav
            }
            console.log("User is signed out. UI reset for login (from auth.js).");
        }
    });
}

// Function to get current user's role, might be useful for other modules
export function getCurrentUserRole() {
    return localCurrentUserRole;
}
export function getCurrentUser() {
    return localCurrentUser;
}