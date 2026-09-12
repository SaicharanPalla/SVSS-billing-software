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

    if (!bill || bill.date === undefined || bill.date === null) {
        return new Date(NaN);
    }

    const value = String(bill.date).trim();

    // =================================
    // YYYY-MM-DD
    // Example: 2026-08-01
    // =================================

    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {

        const parts = value.substring(0, 10).split("-");

        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);

        return new Date(year, month, day);
    }

    // =================================
    // DD-MM-YYYY
    // Example: 01-08-2026
    // =================================

    if (/^\d{2}-\d{2}-\d{4}/.test(value)) {

        const parts = value.substring(0, 10).split("-");

        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);

        return new Date(year, month, day);
    }

    // =================================
    // DD/MM/YYYY
    // Example: 01/08/2026
    // =================================

    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) {

        const parts = value.substring(0, 10).split("/");

        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);

        return new Date(year, month, day);
    }

    // =================================
    // Fallback
    // =================================

    const parsed = new Date(value);

    if (!isNaN(parsed.getTime())) {

        return new Date(
            parsed.getFullYear(),
            parsed.getMonth(),
            parsed.getDate()
        );
    }

    return new Date(NaN);
}


// =================================
// TODAY
// =================================

function isToday(date) {

    if (!date || isNaN(date.getTime())) {
        return false;
    }

    const today = new Date();

    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}


// =================================
// CURRENT MONTH
// =================================

function isCurrentMonth(date) {

    if (!date || isNaN(date.getTime())) {
        return false;
    }

    const today = new Date();

    return (
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}


// =================================
// FILTER BILLS BY DATE
// =================================

function getFilteredBills() {

    // ---------------------------------
    // No dates selected
    // ---------------------------------

    if (!fromDate.value && !toDate.value) {

        return bills;
    }


    // ---------------------------------
    // Create start date
    // ---------------------------------

    let start = null;

    if (fromDate.value) {

        const parts = fromDate.value.split("-");

        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);

        start = new Date(
            year,
            month,
            day,
            0,
            0,
            0,
            0
        );
    }


    // ---------------------------------
    // Create end date
    // ---------------------------------

    let end = null;

    if (toDate.value) {

        const parts = toDate.value.split("-");

        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);

        end = new Date(
            year,
            month,
            day,
            23,
            59,
            59,
            999
        );
    }


    // ---------------------------------
    // Filter
    // ---------------------------------

    return bills.filter(bill => {

        const billDate = getBillDate(bill);

        // Invalid bill date
        if (isNaN(billDate.getTime())) {

            console.warn(
                "Invalid bill date:",
                bill.date,
                bill
            );

            return false;
        }

        // Before start date
        if (start && billDate < start) {
            return false;
        }

        // After end date
        if (end && billDate > end) {
            return false;
        }

        return true;

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

    let fullyPaid = 0;
    let credit = 0;

    let amountReceived = 0;
    let pendingAmount = 0;

    let cgst = 0;
    let sgst = 0;


    reportBills.forEach(bill => {

        const grandTotal =
            parseAmount(bill.grandTotal);

        const paid =
            parseAmount(bill.amountPaid);

        const balance =
            Math.max(
                0,
                parseAmount(bill.balanceDue)
            );


        // =================================
        // AMOUNT RECEIVED
        // =================================

        amountReceived += paid;


        // =================================
        // PENDING / CREDIT
        // =================================

        pendingAmount += balance;


        // =================================
        // FULLY PAID
        // =================================

        if (balance <= 0) {

            fullyPaid += grandTotal;

        } else {

            credit += balance;

        }


        // =================================
        // PAYMENT METHOD
        // =================================

        const mode =
            String(
                bill.paymentMode || ""
            ).trim().toLowerCase();


        // IMPORTANT:
        // Count only actual money received
        // against Cash / UPI / Card.

        switch (mode) {

            case "cash":

                cash += paid;

                break;


            case "upi":

                upi += paid;

                break;


            case "card":

                card += paid;

                break;

        }


        // =================================
        // GST
        // =================================

        if (
            Array.isArray(bill.items) &&
            bill.items.length > 0
        ) {

            bill.items.forEach(item => {

                const itemGST =
                    parseAmount(item.gst);


                if (itemGST > 0) {

                    cgst +=
                        itemGST / 2;

                    sgst +=
                        itemGST / 2;

                } else {

                    cgst +=
                        parseAmount(item.cgst);

                    sgst +=
                        parseAmount(item.sgst);

                }

            });

        } else {

            const gst =
                parseAmount(
                    bill.gstTotal
                );

            cgst += gst / 2;
            sgst += gst / 2;

        }

    });


    const totalGST =
        cgst + sgst;


    // =================================
    // PAYMENT SUMMARY
    // =================================

    cashTotalEl.textContent =
        formatCurrency(cash);

    upiTotalEl.textContent =
        formatCurrency(upi);

    cardTotalEl.textContent =
        formatCurrency(card);

    creditTotalEl.textContent =
        formatCurrency(credit);


    // =================================
    // NEW PAYMENT CARDS
    // =================================

    const paidBillsAmount =
        document.getElementById(
            "paidBillsAmount"
        );

    const creditBillsAmount =
        document.getElementById(
            "creditBillsAmount"
        );

    const amountReceivedEl =
        document.getElementById(
            "amountReceived"
        );

    const pendingAmountEl =
        document.getElementById(
            "pendingAmount"
        );


    if (paidBillsAmount) {

        paidBillsAmount.textContent =
            formatCurrency(fullyPaid);

    }


    if (creditBillsAmount) {

        creditBillsAmount.textContent =
            formatCurrency(credit);

    }


    if (amountReceivedEl) {

        amountReceivedEl.textContent =
            formatCurrency(amountReceived);

    }


    if (pendingAmountEl) {

        pendingAmountEl.textContent =
            formatCurrency(pendingAmount);

    }


    // =================================
    // GST SUMMARY
    // =================================

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

let totalSalesAmount = 0;
let totalSalesBills = 0;

Object.keys(salesMap)
    .sort()
    .forEach(date => {

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>
                ${formatDisplayDate(date)}
            </td>

            <td class="text-center">
                ${salesMap[date].bills}
            </td>

            <td class="text-end">
                ${formatCurrency(
                    salesMap[date].amount
                )}
            </td>

        `;

        salesReportBody.appendChild(row);


        // ADD TOTALS
        totalSalesBills +=
            salesMap[date].bills;

        totalSalesAmount +=
            salesMap[date].amount;

    });


// ----------------------------
// UPDATE SALES TOTAL
// ----------------------------

const totalBillsElement =
    document.getElementById(
        "salesReportTotalBills"
    );

const totalAmountElement =
    document.getElementById(
        "salesReportTotalAmount"
    );


if (totalBillsElement) {

    totalBillsElement.textContent =
        totalSalesBills;

}


if (totalAmountElement) {

    totalAmountElement.textContent =
        formatCurrency(
            totalSalesAmount
        );

}

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
// CREDIT CUSTOMER STATEMENT
// ===========================================

function loadCreditStatement(reportBills) {

    const body =
        document.getElementById(
            "creditStatementBody"
        );

    if (!body) return;

    body.innerHTML = "";


    const customerMap = {};


    reportBills.forEach(bill => {

        const balance =
            parseAmount(
                bill.balanceDue
            );


        // Only customers with balance
        if (balance <= 0) return;


        const customer =
            bill.customer ||
            "Walk-in Customer";


        if (!customerMap[customer]) {

            customerMap[customer] = {

                bills: 0,

                purchase: 0,

                paid: 0,

                balance: 0

            };

        }


        customerMap[customer].bills++;

        customerMap[customer].purchase +=
            parseAmount(
                bill.grandTotal
            );

        customerMap[customer].paid +=
            parseAmount(
                bill.amountPaid
            );

        customerMap[customer].balance +=
            balance;

    });


    const customers =
        Object.entries(customerMap)
            .sort(
                (a, b) =>
                    b[1].balance -
                    a[1].balance
            );


    if (customers.length === 0) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="text-center text-muted py-4">

                    No Credit Customers

                </td>

            </tr>

        `;

        return;

    }


    customers.forEach(
        ([name, data], index) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${name}
                    </strong>
                </td>

                <td>
                    ${data.bills}
                </td>

                <td>
                    ${formatCurrency(
                        data.purchase
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        data.paid
                    )}
                </td>

                <td class="text-danger fw-bold">
                    ${formatCurrency(
                        data.balance
                    )}
                </td>

            `;


            body.appendChild(row);

        }
    );

}
// ===========================================
// PAID BILL STATEMENT
// ===========================================

function loadPaidStatement(reportBills) {

    const body =
        document.getElementById(
            "paidStatementBody"
        );

    if (!body) return;

    body.innerHTML = "";


    const paidBills =
        reportBills.filter(
            bill =>
                parseAmount(
                    bill.balanceDue
                ) <= 0
        );


    if (paidBills.length === 0) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="text-center text-muted py-4">

                    No Paid Bills

                </td>

            </tr>

        `;

        return;

    }


    paidBills.forEach(
        (bill, index) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${bill.billNo}
                    </strong>
                </td>

                <td>
                    ${formatDisplayDate(
                        bill.date
                    )}
                </td>

                <td>
                    ${bill.customer ||
                        "Walk-in Customer"}
                </td>

                <td>

                    <span class="badge bg-success">

                        ${bill.paymentMode ||
                            "Cash"}

                    </span>

                </td>

                <td class="text-success fw-bold">

                    ${formatCurrency(
                        parseAmount(
                            bill.grandTotal
                        )
                    )}

                </td>

            `;


            body.appendChild(row);

        }
    );

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
    
        loadCreditStatement(reportBills);
    
        loadPaidStatement(reportBills);
    
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

    let excelTotalSales = 0;

    reportBills.forEach(bill => {
    
        const amount =
            parseAmount(
                bill.grandTotal
            );
    
        excelTotalSales += amount;
    
        csv +=
    `${bill.billNo},${formatDisplayDate(bill.date)},${bill.customer},${bill.paymentMode},${amount.toFixed(2)}\n`;
    
    });
    
    
    // TOTAL ROW
    csv +=
    `TOTAL,,,,${excelTotalSales.toFixed(2)}\n`;

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

let pdfTotalSales = 0;

reportBills.forEach(bill => {

    const amount =
        parseAmount(
            bill.grandTotal
        );

    pdfTotalSales += amount;

    rows.push([
        bill.billNo,
        formatDisplayDate(bill.date),
        bill.customer,
        bill.paymentMode,
        amount.toFixed(2)
    ]);

});


// ADD TOTAL ROW
rows.push([
    "",
    "",
    "",
    "TOTAL",
    pdfTotalSales.toFixed(2)
]);

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
// ===========================================
// DOWNLOAD CREDIT STATEMENT
// ===========================================

const printCreditStatement =
    document.getElementById("printCreditStatement");

if (printCreditStatement) {

    printCreditStatement.addEventListener("click", async () => {

        await refreshDatabase();

        const reportBills = getFilteredBills();

        const customerMap = {};

        reportBills.forEach(bill => {

            const balance = parseAmount(bill.balanceDue);

            if (balance <= 0) return;

            const customer =
                bill.customer || "Walk-in Customer";

            if (!customerMap[customer]) {
                customerMap[customer] = {
                    bills: 0,
                    purchase: 0,
                    paid: 0,
                    balance: 0
                };
            }

            customerMap[customer].bills++;

            customerMap[customer].purchase +=
                parseAmount(bill.grandTotal);

            customerMap[customer].paid +=
                parseAmount(bill.amountPaid);

            customerMap[customer].balance += balance;
        });

        const customers =
            Object.entries(customerMap)
                .sort((a, b) =>
                    b[1].balance - a[1].balance
                );

        const settings = db.settings || {};

        const shopName =
            settings.shopName ||
            "SVSS Billing System";

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF("landscape");

        const today =
            new Date()
                .toLocaleDateString("en-GB")
                .replace(/\//g, "-");

        // HEADER
        doc.setFontSize(20);
        doc.setFont(undefined, "bold");

        doc.text(
            shopName,
            148,
            15,
            { align: "center" }
        );

        doc.setFontSize(11);
        doc.setFont(undefined, "normal");

        doc.text(
            "Credit / Outstanding Statement",
            148,
            23,
            { align: "center" }
        );

        doc.text(
            "Generated on: " +
            new Date().toLocaleString("en-IN"),
            14,
            32
        );

        // TABLE
        // ===========================================
// CREDIT STATEMENT TABLE + TOTAL
// ===========================================

let totalCreditBills = 0;
let totalCreditPurchase = 0;
let totalCreditPaid = 0;
let totalCreditBalance = 0;

const rows = customers.map(
    ([name, data], index) => {

        totalCreditBills += data.bills;
        totalCreditPurchase += data.purchase;
        totalCreditPaid += data.paid;
        totalCreditBalance += data.balance;

        return [
            index + 1,
            name,
            data.bills,
            "Rs. " +
                data.purchase.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2
                    }
                ),
            "Rs. " +
                data.paid.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2
                    }
                ),
            "Rs. " +
                data.balance.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2
                    }
                )
        ];
    }
);


// ===========================================
// TOTAL ROW
// ===========================================

if (rows.length > 0) {

    rows.push([
        "",
        "TOTAL",
        totalCreditBills,

        "Rs. " +
            totalCreditPurchase.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2
                }
            ),

        "Rs. " +
            totalCreditPaid.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2
                }
            ),

        "Rs. " +
            totalCreditBalance.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2
                }
            )
    ]);

}

        if (rows.length === 0) {

            rows.push([
                "",
                "No Credit Customers",
                "",
                "",
                "",
                ""
            ]);
        }

        doc.autoTable({

            startY: 38,

            head: [[
                "#",
                "Customer",
                "Bills",
                "Total Purchase",
                "Paid",
                "Balance Due"
            ]],

            body: rows,

            theme: "grid",

            headStyles: {
                fillColor: [220, 53, 69],
                textColor: 255,
                fontStyle: "bold"
            },

            bodyStyles: {
                fontSize: 10
            },

            columnStyles: {
                0: { cellWidth: 12 },
                1: { cellWidth: 75 },
                2: { cellWidth: 20 },
                3: { cellWidth: 45 },
                4: { cellWidth: 40 },
                5: {
                    cellWidth: 45,
                    textColor: [220, 53, 69],
                    fontStyle: "bold"
                }
            }
        });

        // FOOTER
        const finalY =
            doc.lastAutoTable.finalY + 10;

        doc.setFontSize(9);
        doc.setFont(undefined, "normal");

        doc.text(
            "SVSS Billing System",
            148,
            finalY,
            { align: "center" }
        );

        // DIRECT DOWNLOAD
        doc.save(
            `${today}_CreditBill's_Statement.pdf`
        );

    });

}

// ===========================================
// DOWNLOAD PAID STATEMENT
// ===========================================

const printPaidStatement =
    document.getElementById("printPaidStatement");

if (printPaidStatement) {

    printPaidStatement.addEventListener("click", async () => {

        await refreshDatabase();

        const reportBills = getFilteredBills();

        const paidBills =
            reportBills.filter(
                bill =>
                    parseAmount(bill.balanceDue) <= 0
            );

        const settings = db.settings || {};

        const shopName =
            settings.shopName ||
            "SVSS Billing System";

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF("landscape");

        const today =
            new Date()
                .toLocaleDateString("en-GB")
                .replace(/\//g, "-");

        // HEADER
        doc.setFontSize(20);
        doc.setFont(undefined, "bold");

        doc.text(
            shopName,
            148,
            15,
            { align: "center" }
        );

        doc.setFontSize(11);
        doc.setFont(undefined, "normal");

        doc.text(
            "Paid Bills Statement",
            148,
            23,
            { align: "center" }
        );

        doc.text(
            "Generated on: " +
            new Date().toLocaleString("en-IN"),
            14,
            32
        );

        // TABLE
        // ===========================================
// PAID STATEMENT TABLE + TOTAL
// ===========================================

let totalPaidAmount = 0;

const rows = paidBills.map(
    (bill, index) => {

        const amount =
            parseAmount(bill.grandTotal);

        totalPaidAmount += amount;

        return [
            index + 1,

            bill.billNo || "-",

            formatDisplayDate(
                bill.date
            ),

            bill.customer ||
                "Walk-in Customer",

            bill.paymentMode ||
                "Cash",

            "Rs. " +
                amount.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2
                    }
                )
        ];
    }
);


// ===========================================
// TOTAL ROW
// ===========================================

if (rows.length > 0) {

    rows.push([
        "",
        "",
        "",
        "TOTAL",
        "",
        "Rs. " +
            totalPaidAmount.toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2
                }
            )
    ]);

}

        if (rows.length === 0) {

            rows.push([
                "",
                "No Paid Bills",
                "",
                "",
                "",
                ""
            ]);
        }

        doc.autoTable({

            startY: 38,

            head: [[
                "#",
                "Bill No",
                "Date",
                "Customer",
                "Payment Mode",
                "Amount"
            ]],

            body: rows,

            theme: "grid",

            headStyles: {
                fillColor: [25, 135, 84],
                textColor: 255,
                fontStyle: "bold"
            },

            bodyStyles: {
                fontSize: 10
            },

            columnStyles: {
                0: { cellWidth: 12 },
                1: { cellWidth: 45 },
                2: { cellWidth: 30 },
                3: { cellWidth: 75 },
                4: { cellWidth: 40 },
                5: {
                    cellWidth: 45,
                    textColor: [25, 135, 84],
                    fontStyle: "bold"
                }
            }
        });

        // FOOTER
        const finalY =
            doc.lastAutoTable.finalY + 10;

        doc.setFontSize(9);
        doc.setFont(undefined, "normal");

        doc.text(
            "SVSS Billing System",
            148,
            finalY,
            { align: "center" }
        );

        // DIRECT DOWNLOAD
        doc.save(
            `${today}_PaidBill's_Statement.pdf`
        );

    });

}
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