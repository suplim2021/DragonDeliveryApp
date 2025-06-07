// js/utils.js
/**
 * Detects the platform based on the package code.
 * IMPORTANT: This logic needs to be customized based on actual package code formats.
 * @param {string} packageCode - The package code scanned from the QR.
 * @returns {string} - The detected platform name (e.g., "Shopee", "Lazada", "Tiktok") or "Unknown".
 */
export function detectPlatformFromPackageCode(packageCode) {
    if (!packageCode) return "Unknown";
    const code = packageCode.toUpperCase().replace(/\s+/g, ""); // Normalize for easier comparison

    // Shopee codes usually start with TH + digits or the prefix SPX
    if ((code.startsWith("TH") && code.length >= 12) || code.startsWith("SPX")) {
        return "Shopee";
    }

    // Lazada often uses prefixes like LAZ, LEX or LX
    if (code.startsWith("LAZ") || code.includes("LEX") || code.startsWith("LX")) {
        return "Lazada";
    }

    // Tiktok shipments may be handled by J&T or Kerry or contain only digits
    if (
        code.startsWith("JT") ||
        code.startsWith("JTS") ||
        code.startsWith("KER") ||
        /^\d{10,20}$/.test(code)
    ) {
        return "Tiktok";
    }

    // Fallback
    return "Unknown";
}

// ---- Beep Utility Functions ----
function playBeepSequence(times = 1) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < times; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 800;
            osc.connect(gain);
            gain.connect(ctx.destination);
            const startAt = ctx.currentTime + i * 0.25;
            osc.start(startAt);
            osc.stop(startAt + 0.15);
        }
    } catch (e) {
        console.warn('playBeepSequence error:', e);
    }
}

export function beepSuccess() { playBeepSequence(1); }
export function beepError() { playBeepSequence(2); }

/**
 * Sets the default due date for new orders in the adminDueDateInput field.
 * - If current time is 12:00 PM - 11:59 PM, sets to next day.
 * - If current time is 12:00 AM - 11:59 AM, sets to current day.
 * @param {HTMLInputElement} adminDueDateInputElement - The input element for the due date.
 */
export function setDefaultDueDate(adminDueDateInputElement) {
    if (!adminDueDateInputElement) {
        console.warn("setDefaultDueDate: adminDueDateInput element not provided or not found.");
        return;
    }
    const now = new Date();
    const currentHour = now.getHours();
    let defaultDueDate = new Date(now); // Create a new Date object based on current time

    if (currentHour >= 12) { // From 12:00 PM (noon) onwards
        defaultDueDate.setDate(now.getDate() + 1); // Set to the next day
    }
    // If before 12:00 PM, it remains the current day

    // Format date as YYYY-MM-DD in local time for the input type="date"
    adminDueDateInputElement.value = formatDateYYYYMMDD(defaultDueDate);
}

/**
 * Displays a status message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('success', 'error', 'info'). Affects styling.
 * @param {HTMLElement} appStatusElement - The HTML element to display the status.
 */
export function showAppStatus(message, type = 'info', appStatusElement) {
    if (!appStatusElement) {
        console.warn("showAppStatus: appStatusElement not provided.");
        return;
    }
    appStatusElement.textContent = message;
    appStatusElement.className = 'app-status-message'; // Reset base class
    
    if (type === 'success') {
        appStatusElement.classList.add('success'); // Define .success in CSS
    } else if (type === 'error') {
        appStatusElement.classList.add('error');   // Define .error in CSS
        beepError();
    } else {
        appStatusElement.classList.add('info');    // Define .info in CSS
    }
    appStatusElement.classList.remove('hidden');

    // Optionally hide after a few seconds
    // setTimeout(() => { appStatusElement.classList.add('hidden'); }, 5000);
}

// You can add more utility functions here as your app grows
// e.g., formatDate, generateUniqueId, etc.

/**
 * Formats a date value as DD/MM/YYYY using the Gregorian calendar.
 * @param {number|string|Date} dateInput - The date to format.
 * @returns {string} - Formatted date string or 'N/A' if invalid.
 */
export function formatDateDDMMYYYY(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleDateString('en-GB');
}

/**
 * Formats a date value as YYYY-MM-DD using the local timezone.
 * Useful for populating <input type="date"> values.
 * @param {number|string|Date} dateInput - The date to format.
 * @returns {string} - Formatted date string or 'N/A' if invalid.
 */
export function formatDateYYYYMMDD(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d)) return 'N/A';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Translates an order status value to its Thai display label.
 * If the status is not recognised, the original value is returned.
 * @param {string} status - The status value stored in the database
 * @returns {string} - Thai label for the status
 */
export function translateStatusToThai(status) {
    const map = {
        'Adding Items': 'รอเพิ่มสินค้า',
        'Ready to Pack': 'รอแพ็ก',
        'Pending Supervisor Pack Check': 'รอตรวจแพ็ค',
        'Pack Approved': 'ตรวจแพ็คแล้ว',
        'Pack Rejected': 'แพ็คไม่ผ่าน',
        'Ready for Shipment': 'รอส่ง',
        'Shipped - Pending Supervisor Check': 'ส่งแล้ว-รอตรวจ',
        'Shipped': 'ส่งแล้ว',
        'Shipment Approved': 'ตรวจส่งแล้ว'
    };
    return map[status] || status || 'N/A';
}
