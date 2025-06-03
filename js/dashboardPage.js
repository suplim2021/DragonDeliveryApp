// js/dashboardPage.js
import { database } from './config.js'; // Firebase service
import { ref, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { uiElements } from './ui.js';
import { showAppStatus } from './utils.js';
import { getCurrentUser } from './auth.js'; // To ensure user is logged in

// Chart.js instances (initialized when data is loaded)
let dailyChartInstance = null;
let platformChartInstance = null;

export function initializeDashboardPageListeners() {
    if (!uiElements.refreshDashboardButton || !uiElements.applyLogFilterButton) {
        console.warn("Dashboard Page elements not fully initialized for listeners.");
        return;
    }
    uiElements.refreshDashboardButton.addEventListener('click', () => loadDashboardData());
    uiElements.applyLogFilterButton.addEventListener('click', () => {
        // Get selected filter status and reload/re-filter data
        loadDashboardData(uiElements.logFilterStatusSelect.value);
    });
}

export function updateCurrentDateOnDashboard() {
    if (uiElements.currentDateDisplay) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
        uiElements.currentDateDisplay.textContent = now.toLocaleDateString('th-TH', options);
    }
}

export async function loadDashboardData(filterStatus = 'all') {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.log("No user logged in, skipping dashboard load.");
        return;
    }
    if (!uiElements.appStatus) { console.error("appStatus element not found in dashboardPage.js"); return; }

    showAppStatus("กำลังโหลดข้อมูล Dashboard...", "info", uiElements.appStatus);

    try {
        const ordersRefNode = ref(database, 'orders');
        // Fetch a reasonable number of recent orders for dashboard overview
        // You might want to add more specific queries based on date ranges for performance
        const dataQuery = query(ordersRefNode, orderByChild('createdAt'), limitToLast(150)); // Fetch recent 150
        
        const snapshot = await get(dataQuery);
        let allOrders = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                allOrders.push({ key: childSnapshot.key, ...childSnapshot.val() });
            });
            // Sort by createdAt descending (newest first) as limitToLast fetches in ascending order
            allOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        updateSummaryCards(allOrders);
        updateOrdersLogTable(allOrders, filterStatus); // Pass the filter status
        renderCharts(allOrders); // Renamed from updateCharts

        showAppStatus("โหลดข้อมูล Dashboard สำเร็จ", "success", uiElements.appStatus);
        if (uiElements.noOrdersMessage) {
            const displayOrders = filterStatus === 'all' ? allOrders : allOrders.filter(o => o.status === filterStatus);
            uiElements.noOrdersMessage.classList.toggle('hidden', displayOrders.length > 0);
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showAppStatus("เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard: " + error.message, "error", uiElements.appStatus);
        if (uiElements.noOrdersMessage) uiElements.noOrdersMessage.classList.remove('hidden');
    }
}

function updateSummaryCards(orders) {
    if (!uiElements.summaryCardsContainer) return;
    uiElements.summaryCardsContainer.innerHTML = ''; // Clear existing cards

    const totalOrders = orders.length;
    const shippedOrders = orders.filter(o => o.status === "Shipped" || o.status === "Shipment Approved").length;
    const pendingShipmentOrders = orders.filter(o => o.status === "Ready for Shipment" || o.status === "Pending Supervisor Ship Check").length; // Example for "รอส่ง"
    // You can define "รอส่ง" more specifically based on your workflow statuses

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    // Ensure createdAt is a number (timestamp) before converting to Date
    const ordersToday = orders.filter(o => o.createdAt && typeof o.createdAt === 'number' && new Date(o.createdAt).toISOString().slice(0, 10) === today).length;

    createSummaryCard("พัสดุทั้งหมด", totalOrders, `+${ordersToday} วันนี้`, "📦");
    createSummaryCard("ส่งแล้ว", shippedOrders, totalOrders > 0 ? `${Math.round((shippedOrders / totalOrders) * 100)}%` : "0%", "✅");
    createSummaryCard("รอส่ง", pendingShipmentOrders, totalOrders > 0 ? `${Math.round((pendingShipmentOrders / totalOrders) * 100)}%` : "0%", "⏰");
}

function createSummaryCard(title, value, subValue, icon) {
    if (!uiElements.summaryCardsContainer) return;
    const card = document.createElement('div');
    card.className = 'summary-card'; // Use CSS class for styling
    card.innerHTML = `
        <div class="summary-card-icon">${icon}</div>
        <h4 class="summary-card-value">${value}</h4>
        <p class="summary-card-title">${title}</p>
        <p class="summary-card-subvalue">${subValue}</p>
    `;
    uiElements.summaryCardsContainer.appendChild(card);
}

function updateOrdersLogTable(orders, filterStatus = 'all') {
    if (!uiElements.ordersTableBody) return;
    uiElements.ordersTableBody.innerHTML = ''; // Clear table

    const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

    if (filteredOrders.length === 0) {
        const row = uiElements.ordersTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5; // Match number of columns
        cell.textContent = "ไม่พบข้อมูลตามเงื่อนไขที่เลือก";
        cell.style.textAlign = "center";
        cell.style.padding = "20px";
        return;
    }

    filteredOrders.forEach(order => {
        const row = uiElements.ordersTableBody.insertRow();
        // Shorten order key for display if it's too long
        const displayKey = order.key && order.key.length > 20 ? order.key.substring(0, 17) + '...' : order.key;
        row.insertCell().textContent = displayKey || 'N/A';
        row.insertCell().textContent = order.platform || 'N/A';
        row.insertCell().textContent = order.packageCode || 'N/A';
        row.insertCell().textContent = order.status || 'N/A';
        row.insertCell().textContent = order.dueDate ? new Date(order.dueDate).toLocaleDateString('th-TH', {day:'2-digit', month:'short', year:'numeric'}) : 'N/A';
        // Consider adding a click event to the row or a button to view order details
    });
}

function renderCharts(orders) {
    if (!orders || orders.length === 0 || typeof Chart === 'undefined') {
        console.warn("Chart.js not loaded or no data available for charts.");
        if (dailyChartInstance) { dailyChartInstance.destroy(); dailyChartInstance = null; }
        if (platformChartInstance) { platformChartInstance.destroy(); platformChartInstance = null; }
        // Optionally clear canvas or show a message
        if (uiElements.dailyStatsChartCanvas) uiElements.dailyStatsChartCanvas.getContext('2d').clearRect(0,0,uiElements.dailyStatsChartCanvas.width, uiElements.dailyStatsChartCanvas.height);
        if (uiElements.platformStatsChartCanvas) uiElements.platformStatsChartCanvas.getContext('2d').clearRect(0,0,uiElements.platformStatsChartCanvas.width, uiElements.platformStatsChartCanvas.height);
        return;
    }

    // --- Daily Stats Chart (Orders created & shipped in the last 7 days) ---
    const dailyData = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
        dailyData[dateStr] = { created: 0, shipped: 0 };
    }

    orders.forEach(order => {
        if (order.createdAt && typeof order.createdAt === 'number') {
            const createdDateStr = new Date(order.createdAt).toISOString().slice(0, 10);
            if (dailyData[createdDateStr]) {
                dailyData[createdDateStr].created++;
            }
        }
        if ((order.status === "Shipped" || order.status === "Shipment Approved") && 
            order.shipmentInfo && order.shipmentInfo.shippedAt_actual && typeof order.shipmentInfo.shippedAt_actual === 'number') {
            const shippedDateStr = new Date(order.shipmentInfo.shippedAt_actual).toISOString().slice(0, 10);
             if (dailyData[shippedDateStr]) {
                dailyData[shippedDateStr].shipped++;
            }
        }
    });

    const dailyLabels = Object.keys(dailyData).map(dStr => new Date(dStr).toLocaleDateString('th-TH', { day:'numeric', month:'short'}));
    const dailyCreatedCounts = Object.values(dailyData).map(data => data.created);
    const dailyShippedCounts = Object.values(dailyData).map(data => data.shipped);

    if (dailyChartInstance) dailyChartInstance.destroy();
    if (uiElements.dailyStatsChartCanvas) {
        dailyChartInstance = new Chart(uiElements.dailyStatsChartCanvas, {
            type: 'bar',
            data: {
                labels: dailyLabels,
                datasets: [
                    { label: 'สร้างใหม่', data: dailyCreatedCounts, backgroundColor: 'rgba(54, 162, 235, 0.7)', stack: 'Stack 0', },
                    { label: 'ส่งแล้ว', data: dailyShippedCounts, backgroundColor: 'rgba(75, 192, 192, 0.7)', stack: 'Stack 0', }
                ]
            },
            options: { scales: { y: { beginAtZero: true, stacked: true }, x: { stacked: true } }, responsive: true, maintainAspectRatio: false }
        });
    }


    // --- Platform Stats Chart ---
    const platformCounts = {};
    orders.forEach(order => {
        const platform = order.platform || "Unknown";
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    if (platformChartInstance) platformChartInstance.destroy();
    if (uiElements.platformStatsChartCanvas) {
        platformChartInstance = new Chart(uiElements.platformStatsChartCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(platformCounts),
                datasets: [{
                    label: 'จำนวนออเดอร์ตามแพลตฟอร์ม',
                    data: Object.values(platformCounts),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8A2BE2'], // Add more colors if needed
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}