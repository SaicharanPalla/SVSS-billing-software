// ===========================================
// SVSS REPORTS
// Part 1 - Database & Helper Functions
// ===========================================

// ----------------------------
// Database
// ----------------------------

let db = {};
let bills = [];

// ----------------------------
// Database Functions
// ----------------------------

async function refreshDatabase() {

    db = await window.api.getDatabase();

    bills = db.bills || [];

    console.log("Bills Found :", bills.length);

}

async function saveDatabase() {

    db.bills = bills;

    await window.api.saveDatabase(db);

}

// ----------------------------
// Elements
// ----------------------------

const todaySalesEl = document.getElementById("todaySales");
const monthSalesEl = document.getElementById("monthSales");
const totalBillsEl = document.getElementById("totalBills");
const totalCustomersEl = document.getElementById("totalCustomers");
const totalProductsEl = document.getElementById("totalProducts");
const totalGSTEl = document.getElementById("totalGST");

const cashTotalEl = document.getElementById("cashTotal");
const upiTotalEl = document.getElementById("upiTotal");
const cardTotalEl = document.getElementById("cardTotal");
const creditTotalEl = document.getElementById("creditTotal");

const cgstCollectedEl = document.getElementById("cgstCollected");
const sgstCollectedEl = document.getElementById("sgstCollected");
const totalGSTSummaryEl = document.getElementById("totalGSTSummary");

const salesReportBody = document.getElementById("salesReportBody");
const topProductsBody = document.getElementById("topProductsBody");
const topCustomersBody = document.getElementById("topCustomersBody");

const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");

const applyFilter = document.getElementById("applyFilter");
const resetFilter = document.getElementById("resetFilter");

const exportPDF = document.getElementById("exportPDF");
const exportExcel = document.getElementById("exportExcel");

// ----------------------------
// Currency Helpers
// ----------------------------

function parseAmount(value) {

    if (value === undefined || value === null)
        return 0;

    if (typeof value === "number")
        return value;

    return parseFloat(
        String(value).replace(/[^\d.-]/g, "")
    ) || 0;

}

function formatCurrency(value) {

    return "Rs. " + Number(value).toLocaleString("en-IN", {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

    });

}

// ----------------------------
// Date Helpers
// ----------------------------

function getBillDate(bill) {

    if (!bill.date) return new Date("Invalid");

    // Already yyyy-mm-dd
    if (bill.date.includes("-") && bill.date.split("-")[0].length === 4) {

        return new Date(bill.date);

    }

    // dd-mm-yyyy
    const parts = bill.date.split("-");

    if (parts.length === 3) {

        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);

        return new Date(year, month, day);

    }

    return new Date(bill.date);

}

function isToday(date) {

    const today = new Date();

    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );

}

function isCurrentMonth(date) {

    const today = new Date();

    return (
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );

}

// ----------------------------
// Filter Bills
// ----------------------------

function getFilteredBills() {

    if (!fromDate.value || !toDate.value)
        return bills;

    const start = new Date(fromDate.value);

    const end = new Date(toDate.value);

    end.setHours(23, 59, 59, 999);

    return bills.filter(bill => {

        const d = getBillDate(bill);

        return d >= start && d <= end;

    });

}

// ===========================================
// PART 2 STARTS HERE
// ===========================================
// ===========================================
// PART 2 - SUMMARY CARDS
// ===========================================

function loadSummaryCards(reportBills) {

    let todaySales = 0;
    let monthSales = 0;

    let totalGST = 0;

    const customerSet = new Set();

    const productSet = new Set();

    reportBills.forEach(bill => {

        const billDate = getBillDate(bill);

        const grandTotal = parseAmount(bill.grandTotal);

        const gst = parseAmount(bill.gstTotal);

        totalGST += gst;

        if (!isNaN(billDate.getTime()) && isToday(billDate)) {

    todaySales += grandTotal;

}

       if (!isNaN(billDate.getTime()) && isCurrentMonth(billDate)) {

    monthSales += grandTotal;

}
        if (

            bill.customer &&

            bill.customer.trim() !== "" &&

            bill.customer !== "Walk-in Customer"

        ) {

            customerSet.add(

                bill.customer.trim().toLowerCase()

            );

        }

        if (Array.isArray(bill.items)) {

            bill.items.forEach(item => {

                const productName =

                    item.productName ||

                    item.product ||

                    "";

                if (productName !== "") {

                    productSet.add(productName);

                }

            });

        }

    });

    // ----------------------------
    // UPDATE SUMMARY CARDS
    // ----------------------------

    todaySalesEl.textContent =
        formatCurrency(todaySales);

    monthSalesEl.textContent =
        formatCurrency(monthSales);

    totalBillsEl.textContent =
        reportBills.length;

    totalCustomersEl.textContent =
        customerSet.size;

    totalProductsEl.textContent =
        productSet.size;

    totalGSTEl.textContent =
        formatCurrency(totalGST);

}

// ===========================================
// PART 3 STARTS HERE
// ===========================================
// ===========================================
// PART 3 - PAYMENT SUMMARY & GST SUMMARY
// ===========================================

function loadPaymentSummary(reportBills) {

    let cash = 0;
    let upi = 0;
    let card = 0;
    let credit = 0;

    let cgst = 0;
    let sgst = 0;

    reportBills.forEach(bill => {

        const amount = parseAmount(bill.grandTotal);

        switch ((bill.paymentMode || "").toLowerCase()) {

            case "cash":
                cash += amount;
                break;

            case "upi":
                upi += amount;
                break;

            case "card":
                card += amount;
                break;

            case "credit":
                credit += amount;
                break;

            default:
                credit += amount;
                break;

        }

        // -----------------------
        // GST Calculation
        // -----------------------

        if (Array.isArray(bill.items) && bill.items.length > 0) {

            bill.items.forEach(item => {

                const itemGST =
                    parseAmount(item.gst);

                if (itemGST > 0) {

                    cgst += itemGST / 2;
                    sgst += itemGST / 2;

                } else {

                    cgst += parseAmount(item.cgst);
                    sgst += parseAmount(item.sgst);

                }

            });

        } else {

            const gst =
                parseAmount(bill.gstTotal);

            cgst += gst / 2;
            sgst += gst / 2;

        }

    });

    const totalGST = cgst + sgst;

    // -----------------------
    // PAYMENT SUMMARY
    // -----------------------

    cashTotalEl.textContent =
        formatCurrency(cash);

    upiTotalEl.textContent =
        formatCurrency(upi);

    cardTotalEl.textContent =
        formatCurrency(card);

    creditTotalEl.textContent =
        formatCurrency(credit);

    // -----------------------
    // GST SUMMARY
    // -----------------------

    cgstCollectedEl.textContent =
        formatCurrency(cgst);

    sgstCollectedEl.textContent =
        formatCurrency(sgst);

    totalGSTSummaryEl.textContent =
        formatCurrency(totalGST);

}

// ===========================================
// PART 4 STARTS HERE
// ===========================================// ===========================================
// PART 4 - CHARTS
// ===========================================

let salesChart = null;
let paymentChart = null;

// ----------------------------
// SALES CHART
// ----------------------------

function loadSalesChart(reportBills) {

    const salesData = {};

    reportBills.forEach(bill => {

        const date = bill.date;

        const amount = parseAmount(bill.grandTotal);

        if (!salesData[date]) {

            salesData[date] = 0;

        }

        salesData[date] += amount;

    });

    const labels = Object.keys(salesData).sort();

    const values = labels.map(date => salesData[date]);

    if (salesChart) {

        salesChart.destroy();

    }

    const ctx = document
        .getElementById("salesChart")
        .getContext("2d");

    salesChart = new Chart(ctx, {

        type: "line",

        data: {

            labels,

            datasets: [{

                label: "Sales",

                data: values,

                borderColor: "#16a34a",

                backgroundColor: "rgba(22,163,74,.15)",

                fill: true,

                tension: 0.35,

                borderWidth: 3,

                pointRadius: 4

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    display: false

                }

            },

            scales: {

                y: {

                    beginAtZero: true

                }

            }

        }

    });

}

// ----------------------------
// PAYMENT CHART
// ----------------------------

function loadPaymentChart(reportBills) {

    let cash = 0;
    let upi = 0;
    let card = 0;
    let credit = 0;

    reportBills.forEach(bill => {

        const amount = parseAmount(bill.grandTotal);

        switch ((bill.paymentMode || "").toLowerCase()) {

            case "cash":
                cash += amount;
                break;

            case "upi":
                upi += amount;
                break;

            case "card":
                card += amount;
                break;

            default:
                credit += amount;
                break;

        }

    });

    if (paymentChart) {

        paymentChart.destroy();

    }

    const ctx = document
        .getElementById("paymentChart")
        .getContext("2d");

    paymentChart = new Chart(ctx, {

        type: "doughnut",

        data: {

            labels: [

                "Cash",

                "UPI",

                "Card",

                "Credit"

            ],

            datasets: [{

                data: [

                    cash,

                    upi,

                    card,

                    credit

                ],

                backgroundColor: [

                    "#16a34a",

                    "#2563eb",

                    "#f59e0b",

                    "#dc2626"

                ]

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    position: "bottom"

                }

            }

        }

    });

}

// ===========================================
// PART 5 STARTS HERE
// ===========================================
// ===========================================
// PART 5 - TABLES
// ===========================================

function loadTables(reportBills) {

    // ----------------------------
    // Clear Tables
    // ----------------------------

    salesReportBody.innerHTML = "";
    topProductsBody.innerHTML = "";
    topCustomersBody.innerHTML = "";

    const salesMap = {};
    const productMap = {};
    const customerMap = {};

    // ----------------------------
    // Collect Data
    // ----------------------------

    reportBills.forEach(bill => {

        // Daily Sales

        const date = bill.date;

        if (!salesMap[date]) {

            salesMap[date] = {

                bills: 0,

                amount: 0

            };

        }

        salesMap[date].bills++;

        salesMap[date].amount +=
            parseAmount(bill.grandTotal);

        // Customers

        const customer =
            bill.customer || "Walk-in Customer";

        if (!customerMap[customer]) {

            customerMap[customer] = {

                bills: 0,

                amount: 0

            };

        }

        customerMap[customer].bills++;

        customerMap[customer].amount +=
            parseAmount(bill.grandTotal);

        // Products

        if (Array.isArray(bill.items)) {

            bill.items.forEach(item => {

                const product =

                    item.productName ||

                    item.product ||

                    "Unknown";

                if (!productMap[product]) {

                    productMap[product] = {

                        qty: 0,

                        sales: 0

                    };

                }

                productMap[product].qty +=
                    Number(item.qty || 0);

                productMap[product].sales +=
                    parseAmount(item.total);

            });

        }

    });

    // ----------------------------
    // Sales Report Table
    // ----------------------------

    Object.keys(salesMap)

        .sort()

        .forEach(date => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>${formatDisplayDate(date)}</td>

                <td>${salesMap[date].bills}</td>

                <td>${formatCurrency(
                    salesMap[date].amount
                )}</td>

            `;

            salesReportBody.appendChild(row);

        });

    // ----------------------------
    // Top Products Table
    // ----------------------------

    Object.entries(productMap)

        .sort((a, b) =>

            b[1].qty - a[1].qty

        )

        .forEach(([name, data], index) => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>${index + 1}</td>

                <td>${name}</td>

                <td>${data.qty}</td>

                <td>${formatCurrency(
                    data.sales
                )}</td>

            `;

            topProductsBody.appendChild(row);

        });

    // ----------------------------
    // Top Customers Table
    // ----------------------------

    Object.entries(customerMap)

        .sort((a, b) =>

            b[1].amount - a[1].amount

        )

        .forEach(([name, data], index) => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>${index + 1}</td>

                <td>${name}</td>

                <td>${data.bills}</td>

                <td>${formatCurrency(
                    data.amount
                )}</td>

            `;

            topCustomersBody.appendChild(row);

        });

}

// ===========================================
// PART 6 STARTS HERE
// ===========================================
// ===========================================
// PART 6 - MASTER LOADER
// ===========================================

function loadReports(reportBills) {

    loadSummaryCards(reportBills);

    loadPaymentSummary(reportBills);

    loadSalesChart(reportBills);

    loadPaymentChart(reportBills);

    loadTables(reportBills);

    console.log("Reports Loaded :", reportBills.length);

}

// ===========================================
// INITIAL PAGE LOAD
// ===========================================

document.addEventListener("DOMContentLoaded", async () => {

    await refreshDatabase();

    await applyTheme();

    loadReports(bills);

});

// ===========================================
// APPLY FILTER
// ===========================================

applyFilter.addEventListener("click", async () => {

    await refreshDatabase();

    const filteredBills = getFilteredBills();

    loadReports(filteredBills);

});

// ===========================================
// RESET FILTER
// ===========================================

resetFilter.addEventListener("click", async () => {

    fromDate.value = "";

    toDate.value = "";

    await refreshDatabase();

    loadReports(bills);

});

// ===========================================
// EXPORT CSV (Excel)
// ===========================================

exportExcel.addEventListener("click", async () => {

    await refreshDatabase();

    const reportBills = getFilteredBills();

    let csv =
        "Bill No,Date,Customer,Payment Mode,Grand Total\n";

    reportBills.forEach(bill => {

        csv +=
`${bill.billNo},${formatDisplayDate(bill.date)},${bill.customer},${bill.paymentMode},${parseAmount(bill.grandTotal)}\n`;

    });

    const blob = new Blob([csv], {

        type: "text/csv"

    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "Sales_Report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);

});

// ===========================================
// EXPORT PDF
// ===========================================

exportPDF.addEventListener("click", async () => {

    await refreshDatabase();

    const reportBills = getFilteredBills();

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    const settings = db.settings || {};

    doc.setFontSize(18);

    doc.text(

        settings.shopName ||

        "SVSS Billing Report",

        14,

        18

    );

    doc.setFontSize(11);

    doc.text(

        "Generated : " +

        new Date().toLocaleString(),

        14,

        28

    );

    const rows = [];

    reportBills.forEach(bill => {

        rows.push([

            bill.billNo,

            formatDisplayDate(bill.date),

            bill.customer,

            bill.paymentMode,

            parseAmount(

                bill.grandTotal

            ).toFixed(2)

        ]);

    });

    doc.autoTable({

        startY: 38,

        head: [[

            "Bill No",

            "Date",

            "Customer",

            "Payment",

            "Amount"

        ]],

        body: rows

    });

    doc.save("Sales_Report.pdf");

});

// ===========================================
// SAVE DATABASE BEFORE EXIT
// ===========================================

window.addEventListener("beforeunload", async () => {

    try {

        await saveDatabase();

    } catch (err) {

        console.error(

            "Error saving database:",

            err

        );

    }

});
// ===========================================
// Keyboard Shortcuts - Reports
// ===========================================

// Ctrl + P → Export PDF
document.addEventListener("svss:print", () => {

    exportPDF.click();

});

// Ctrl + S → Export Excel
document.addEventListener("svss:save", () => {

    exportExcel.click();

});

// Ctrl + F → Focus From Date
document.addEventListener("svss:search", () => {

    fromDate.focus();

});

// Esc → Remove Focus
document.addEventListener("svss:escape", () => {

    document.activeElement.blur();

});

// =============================
// REPORTS.JS COMPLETED
// ===========================================