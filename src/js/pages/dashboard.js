// ==========================================
// SVSS DASHBOARD
// ==========================================


// ==========================================
// DASHBOARD CURRENCY FORMATTER
// Example: RS 3,69,180.00
// ==========================================

function formatDashboardAmount(value) {

    const amount = Number(value) || 0;

    return `Rs.  ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

}


// ==========================================
// GET BILL AMOUNT SAFELY
// ==========================================

function getDashboardBillAmount(bill) {

    if (!bill || typeof bill !== "object") {
        return 0;
    }

    const possibleFields = [

        "grandTotal",
        "grand_total",

        "grandTotalAmount",
        "grand_total_amount",

        "totalAmount",
        "total_amount",

        "netAmount",
        "net_amount",

        "finalAmount",
        "final_amount",

        "billAmount",
        "bill_amount",

        "amount",
        "total",

        "payableAmount",
        "payable_amount",

        "subTotal",
        "subtotal",
        "sub_total"

    ];

    for (const field of possibleFields) {

        if (
            bill[field] !== undefined &&
            bill[field] !== null &&
            bill[field] !== ""
        ) {

            let value = bill[field];

            if (typeof value === "object") {

                value =
                    value.amount ??
                    value.value ??
                    value.total ??
                    value.grandTotal ??
                    0;

            }

            if (typeof value === "string") {

                value = value
                    .replace(/Rs. /gi, "")
                    .replace(/Rs. \./gi, "")
                    .replace(/₹/g, "")
                    .replace(/,/g, "")
                    .trim();

            }

            const amount = Number(value);

            if (Number.isFinite(amount)) {
                return amount;
            }

        }

    }

    return 0;

}


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    await loadDashboard();

    startClock();

    setGreeting();

});


// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    await loadLoggedUser();

    await loadCards();

    await loadRecentBills();

}


// ==========================================
// LOAD LOGGED USER
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

        const userElement =
            document.getElementById("loggedUser");

        if (userElement) {

            userElement.textContent = username;

        }

    } catch (err) {

        console.error(
            "Error loading username:",
            err
        );

    }

}


// ==========================================
// DASHBOARD CARDS
// ==========================================

async function loadCards() {

    const todaySales =
        await getTodaySales();

    const todaySalesElement =
        document.getElementById("todaySales");

    if (todaySalesElement) {

        todaySalesElement.textContent =
            formatDashboardAmount(todaySales);

    }

    const todayBills =
        await getTodayBills();

    const todayBillsElement =
        document.getElementById("todayBills");

    if (todayBillsElement) {

        todayBillsElement.textContent =
            todayBills.length;

    }

    const totalCustomers =
        await getCustomerCount();

    const totalCustomersElement =
        document.getElementById("totalCustomers");

    if (totalCustomersElement) {

        totalCustomersElement.textContent =
            totalCustomers;

    }

    const totalProducts =
        await getProductCount();

    const totalProductsElement =
        document.getElementById("totalProducts");

    if (totalProductsElement) {

        totalProductsElement.textContent =
            totalProducts;

    }

}


// ==========================================
// RECENT BILLS
// ==========================================

async function loadRecentBills() {

    const tbody =
        document.getElementById("recentBillsBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const bills =
        await getRecentBills();

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

        // ==================================
        // PAYMENT STATUS
        // ==================================

        const paymentStatus =
            bill.paymentStatus ||
            bill.payment_status ||
            bill.status ||
            "Pending";

        const status =
            String(paymentStatus)
                .trim()
                .toLowerCase();


        // ==================================
        // STATUS BADGE
        // ==================================

        let badgeClass =
            "bg-warning text-dark";

        let badgeText =
            "Pending";

        if (status === "paid") {

            // Green Paid badge
            badgeClass =
                "paid-status";

            badgeText =
                "Paid";

        }

        else if (status === "cancelled") {

            badgeClass =
                "bg-danger";

            badgeText =
                "Cancelled";

        }


        // ==================================
        // BILL AMOUNT
        // ==================================

        const billAmount =
            getDashboardBillAmount(bill);


        // ==================================
        // DISPLAY BILL
        // ==================================

        tbody.innerHTML += `

            <tr>

                <td>
                    ${bill.billNo || bill.bill_no || ""}
                </td>

                <td>
                    ${
                        bill.customer ||
                        bill.customerName ||
                        bill.customer_name ||
                        ""
                    }
                </td>

                <td>
                    ${formatDashboardAmount(billAmount)}
                </td>

                <td>
                    ${
                        formatDisplayDate(
                            bill.date ||
                            bill.billDate ||
                            bill.bill_date ||
                            bill.createdAt ||
                            bill.created_at
                        )
                    }
                </td>

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
// LIVE DATE & TIME
// ==========================================

function startClock() {

    function updateClock() {

        const now =
            new Date();

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

        const liveDate =
            document.getElementById("liveDate");

        const liveTime =
            document.getElementById("liveTime");

        if (liveDate) {

            liveDate.innerHTML =
                now.toLocaleDateString(
                    "en-IN",
                    dateOptions
                );

        }

        if (liveTime) {

            liveTime.innerHTML =
                now.toLocaleTimeString(
                    "en-IN",
                    timeOptions
                );

        }

    }

    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


// ==========================================
// GREETING
// ==========================================

function setGreeting() {

    const hour =
        new Date().getHours();

    let greeting =
        "Good Evening 🌙";

    if (hour < 12) {

        greeting =
            "Good Morning 👋";

    }

    else if (hour < 17) {

        greeting =
            "Good Afternoon ☀️";

    }

    const greetingElement =
        document.getElementById("greeting");

    if (greetingElement) {

        greetingElement.innerHTML =
            greeting;

    }

}


// ==========================================
// LOGOUT MODAL
// ==========================================

const logoutModal =
    document.getElementById("logoutModal");

const confirmLogout =
    document.getElementById("confirmLogout");

const cancelLogout =
    document.getElementById("cancelLogout");