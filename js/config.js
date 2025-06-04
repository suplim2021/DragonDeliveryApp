// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// !!!!!!!!!! ใส่ FIREBASE CONFIG ของคุณจริงๆ ตรงนี้ !!!!!!!!!!
const firebaseConfig = {
    apiKey: "AIzaSyAGWAYD5mvDsyyY4IovRjYUYPpj7WLUrFE",
    authDomain: "dragondeliveryapp.firebaseapp.com",
    databaseURL: "https://dragondeliveryapp-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dragondeliveryapp",
    storageBucket: "dragondeliveryapp.firebasestorage.app",
    messagingSenderId: "912014929398",
    appId: "1:912014929398:web:8488118a158c0d8d936bd7"

    // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};
// !!!!!!!!!! สิ้นสุด FIREBASE CONFIG !!!!!!!!!!

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { auth, database, storage, app };