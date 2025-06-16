import { database } from './config.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { showPage } from './ui.js';
import { formatDateTimeDDMMYYYYHHMM, formatDateDDMMYYYY, translateStatusToThai } from './utils.js';
import { getCurrentUserRole } from './auth.js';

let currentDetailKey = null;

export function initializeAdminParcelDetailPageListeners() {
    const backBtn = document.getElementById('backToParcelListButton');
    if (backBtn) backBtn.addEventListener('click', () => showPage('parcelListPage'));

    const addItemsBtn = document.getElementById('parcelDetailAddItemsButton');
    if (addItemsBtn) {
        addItemsBtn.addEventListener('click', () => {
            if (currentDetailKey && typeof window.loadOrderForAddingItems === 'function') {
                window.loadOrderForAddingItems(currentDetailKey);
            }
        });
    }
}

export async function loadParcelDetail(orderKey) {
    currentDetailKey = orderKey;
    const appStatus = document.getElementById('appStatus');
    const infoDiv = document.getElementById('parcelDetailInfo');
    const codeSpan = document.getElementById('parcelDetailCode');
    const photoDiv = document.getElementById('parcelDetailPhotos');
    if (!infoDiv || !codeSpan) return;
    if (appStatus) appStatus.textContent = 'กำลังโหลดรายละเอียด...';
    try {
        const snap = await get(ref(database, 'orders/' + orderKey));
        if (snap.exists()) {
            const data = snap.val();
            codeSpan.textContent = data.packageCode || orderKey;
            let html = `
                <p><strong>Platform:</strong> ${data.platform || 'N/A'}</p>
                <p><strong>Platform Order ID:</strong> ${data.platformOrderId || '-'}</p>
                <p><strong>สถานะ:</strong> ${translateStatusToThai(data.status, !!data.shipmentInfo?.adminVerifiedBy)}</p>
                <p><strong>Created:</strong> ${formatDateTimeDDMMYYYYHHMM(data.createdAt)}</p>
                <p><strong>Due Date:</strong> ${formatDateDDMMYYYY(data.dueDate)}</p>
                <p><strong>หมายเหตุ:</strong> ${data.notes || '-'}</p>
            `;
            if (data.items) {
                html += '<h3>รายการสินค้า:</h3><ul>';
                Object.values(data.items).forEach(it => {
                    html += `<li>${it.productName} - ${it.quantity} ${it.unit}</li>`;
                });
                html += '</ul>';
            }
            infoDiv.innerHTML = html;
            if (photoDiv) {
                photoDiv.innerHTML = '';
                const urls = data.packingInfo?.packingPhotoUrls ? [...data.packingInfo.packingPhotoUrls] : [];
                if (urls.length) {
                    urls.forEach((url, idx) => {
                        const img = document.createElement('img');
                        img.src = url;
                        img.alt = `รูปการแพ็ค ${idx + 1}`;
                        img.className = 'lightbox-thumb';
                        img.style.maxWidth = '100px';
                        img.style.marginRight = '5px';
                        img.style.marginBottom = '5px';
                        img.addEventListener('click', () => {
                            if (typeof window.showImageAlbum === 'function') window.showImageAlbum(urls, idx);
                        });
                        photoDiv.appendChild(img);
                    });
                }
            }
            const addItemsBtn = document.getElementById('parcelDetailAddItemsButton');
            const role = getCurrentUserRole();
            if (addItemsBtn) {
                if (['administrator','supervisor'].includes(role)) {
                    addItemsBtn.classList.remove('hidden');
                } else {
                    addItemsBtn.classList.add('hidden');
                }
            }
            showPage('parcelDetailPage');
            if (appStatus) appStatus.textContent = 'โหลดรายละเอียดแล้ว';
        } else {
            if (appStatus) appStatus.textContent = 'ไม่พบข้อมูลพัสดุ';
        }
    } catch (err) {
        console.error('loadParcelDetail error', err);
        if (appStatus) appStatus.textContent = 'เกิดข้อผิดพลาดในการโหลดรายละเอียด';
    }
}
