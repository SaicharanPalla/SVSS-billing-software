// ==========================================
// SVSS - Shared Functions
// app.js
// ==========================================

// ==============================
// DATABASE
// ==============================

async function getDatabase() {

    return await window.api.getDatabase();

}

async function saveDatabase(db) {

    await window.api.saveDatabase(db);

}

// ==============================
// PRODUCTS
// ==============================

async function getProducts() {

    const db = await getDatabase();

    return db.products || [];

}

async function saveProducts(products) {

    const db = await getDatabase();

    db.products = products;

    await saveDatabase(db);

}

// ==============================
// BILLS
// ==============================

async function getBills() {

    const db = await getDatabase();

    return db.bills || [];

}

async function saveBills(bills) {

    const db = await getDatabase();

    db.bills = bills;

    await saveDatabase(db);

}

// ==============================
// CUSTOMERS
// ==============================

async function getCustomers() {

    const db = await getDatabase();

    return db.customers || [];

}

// ==============================
// SETTINGS
// ==============================

async function getSettings() {

    const db = await getDatabase();

    return db.settings || {};

}

// -----------------------------
// FORMAT CURRENCY
// -----------------------------

function formatCurrency(value) {

    return "₹" + Number(value).toFixed(2);

}

// -----------------------------
// TODAY DATE
// -----------------------------

function today() {

    const d = new Date();

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;

}

// -----------------------------
// TODAY'S BILLS
// -----------------------------

async function getTodayBills() {

    const bills = await getBills();

    return bills.filter(

        bill => bill.date === today()

    );

}

// -----------------------------
// TODAY SALES
// -----------------------------

async function getTodaySales() {

    const bills = await getTodayBills();

    let total = 0;

    bills.forEach(bill => {

        let amount = bill.grandTotal;

        if (typeof amount === "string") {

            amount = amount
                .replace("₹", "")
                .replace(/,/g, "")
                .trim();

        }

        amount = Number(amount);

        if (!isNaN(amount)) {

            total += amount;

        }

    });

    return total;

}

// -----------------------------
// RECENT BILLS
// -----------------------------

async function getRecentBills(limit = 5) {

    const bills = await getBills();

    return bills
        .slice()
        .reverse()
        .slice(0, limit);

}

// -----------------------------
// PRODUCT COUNT
// -----------------------------

async function getProductCount() {

    const products = await getProducts();

    return products.length;

}

// -----------------------------
// CUSTOMER COUNT
// -----------------------------

async function getCustomerCount() {

    const customers = await getCustomers();

    return customers.length;

}

// ================================
// AUTO ACTIVE SIDEBAR
// ================================
// ================================
// SIDEBAR ACTIVE MENU
// ================================

document.addEventListener("DOMContentLoaded", () => {

    const currentPage = window.location.pathname
        .split("/")
        .pop();

    document.querySelectorAll(".sidebar a").forEach(link => {

        link.classList.remove("active");

        if (link.getAttribute("href") === currentPage) {

            link.classList.add("active");

            if (link.parentElement.tagName === "LI") {
                link.parentElement.classList.add("active");
            }

        }

    });

});


// ================================
// PART 2 STARTS HERE
// ================================
// ================================
// PAGE PROTECTION
// ================================

(async function () {

    const currentPage = window.location.pathname
        .split("/")
        .pop();

    // Login page does not need protection
    if (currentPage === "login.html") {
        return;
    }

    try {

        const db = await window.api.getDatabase();

        if (!db || !db.settings) {

            console.warn(
                "SVSS: Database or settings not available."
            );

            window.location.href = "login.html";

            return;

        }

        const loggedIn =
            db.settings.loggedIn === true;

        console.log(
            "SVSS PAGE PROTECTION:",
            {
                page: currentPage,
                loggedIn: loggedIn,
                loggedUser: db.settings.loggedUser
            }
        );

        if (!loggedIn) {

            console.warn(
                "SVSS: User is not logged in. Redirecting to login."
            );

            window.location.href = "login.html";

            return;

        }

        console.log(
            "SVSS: Page access granted."
        );

    }

    catch (err) {

        console.error(
            "SVSS: Page protection error:",
            err
        );

        window.location.href = "login.html";

    }

})();

// ================================
// LOGOUT
// ================================

async function logout() {

    const modal = document.getElementById("logoutModal");

    if (!modal) {

        console.error("Logout modal not found.");

        return;

    }

    modal.classList.add("show");

}
// ================================
// LOGOUT MODAL EVENTS
// ================================

document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("logoutModal");

    const confirmBtn =
        document.getElementById("confirmLogout");

    const cancelBtn =
        document.getElementById("cancelLogout");

    if (!modal) return;

    // Cancel

    cancelBtn?.addEventListener("click", () => {

        modal.classList.remove("show");

    });

    // Click Outside

    modal.addEventListener("click", (e) => {

        if (e.target === modal) {

            modal.classList.remove("show");

        }

    });

    // ESC Key

    document.addEventListener("keydown", (e) => {

        if (

            e.key === "Escape" &&

            modal.classList.contains("show")

        ) {

            modal.classList.remove("show");

        }

    });

    // Confirm Logout

    confirmBtn?.addEventListener("click", async () => {

        const db = await window.api.getDatabase();

        if (!db.settings) {

            db.settings = {};

        }

        db.settings.loggedIn = false;

        db.settings.loggedUser = "";

        await saveDatabase(db);

        modal.classList.remove("show");

        document.body.style.transition =
            "opacity .35s";

        document.body.style.opacity = "0";

        setTimeout(() => {

            window.location.href = "login.html";

        }, 350);

    });

});

// ================================
// FORMAT DATE
// ================================

function formatDate(date) {

    return new Date(date).toLocaleDateString(

        "en-IN",

        {

            day: "2-digit",

            month: "short",

            year: "numeric"

        }

    );

}
// ======================================
// DATE FORMATTER
// ======================================

function formatDisplayDate(dateString) {

    if (!dateString) return "";

    const parts = dateString.split("-");

    if (parts.length !== 3) return dateString;

    // Already DD-MM-YYYY
    if (parts[0].length === 2) {
        return dateString;
    }

    // Convert YYYY-MM-DD → DD-MM-YYYY
    return `${parts[2]}-${parts[1]}-${parts[0]}`;

}
// ================================
// MOBILE MENU
// ================================

document.addEventListener("DOMContentLoaded", () => {

    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");

    if (!menuBtn || !sidebar) return;

    menuBtn.addEventListener("click", (e) => {

        e.stopPropagation();

        sidebar.classList.toggle("show");

    });

    document.addEventListener("click", (e) => {

        if (
            window.innerWidth <= 768 &&
            !sidebar.contains(e.target) &&
            !menuBtn.contains(e.target)
        ) {

            sidebar.classList.remove("show");

        }

    });

});
// ================================
// APP.JS COMPLETED
// ================================
