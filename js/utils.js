// js/utils.js
/**
 * Detects the platform based on the package code.
 * IMPORTANT: This logic needs to be customized based on actual package code formats.
 * @param {string} packageCode - The package code scanned from the QR.
 * @returns {string} - The detected platform name (e.g., "Shopee", "Lazada", "Tiktok") or "Unknown".
 */
export function detectPlatformFromPackageCode(packageCode) {
    if (!packageCode) return "Unknown";
    const code = packageCode.toUpperCase(); // Normalize to uppercase for easier comparison

    // --- Example Platform Detection Logic (NEEDS CUSTOMIZATION) ---
    if ((code.startsWith("TH") && code.length >= 12) || code.startsWith("SPX")) {
        // Example: Shopee or SPX Express often starts with TH followed by many digits, or SPX
        return "Shopee";
    } else if (code.includes("LEX") || code.startsWith("LX")) {
        // Example: Lazada Express often contains LEX or starts with LX
        return "Lazada";
    } else if (code.startsWith("JT") || code.startsWith("JTS") || code.startsWith("KER")) {
        // Example: J&T Express or Kerry (often used by Tiktok or other platforms)
        // You might want to differentiate further if needed
        return "Tiktok"; // Or "J&T", "Kerry"
    }
    // Add more conditions for other platforms/couriers you use
    // --- End Example Platform Detection Logic ---

    return "Unknown"; // Default if no specific pattern matches
}

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

    // Format date as YYYY-MM-DD for the input type="date"
    adminDueDateInputElement.value = defaultDueDate.toISOString().slice(0, 10);
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
    } else {
        appStatusElement.classList.add('info');    // Define .info in CSS
    }
    appStatusElement.classList.remove('hidden');

    // Optionally hide after a few seconds
    // setTimeout(() => { appStatusElement.classList.add('hidden'); }, 5000);
}

// You can add more utility functions here as your app grows
// e.g., formatDate, generateUniqueId, etc.