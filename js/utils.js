// js/utils.js
/**
 * Detects the platform based on the package code.
 * IMPORTANT: This logic needs to be customized based on actual package code formats.
 * @param {string} packageCode - The package code scanned from the QR.
 * @returns {string} - The detected platform name (e.g., "Shopee", "Lazada", "Tiktok") or "Other".
 */
export function detectPlatformFromPackageCode(packageCode) {
    if (!packageCode) return "Other";
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

    // Fallback for any other platform
    return "Other";
}

// ---- Scan Feedback Utility Functions ----
let toastTimer;
export function showToast(message, type = 'info', duration = 3000) {
    let toastEl = document.getElementById('toast');
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'toast';
        toastEl.className = 'toast';
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
    }, duration);
}

export function beepSuccess() {
    showToast('การอ่านค่าสำเร็จ', 'success', 1500);
}

export function beepError() {
    // No sound; reserved for future visual feedback if needed
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
 * Formats a date value as DD/MM/YYYY HH:mm in local time.
 * Useful for displaying order creation timestamps.
 * @param {number|string|Date} dateInput - The date to format.
 * @returns {string} - Formatted date+time string or 'N/A' if invalid.
 */
export function formatDateTimeDDMMYYYYHHMM(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d)) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Translates an order status value to its Thai display label.
 * If the status is not recognised, the original value is returned.
 * @param {string} status - The status value stored in the database
 * @returns {string} - Thai label for the status
 */
export function translateStatusToThai(status, adminVerified = false) {
    if (status === 'Shipped' && adminVerified) {
        return 'เสร็จสิ้น';
    }
    const map = {
        'Adding Items': 'รอเพิ่มสินค้า',
        'Ready to Pack': 'รอแพ็ก',
        'Pending Supervisor Pack Check': 'รอตรวจแพ็ค',
        'Pack Approved': 'ตรวจแพ็คแล้ว',
        'Pack Rejected': 'แพ็คไม่ผ่าน',
        'Ready for Shipment': 'รอส่ง',
        'Shipped - Pending Supervisor Check': 'ส่งแล้ว-รอตรวจ',
        'Shipped': 'ส่งแล้ว',
        'Shipment Approved': 'เสร็จสิ้น'
    };
    return map[status] || status || 'N/A';
}

// ----- Additional Utilities -----

/**
 * Generates a timestamp string suitable for filenames.
 * Format: YYYYMMDD_HHmmssSSS (local time)
 * @param {Date} [date=new Date()] - Date object to format.
 * @returns {string} - Formatted timestamp string.
 */
export function getTimestampForFilename(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}${month}${day}_${hour}${minute}${second}${ms}`;
}

/**
 * Resizes an image file if its width or height exceeds the given max dimension.
 * Returns the original file if no resizing is needed or resizing fails.
 *
 * @param {File} file - Image file to resize.
 * @param {number} [maxDim=1000] - Maximum width or height in pixels.
 * @returns {Promise<File>} - Promise resolving to the resized File object.
 */
export function resizeImageFileIfNeeded(file, maxDim = 1000) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width <= maxDim && height <= maxDim) {
                resolve(file);
                return;
            }
            const scale = Math.min(maxDim / width, maxDim / height);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                resolve(new File([blob], file.name, { type: file.type || 'image/jpeg' }));
            }, file.type || 'image/jpeg', 0.9);
        };
        img.onerror = () => resolve(file);
        img.src = URL.createObjectURL(file);
    });
}

// ----- Lightbox utility -----
export function initializeImageLightbox() {
    let overlay = document.getElementById('lightboxOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lightboxOverlay';
        overlay.className = 'lightbox-overlay hidden';
        const img = document.createElement('img');
        img.id = 'lightboxImage';
        overlay.appendChild(img);
        document.body.appendChild(overlay);
    }
    overlay.addEventListener('click', () => {
        overlay.classList.add('hidden');
        const img = overlay.querySelector('img');
        if (img) img.src = '#';
    });
    document.body.addEventListener('click', e => {
        const target = e.target;
        if (target && target.classList.contains('lightbox-thumb')) {
            const src = target.dataset.full || target.src;
            const img = overlay.querySelector('img');
            if (img) img.src = src;
            overlay.classList.remove('hidden');
        }
    });
}
