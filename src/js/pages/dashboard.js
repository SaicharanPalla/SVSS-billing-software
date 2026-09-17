// ==========================================
// SVSS Dashboard
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    await loadDashboard();

    startClock();

    setGreeting();

});

// ==========================================
// Load Dashboard
// ==========================================

async function loadDashboard() {

    await loadLoggedUser();

    await loadCards();

    await loadRecentBills();

}

// ==========================================
// Load Logged User
// ==========================================

async function loadLoggedUser() {

    try {

        const db = await window.api.getDatabase();

        if (!db.settings) {

            db.settings = {};

        }

        const username =
            db.settings.loggedUser ||
            db.settings.username ||
            "Admin";

        const userElement = document.getElementById("loggedUser");

        if (userElement) {

            userElement.textContent = username;

        }

    } catch (err) {

        console.error("Error loading username:", err);

    }

}

// ==========================================
// Dashboard Cards
// ==========================================

async function loadCards() {

    document.getElementById("todaySales").innerHTML =
        formatCurrency(await getTodaySales());

    document.getElementById("todayBills").innerHTML =
        (await getTodayBills()).length;

    document.getElementById("totalCustomers").innerHTML =
        await getCustomerCount();

    document.getElementById("totalProducts").innerHTML =
        await getProductCount();

}

// ==========================================
// Recent Bills
// ==========================================

// ==========================================
// Recent Bills
// ==========================================

async function loadRecentBills() {

    const tbody = document.getElementById("recentBillsBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const bills = await getRecentBills();

    if (!bills || bills.length === 0) {

        tbody.innerHTML = `

        <tr>

            <td colspan="5" class="text-center">

                No Bills Found

            </td>

        </tr>

        `;

        return;

    }

    bills.forEach(bill => {

        // ==========================================
        // GET ACTUAL BILL PAYMENT STATUS
        // ==========================================

        const paymentStatus =
            bill.paymentStatus ||
            bill.status ||
            "Pending";


        // ==========================================
        // NORMALIZE STATUS
        // ==========================================

        const status =
            String(paymentStatus).trim().toLowerCase();


        // ==========================================
        // STATUS BADGE
        // ==========================================

        let badgeClass = "bg-warning text-dark";

        let badgeText = "Pending";


        if (status === "paid") {

            badgeClass = "bg-success";

            badgeText = "Paid";

        }

        else if (status === "cancelled") {

            badgeClass = "bg-danger";

            badgeText = "Cancelled";

        }

        else if (status === "pending") {

            badgeClass = "bg-warning text-dark";

            badgeText = "Pending";

        }


        // ==========================================
        // DISPLAY BILL
        // ==========================================

        tbody.innerHTML += `

        <tr>

            <td>${bill.billNo || ""}</td>

            <td>${bill.customer || ""}</td>

            <td>${bill.grandTotal || "0.00"}</td>

            <td>${formatDisplayDate(bill.date)}</td>

            <td>

                <span class="badge ${badgeClass}">

                    ${badgeText}

                </span>

            </td>

        </tr>

        `;

    });

}

// ==========================================
// Live Date & Time
// ==========================================

function startClock() {

    function updateClock() {

        const now = new Date();

        const dateOptions = {

            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"

        };

        const timeOptions = {

            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"

        };

        const liveDate = document.getElementById("liveDate");
        const liveTime = document.getElementById("liveTime");

        if (liveDate) {

            liveDate.innerHTML =
                now.toLocaleDateString("en-IN", dateOptions);

        }

        if (liveTime) {

            liveTime.innerHTML =
                now.toLocaleTimeString("en-IN", timeOptions);

        }

    }

    updateClock();

    setInterval(updateClock, 1000);

}


// ==========================================
// Greeting
// ==========================================

function setGreeting() {

    const hour = new Date().getHours();

    let greeting = "Good Evening 🌙";

    if (hour < 12) {

        greeting = "Good Morning 👋";

    } else if (hour < 17) {

        greeting = "Good Afternoon ☀️";

    }

    const greetingEl = document.getElementById("greeting");

    if (greetingEl) {

        greetingEl.innerHTML = greeting;

    }

}
// =====================================
// LOGOUT MODAL
// =====================================

const logoutModal = document.getElementById("logoutModal");
const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");