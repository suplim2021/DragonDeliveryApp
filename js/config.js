// js/config.js

// Firebase SDK imports - Make sure to import all services you use
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
// If you use Firestore, Analytics, etc., import them here as well

// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGWAYD5mvDsyyY4IovRjYUYPpj7WLUrFE",
    authDomain: "dragondeliveryapp.firebaseapp.com",
    projectId: "dragondeliveryapp",
    storageBucket: "dragondeliveryapp.firebasestorage.app",
    messagingSenderId: "912014929398",
    appId: "1:912014929398:web:8488118a158c0d8d936bd7"
    // measurementId: "YOUR_MEASUREMENT_ID" // Optional, for Google Analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
// const analytics = getAnalytics(app); // If you enabled and imported it

// Export the initialized services so other modules can use them
export { auth, database, storage, app }; // Export 'app' if other modules need it directly