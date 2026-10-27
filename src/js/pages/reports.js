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

// ===========================================
// MONEY HELPERS
// ===========================================

function parseAmount(value) {
    if (value === undefined || value === null) {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value)
        .replace(/₹|Rs\.?|INR/gi, "")
        .replace(/,/g, "")
        .trim();

    const amount = Number(cleaned);

    return Number.isFinite(amount) ? amount : 0;
}


// ===========================================
// GET BILL TOTAL
// ===========================================

function getBillTotal(bill) {
    if (!bill) {
        return 0;
    }

    // IMPORTANT:
    // Read the saved amount directly.
    // Do not call getBillTotal() here.
    const savedTotal = parseAmount(bill.grandTotal);

    if (savedTotal > 0) {
        return savedTotal;
    }

    // Fallback calculation for bills without grandTotal
    let itemTotal = 0;

    if (Array.isArray(bill.items)) {
        itemTotal = bill.items.reduce((sum, item) => {
            return sum + parseAmount(item.total);
        }, 0);
    }

    const discount = parseAmount(bill.discount);

    return Math.max(0, itemTotal - discount);
}


// ===========================================
// GET PAID AMOUNT
// ===========================================

function getBillPaid(bill) {
    if (!bill) {
        return 0;
    }

    return Math.max(
        0,
        parseAmount(
            bill.amountPaid ??
            bill.paidAmount ??
            bill.paid ??
            0
        )
    );
}


// ===========================================
// GET BALANCE DUE
// ===========================================

function getReportEndDate() {
    if (toDate.value) {
        const [year, month, day] = toDate.value
            .split("-")
            .map(Number);

        return new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    const today = new Date();
    return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23, 59, 59, 999
    );
}

function getBillPaidAsOfReportDate(bill) {
    const currentPaid = getBillPaid(bill);
    const reportEnd = getReportEndDate();

    const customer = (db.customers || []).find(c => {
        const sameId =
            c.customerId &&
            bill.customerId &&
            String(c.customerId).trim() ===
                String(bill.customerId).trim();

        const sameName =
            String(c.name || "").trim().toLowerCase() ===
            String(bill.customer || "").trim().toLowerCase();

        const customerMobile = String(c.mobile || "").trim();
        const billMobile = String(bill.mobile || "").trim();

        const sameMobile =
            !customerMobile ||
            !billMobile ||
            customerMobile === "-" ||
            billMobile === "-" ||
            customerMobile === billMobile;

        return sameId || (sameName && sameMobile);
    });

    if (!customer || !Array.isArray(customer.paymentHistory)) {
        return currentPaid;
    }

    const customerBills = bills.filter(otherBill => {
        const sameId =
            customer.customerId &&
            otherBill.customerId &&
            String(customer.customerId).trim() ===
                String(otherBill.customerId).trim();

        const sameName =
            String(otherBill.customer || "").trim().toLowerCase() ===
            String(customer.name || "").trim().toLowerCase();

        const customerMobile = String(customer.mobile || "").trim();
        const billMobile = String(otherBill.mobile || "").trim();

        const sameMobile =
            !customerMobile ||
            !billMobile ||
            customerMobile === "-" ||
            billMobile === "-" ||
            customerMobile === billMobile;

        return sameId || (sameName && sameMobile);
    });

    // The saved history has no bill allocation link.
    // Apply this date adjustment only when the customer has one bill
    // and the history total equals that bill's current paid amount.
    if (customerBills.length !== 1) {
        return currentPaid;
    }

    const historyTotal = customer.paymentHistory.reduce(
        (total, payment) =>
            total + Math.max(0, parseAmount(payment.amount)),
        0
    );

    if (Math.abs(historyTotal - currentPaid) > 0.01) {
        return currentPaid;
    }

    const paymentsAfterReportDate =
        customer.paymentHistory.reduce((total, payment) => {
            const paymentDate = getBillDate({
                date:
                    payment.date ||
                    payment.paymentDate ||
                    payment.createdAt
            });

            if (
                !isNaN(paymentDate.getTime()) &&
                paymentDate > reportEnd
            ) {
                return total + Math.max(0, parseAmount(payment.amount));
            }

            return total;
        }, 0);

    return Math.max(0, currentPaid - paymentsAfterReportDate);
}

function getBillBalance(bill) {
    const total = getBillTotal(bill);
    const paid = getBillPaidAsOfReportDate(bill);

    return Math.max(0, total - paid);
}


// ===========================================
// FORMAT CURRENCY
// ===========================================

function formatCurrency(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-IN", {
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
function isDateInReportRange(date) {
    if (!date || isNaN(date.getTime())) return false;

    let start = null;
    let end = null;

    if (fromDate.value) {
        const [year, month, day] = fromDate.value.split("-").map(Number);
        start = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (toDate.value) {
        const [year, month, day] = toDate.value.split("-").map(Number);
        end = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    return (!start || date >= start) && (!end || date <= end);
}

function getReportActivityBills(reportBills) {
    const result = new Set(reportBills);

    if (!fromDate.value && !toDate.value) {
        return bills;
    }

    (db.customers || []).forEach(customer => {
        const customerBills = bills.filter(bill => {
            const sameId =
                customer.customerId &&
                bill.customerId &&
                String(customer.customerId).trim() ===
                    String(bill.customerId).trim();

            const sameName =
                String(customer.name || "").trim().toLowerCase() ===
                String(bill.customer || "").trim().toLowerCase();

            const customerMobile = String(customer.mobile || "").trim();
            const billMobile = String(bill.mobile || "").trim();

            const sameMobile =
                !customerMobile ||
                !billMobile ||
                customerMobile === "-" ||
                billMobile === "-" ||
                customerMobile === billMobile;

            return sameId || (sameName && sameMobile);
        });

        // Payment history has no bill number. Limit this association to
        // customers with one bill so we do not guess between multiple bills.
        if (
            customerBills.length !== 1 ||
            !Array.isArray(customer.paymentHistory)
        ) {
            return;
        }

        const bill = customerBills[0];
        const billDate = getBillDate(bill);
        const totalCustomerBillPaid =
            customerBills.reduce(
                (total, item) => total + getBillPaid(item),
                0
            );

        const payments = [...customer.paymentHistory].sort((a, b) =>
            getBillDate({ date: a.date || a.paymentDate || a.createdAt }) -
            getBillDate({ date: b.date || b.paymentDate || b.createdAt })
        );

        let runningPaid = 0;
        let previousOpeningPaid = 0;

        payments.forEach(payment => {
            const amount = Math.max(0, parseAmount(payment.amount));
            runningPaid += amount;

            const currentOpeningPaid =
                Math.max(runningPaid - totalCustomerBillPaid, 0);

            const openingPortion =
                Math.max(currentOpeningPaid - previousOpeningPaid, 0);

            previousOpeningPaid = currentOpeningPaid;

            const billPortion =
                Math.max(amount - openingPortion, 0);

            const paymentDate = getBillDate({
                date: payment.date || payment.paymentDate || payment.createdAt
            });

            if (
                billPortion > 0 &&
                !isNaN(billDate.getTime()) &&
                paymentDate >= billDate &&
                isDateInReportRange(paymentDate)
            ) {
                result.add(bill);
            }
        });
    });

    return [...result];
}
// ===========================================
// PART 2 STARTS HERE
// ===========================================
// ===========================================
// PART 2 - SUMMARY CARDS
// ===========================================

function loadSummaryCards(reportBills, activityBills = reportBills) {
    let todaySales = 0;
    let monthSales = 0;
    let totalGST = 0;

    const customerSet = new Set();
    const productSet = new Set();

    // Sales stay associated with each bill's original date.
    reportBills.forEach(bill => {
        const billDate = getBillDate(bill);

        if (!isNaN(billDate.getTime()) && isToday(billDate)) {
            todaySales += getBillTotal(bill);
        }
    });

    const hasSelectedDateRange =
        Boolean(fromDate.value || toDate.value);

    const monthlySalesBills = hasSelectedDateRange
        ? reportBills
        : reportBills.filter(bill => {
            const billDate = getBillDate(bill);
            return !isNaN(billDate.getTime()) && isCurrentMonth(billDate);
        });

    monthSales = monthlySalesBills.reduce(
        (total, bill) => total + getBillTotal(bill),
        0
    );

    // Keep payment-linked bill context for the other summary cards.
    activityBills.forEach(bill => {
        totalGST += parseAmount(bill.gstTotal);

        if (
            bill.customer &&
            bill.customer.trim() !== "" &&
            bill.customer !== "Walk-in Customer"
        ) {
            customerSet.add(bill.customer.trim().toLowerCase());
        }

        if (Array.isArray(bill.items)) {
            bill.items.forEach(item => {
                const productName =
                    item.productName || item.product || "";

                if (productName) {
                    productSet.add(productName);
                }
            });
        }
    });

    todaySalesEl.textContent = formatCurrency(todaySales);
    monthSalesEl.textContent = formatCurrency(monthSales);
    totalBillsEl.textContent = activityBills.length;
    totalCustomersEl.textContent = customerSet.size;
    totalProductsEl.textContent = productSet.size;
    totalGSTEl.textContent = formatCurrency(totalGST);
}
// ===========================================
// PART 3 STARTS HERE
// ===========================================
// ===========================================
// PART 3 - PAYMENT SUMMARY & GST SUMMARY
// ===========================================

// ===========================================
// PAYMENT SUMMARY
// ===========================================

function loadPaymentSummary(
    reportBills,
    activityBills = reportBills,
    openingBalanceReceiptRows = null
) {

    let cash = 0;

    let upi = 0;

    let card = 0;

    let fullyPaid = 0;

    let credit = 0;

    let amountReceived = 0;

    let pendingAmount = 0;

    let billPayments = 0;

    let openingBalanceReceived = 0;

    let cgst = 0;

    let sgst = 0;


    // ==========================================
    // BILL PAYMENT SUMMARY
    // ==========================================

    reportBills.forEach(bill => {

        const grandTotal =
            getBillTotal(bill);


        const paid =
    getBillPaidAsOfReportDate(bill);


        const balance =
            Math.max(
                0,
                getBillBalance(bill)
            );


        // ==========================================
        // BILL PAYMENTS
        // ==========================================

        billPayments += paid;


        // ==========================================
        // PENDING / CREDIT
        // ==========================================

        pendingAmount += balance;


        // ==========================================
        // FULLY PAID / CREDIT
        // ==========================================

        if (balance <= 0) {

            fullyPaid += grandTotal;

        } else {

            credit += balance;

        }


        // ==========================================
        // BILL PAYMENT METHOD
        // ==========================================

        const mode =
            String(
                bill.paymentMode || ""
            )
                .trim()
                .toLowerCase();


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


       // ==========================================
// GST
// ==========================================

const gst = parseAmount(bill.gstTotal);

cgst += gst / 2;
sgst += gst / 2;
    });
    // Recalculate bill status and GST using bills linked to
// payment activity in the selected period.
fullyPaid = 0;
credit = 0;
pendingAmount = 0;
cgst = 0;
sgst = 0;

activityBills.forEach(bill => {
    const grandTotal = getBillTotal(bill);
    const balance = getBillBalance(bill);
    const paid = getBillPaidAsOfReportDate(bill);
    const gst = parseAmount(bill.gstTotal);

    pendingAmount += balance;

    if (balance <= 0) {
        fullyPaid += grandTotal;
    } else {
        credit += balance;
    }

    // CGST and SGST are split evenly in the existing bill data.
    cgst += gst / 2;
    sgst += gst / 2;
});

    // ==========================================
    // OPENING BALANCE PAYMENTS
    //
    // IMPORTANT:
    //
    // Payment is first considered against
    // all bill payments.
    //
    // Any amount remaining after all bill
    // payments is treated as Opening Balance
    // Received.
    // ==========================================

    const customers =
        Array.isArray(db.customers)
            ? db.customers
            : [];


    customers.forEach(customer => {

        if (
            !Array.isArray(
                customer.paymentHistory
            ) ||
            customer.paymentHistory.length === 0
        ) {

            return;

        }


        const customerId =
            String(
                customer.customerId || ""
            ).trim();


        const customerName =
            String(
                customer.name || ""
            )
                .trim()
                .toLowerCase();


        const customerMobile =
            String(
                customer.mobile || ""
            ).trim();


        // ==========================================
        // FIND ALL BILLS OF THIS CUSTOMER
        // ==========================================

        const customerBills =
            bills.filter(bill => {

                const billCustomerId =
                    String(
                        bill.customerId || ""
                    ).trim();


                const billName =
                    String(
                        bill.customer ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                const billMobile =
                    String(
                        bill.mobile || ""
                    ).trim();


                // Customer ID match
                if (
                    customerId &&
                    billCustomerId &&
                    customerId ===
                        billCustomerId
                ) {

                    return true;

                }


                // Name + mobile match
                if (
                    customerName &&
                    billName ===
                        customerName
                ) {

                    if (
                        customerMobile &&
                        billMobile &&
                        customerMobile ===
                            billMobile
                    ) {

                        return true;
     
                         }
     
     
                         // Allow missing mobile
                         if (
                             !customerMobile ||
                             !billMobile ||
                             billMobile === "-"
                         ) {
     
                             return true;
     
                         }
     
                     }
     
     
                     return false;
     
                 });
     
     
             // ==========================================
             // TOTAL BILL PAYMENTS
             // FOR THIS CUSTOMER
             // ==========================================
     
             const totalCustomerBillPaid =
                 customerBills.reduce(
                     (
                         total,
                         bill
                     ) => {
     
                         return (
                             total +
                             getBillPaid(bill)
                         );
     
                     },
                     0
                 );
     
     
             // ==========================================
             // SORT PAYMENT HISTORY
             // OLDEST → NEWEST
             // ==========================================
     
             const payments =
                 [...customer.paymentHistory]
                     .sort((a, b) => {
     
                         const dateA =
                             getBillDate({
                                 date:
                                     a.date ||
                                     a.createdAt
                             });
     
                         const dateB =
                             getBillDate({
                                 date:
                                     b.date ||
                                     b.createdAt
                             });
     
     
                         return (
                             dateA - dateB
                         );
     
                     });
     
     
             let runningPaid = 0;
     
             let previousOpeningPaid = 0;
     
     
             // ==========================================
             // CALCULATE OPENING PORTION
             // OF EVERY PAYMENT
             // ==========================================
     
             payments.forEach(payment => {
     
                 const paymentAmount =
                     Math.max(
                         0,
                         parseAmount(
                             payment.amount
                         )
                     );
     
     
                 runningPaid +=
                     paymentAmount;
     
     
                 // Amount of all payments
                 // that has gone beyond
                 // total bill payments.
     
                 const currentOpeningPaid =
                     Math.max(
                         runningPaid -
                         totalCustomerBillPaid,
                         0
                     );
     
     
                 // Only the NEW portion
                 // belonging to opening balance.
     
                 const openingPortion =
                     Math.max(
                         currentOpeningPaid -
                         previousOpeningPaid,
                         0
                     );
     
     
                 previousOpeningPaid =
                     currentOpeningPaid;
     
                 const billPaymentPortion =
                 Math.max(paymentAmount - openingPortion, 0);    
     
                 // ==========================================
                 // CHECK PAYMENT DATE
                 // AGAINST CURRENT REPORT FILTER
                 // ==========================================
     
                 const paymentDate =
                     getBillDate({
                         date:
                             payment.date ||
                             payment.createdAt
                     });
     
     
                 let includePayment =
                     true;
     
     
                 if (
                     fromDate.value ||
                     toDate.value
                 ) {
     
                     let start = null;
     
                     let end = null;
     
     
                     // ------------------------------
                     // START DATE
                     // ------------------------------
     
                     if (
                         fromDate.value
                     ) {
     
                         const parts =
                             fromDate.value
                                 .split("-");
     
     
                         start =
                             new Date(
                                 Number(parts[0]),
                                 Number(parts[1]) - 1,
                                 Number(parts[2]),
                                 0,
                                 0,
                                 0,
                                 0
                             );
     
                     }
     
     
                     // ------------------------------
                     // END DATE
                     // ------------------------------
     
                     if (
                         toDate.value
                     ) {
     
                         const parts =
                             toDate.value
                                 .split("-");
     
     
                         end =
                             new Date(
                                 Number(parts[0]),
                                 Number(parts[1]) - 1,
                                 Number(parts[2]),
                                 23,
                                 59,
                                 59,
                                 999
                             );
     
                     }
     
     
                     if (
                         isNaN(
                             paymentDate.getTime()
                         )
                     ) {
     
                         includePayment = false;
     
                     }
     
     
                     if (
                         start &&
                         paymentDate < start
                     ) {
     
                         includePayment = false;
     
                     }
     
     
                     if (
                         end &&
                         paymentDate > end
                     ) {
     
                         includePayment = false;
     
                     }
     
                 }
     
     
                 if (!includePayment) {
         return;
     }
     
     let billPaymentOutsideBillDateFilter = 0;
     
     const hasDateFilter =
         Boolean(fromDate.value || toDate.value);
     
     if (
         hasDateFilter &&
         customerBills.length === 1 &&
         !reportBills.includes(customerBills[0])
     ) {
         const associatedBill = customerBills[0];
         const associatedBillDate = getBillDate(associatedBill);
     
         if (
             !isNaN(associatedBillDate.getTime()) &&
             paymentDate >= associatedBillDate
         ) {
             billPaymentOutsideBillDateFilter =
                 billPaymentPortion;
     
             billPayments +=
                 billPaymentOutsideBillDateFilter;
         }
     }


            // ==========================================
            // ADD OPENING BALANCE RECEIVED
            // ==========================================
            
            // Add transaction details for the PDF when requested.
            if (
                Array.isArray(openingBalanceReceiptRows) &&
                openingPortion > 0
            ) {
                openingBalanceReceiptRows.push({
                    customer:
                        customer.name ||
                        customerBills[0]?.customer ||
                        "Unknown Customer",
                    date:
                        payment.date ||
                        payment.paymentDate ||
                        payment.createdAt ||
                        "",
                    paymentMode: payment.paymentMode || "Cash",
                    amount: openingPortion,
                    remarks: payment.remarks || "-"
                });
            }
            
            openingBalanceReceived += openingPortion;


            // ==========================================
            // ADD OPENING PAYMENT TO ITS
            // PAYMENT METHOD
            // ==========================================

            const paymentMode =
                String(
                    payment.paymentMode ||
                    "Cash"
                )
                    .trim()
                    .toLowerCase();


            const paymentMethodAmount =
    openingPortion +
    billPaymentOutsideBillDateFilter;

        switch (paymentMode) {
            case "cash":
                cash += paymentMethodAmount;
                break;
        
            case "upi":
                upi += paymentMethodAmount;
                break;
        
            case "card":
                card += paymentMethodAmount;
                break;
        }

        });

    });


    // ==========================================
    // TOTAL AMOUNT RECEIVED
    // ==========================================

    amountReceived =
        billPayments +
        openingBalanceReceived;


    // ==========================================
    // TOTAL GST
    // ==========================================

    const totalGST =
        cgst + sgst;


    // ==========================================
    // PAYMENT SUMMARY
    // ==========================================

    cashTotalEl.textContent =
        formatCurrency(cash);


    upiTotalEl.textContent =
        formatCurrency(upi);


    cardTotalEl.textContent =
        formatCurrency(card);


    creditTotalEl.textContent =
        formatCurrency(credit);


    // ==========================================
    // BILL PAYMENTS
    // ==========================================

    const billPaymentsEl =
        document.getElementById(
            "billPaymentsTotal"
        );


    if (billPaymentsEl) {

        billPaymentsEl.textContent =
            formatCurrency(
                billPayments
            );

    }


    // ==========================================
    // OPENING BALANCE RECEIVED
    // ==========================================

    const openingBalanceReceivedEl =
    document.getElementById("openingBalanceReceivedTotal");

    const openingBalanceReceivedCardEl =
        document.getElementById("openingBalanceReceivedCard");
    
    if (openingBalanceReceivedEl) {
        openingBalanceReceivedEl.textContent =
            formatCurrency(openingBalanceReceived);
    }
    
    if (openingBalanceReceivedCardEl) {
        openingBalanceReceivedCardEl.textContent =
            formatCurrency(openingBalanceReceived);
    }


    // ==========================================
    // TOTAL AMOUNT RECEIVED
    // ==========================================

    const totalAmountReceivedEl =
        document.getElementById(
            "totalAmountReceived"
        );


    if (
        totalAmountReceivedEl
    ) {

        totalAmountReceivedEl.textContent =
            formatCurrency(
                amountReceived
            );

    }


    // ==========================================
    // EXISTING SUMMARY CARDS
    // ==========================================

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
            formatCurrency(
                fullyPaid
            );

    }


    if (creditBillsAmount) {

        creditBillsAmount.textContent =
            formatCurrency(
                credit
            );

    }


    if (amountReceivedEl) {

        amountReceivedEl.textContent =
            formatCurrency(
                amountReceived
            );

    }


    if (pendingAmountEl) {

        pendingAmountEl.textContent =
            formatCurrency(
                pendingAmount
            );

    }


    // ==========================================
    // GST SUMMARY
    // ==========================================

    cgstCollectedEl.textContent =
        formatCurrency(cgst);


    sgstCollectedEl.textContent =
        formatCurrency(sgst);


    totalGSTSummaryEl.textContent =
        formatCurrency(totalGST);

}
// ===========================================
// PART 4 STARTS HERE
// ===========================================
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

        const amount = getBillTotal(bill);

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

// ===========================================
// PAYMENT CHART
// ===========================================

function loadPaymentChart(reportBills, activityBills = reportBills) {

    let cash = 0;
    let upi = 0;
    let card = 0;
    let credit = 0;

    reportBills.forEach(bill => {

        const paidAmount = Math.max(
            0,
            Number(getBillPaid(bill)) || 0
        );

        const balanceAmount = Math.max(
            0,
            Number(getBillBalance(bill)) || 0
        );

        const mode = String(
            bill.paymentMode ||
            bill.paymentMethod ||
            ""
        ).trim().toLowerCase();

        // =================================
        // PAYMENT METHOD
        // ONLY FULLY PAID BILLS
        // =================================
        
        if (balanceAmount <= 0) {
        
            if (mode === "cash") {
        
                cash += paidAmount;
        
            } else if (mode === "upi") {
        
                upi += paidAmount;
        
            } else if (mode === "card") {
        
                card += paidAmount;
        
            }
        
        }


        // =================================
        // CREDIT / PENDING
        // =================================
        // IMPORTANT:
        // Credit must ALWAYS equal the
        // outstanding balance of the bill.
        //
        // Do NOT depend on paymentMode here.
        // =================================

        credit += balanceAmount;

    });

    cash = parseAmount(cashTotalEl.textContent);
    upi = parseAmount(upiTotalEl.textContent);
    card = parseAmount(cardTotalEl.textContent);
    
    credit = activityBills.reduce(
        (total, bill) => total + getBillBalance(bill),
        0
    );
    console.log("PAYMENT CHART VALUES:", {
        cash,
        upi,
        card,
        credit
    });


    // =================================
    // DESTROY OLD CHART
    // =================================

    if (paymentChart) {
        paymentChart.destroy();
    }


    const canvas =
        document.getElementById("paymentChart");

    if (!canvas) {
        console.error(
            "paymentChart canvas not found"
        );
        return;
    }


    const ctx =
        canvas.getContext("2d");


    // =================================
    // CREATE CHART
    // =================================

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
                ],

                borderColor: "#ffffff",

                borderWidth: 2

            }]

        },


        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    position: "bottom"
                },

                tooltip: {

                    callbacks: {

                        label: function(context) {

                            const value =
                                Number(
                                    context.raw || 0
                                );

                            return context.label +
                                ": " +
                                formatCurrency(value);

                        }

                    }

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

function loadTables(reportBills, activityBills = reportBills) {

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
            getBillTotal(bill);

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
            getBillTotal(bill);

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
// Rebuild these two maps using payment-linked bill activity.
// salesMap remains bill-date based for the Sales Report table.
Object.keys(customerMap).forEach(key => delete customerMap[key]);
Object.keys(productMap).forEach(key => delete productMap[key]);

activityBills.forEach(bill => {
    const customer = bill.customer || "Walk-in Customer";

    if (!customerMap[customer]) {
        customerMap[customer] = {
            bills: 0,
            amount: 0
        };
    }

    customerMap[customer].bills++;
    customerMap[customer].amount += getBillTotal(bill);

    if (Array.isArray(bill.items)) {
        bill.items.forEach(item => {
            const product =
                item.productName || item.product || "Unknown";

            if (!productMap[product]) {
                productMap[product] = {
                    qty: 0,
                    sales: 0
                };
            }

            productMap[product].qty += Number(item.qty || 0);
            productMap[product].sales += parseAmount(item.total);
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
        "salesTotalBills"
    );

const totalAmountElement =
    document.getElementById(
        "salesTotalAmount"
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
// CREDIT / OUTSTANDING STATEMENT
// ===========================================

function loadCreditStatement(reportBills) {

    const body =
        document.getElementById(
            "creditStatementBody"
        );

    if (!body) return;

    body.innerHTML = "";


    const customerMap = {};


    let totalCreditBills = 0;
    let totalCreditPurchase = 0;
    let totalCreditPaid = 0;
    let totalCreditBalance = 0;


    reportBills.forEach(bill => {

        const total =
            getBillTotal(bill);

        const paid =
            getBillPaid(bill);

        const balance =
            getBillBalance(bill);


        // Only outstanding bills
        if (balance <= 0) {
            return;
        }


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


        customerMap[customer].bills += 1;

        customerMap[customer].purchase +=
            total;

        customerMap[customer].paid +=
            paid;

        customerMap[customer].balance +=
            balance;


        // TOTALS

        totalCreditBills += 1;

        totalCreditPurchase +=
            total;

        totalCreditPaid +=
            paid;

        totalCreditBalance +=
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


        updateCreditTotals(
            0,
            0,
            0,
            0
        );

        return;

    }


    customers.forEach(
        ([name, data], index) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `
    <td class="text-center">${index + 1}</td>

    <td>
        <strong>${name}</strong>
    </td>

    <td class="text-center">${data.bills}</td>

    <td class="text-end">
        ${formatCurrency(data.purchase)}
    </td>

    <td class="text-end">
        ${formatCurrency(data.paid)}
    </td>

    <td class="text-end text-danger fw-bold">
        ${formatCurrency(data.balance)}
    </td>
   `;
            body.appendChild(row);

        }
    );


    // UPDATE CREDIT FOOTER

    updateCreditTotals(

        totalCreditBills,

        totalCreditPurchase,

        totalCreditPaid,

        totalCreditBalance

    );


    console.log(
        "CREDIT STATEMENT TOTAL:",
        {
            bills:
                totalCreditBills,

            purchase:
                totalCreditPurchase,

            paid:
                totalCreditPaid,

            balance:
                totalCreditBalance
        }
    );

}

// ===========================================
// UPDATE CREDIT TOTAL FOOTER
// ===========================================

function updateCreditTotals(
    bills,
    purchase,
    paid,
    balance
) {

    const billsElement =
        document.getElementById(
            "creditTotalBills"
        );

    const purchaseElement =
        document.getElementById(
            "creditTotalPurchase"
        );

    const paidElement =
        document.getElementById(
            "creditTotalPaid"
        );

    const balanceElement =
        document.getElementById(
            "creditTotalBalance"
        );


    if (billsElement) {

        billsElement.textContent =
            bills;

    }


    if (purchaseElement) {

        purchaseElement.textContent =
            formatCurrency(purchase);

    }


    if (paidElement) {

        paidElement.textContent =
            formatCurrency(paid);

    }


    if (balanceElement) {

        balanceElement.textContent =
            formatCurrency(balance);

    }

}

// ===========================================
// PAID BILLS STATEMENT
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
                getBillBalance(bill) <= 0
        );


    let totalPaidAmount = 0;

    const totalPaidBills =
        paidBills.length;


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


        updatePaidStatementTotals(
            0,
            0
        );

        return;

    }


    paidBills.forEach(
        (bill, index) => {

            const amount =
                getBillTotal(bill);


            totalPaidAmount +=
                amount;


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${bill.billNo || "-"}
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

                <td
                    class="text-success fw-bold">

                    ${formatCurrency(
                        amount
                    )}

                </td>

            `;


            body.appendChild(row);

        }
    );


    updatePaidStatementTotals(
        totalPaidBills,
        totalPaidAmount
    );

}

// ===========================================
// UPDATE PAID STATEMENT TOTAL
// ===========================================

function updatePaidStatementTotals(
    bills,
    amount
) {

    const billsElement =
        document.getElementById(
            "paidTotalBills"
        );

    const amountElement =
        document.getElementById(
            "paidTotalAmount"
        );


    if (billsElement) {

        billsElement.textContent =
            `${bills} Bills`;

    }


    if (amountElement) {

        amountElement.textContent =
            formatCurrency(amount);

    }

}
function updatePaidStatementTotals(bills, amount) {
    const billsElement = document.getElementById("paidTotalBills");
    const amountElement = document.getElementById("paidTotalAmount");

    if (billsElement) {
        billsElement.textContent = `${bills} Bills`;
        billsElement.style.setProperty("text-align", "left", "important");
    }

    if (amountElement) {
        amountElement.textContent = formatCurrency(amount);
        amountElement.style.setProperty("text-align", "left", "important");
    }
}
    // ===========================================
    // PART 6 STARTS HERE
    // ===========================================
    // ===========================================
    // PART 6 - MASTER LOADER
    // ===========================================
    function loadOpeningBalanceReceiptDetails(receipts = []) {
    const tbody = document.getElementById("openingBalanceReceiptsBody");
    const totalElement = document.getElementById("openingBalanceReceiptsTotal");
    const countElement = document.getElementById("openingBalanceReceiptCount");

    if (!tbody) return;

    const receiptRows = Array.isArray(receipts)
        ? receipts.filter(receipt => parseAmount(receipt.amount) > 0)
        : [];

    tbody.replaceChildren();

    if (receiptRows.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.className = "text-center text-muted py-4";
        cell.textContent = "No opening balance receipts in this date range";

        row.appendChild(cell);
        tbody.appendChild(row);
    } else {
        receiptRows.forEach(receipt => {
            const row = document.createElement("tr");
            const date = receipt.date
                ? formatDisplayDate(receipt.date)
                : "-";

            const values = [
                receipt.customer || "Unknown Customer",
                date,
                receipt.paymentMode || "Cash",
                formatCurrency(receipt.amount)
            ];

            values.forEach((value, index) => {
                const cell = document.createElement("td");
                cell.textContent = value;

                if (index === 3) {
                    cell.className = "text-end fw-semibold";
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    }

    const total = receiptRows.reduce(
        (sum, receipt) => sum + parseAmount(receipt.amount),
        0
    );

    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }

    if (countElement) {
        countElement.textContent =
            `${receiptRows.length} ${receiptRows.length === 1 ? "receipt" : "receipts"}`;
    }
    }
    function loadReports(reportBills) {
        const activityBills = getReportActivityBills(reportBills);
        const openingBalanceReceiptRows = [];
    
        loadSummaryCards(reportBills, activityBills);
    
        loadPaymentSummary(
            reportBills,
            activityBills,
            openingBalanceReceiptRows
        );
    
        loadOpeningBalanceReceiptDetails(openingBalanceReceiptRows);
    
        loadSalesChart(reportBills);
        loadPaymentChart(reportBills, activityBills);
        loadTables(reportBills, activityBills);
        loadCreditStatement(activityBills);
        loadPaidStatement(activityBills);
    } 
       
        function matchOpeningBalanceReceiptCardHeight() {
        const paymentSummaryCard = document.querySelector(
            ".payment-summary-card .dashboard-card"
        );
    
        const receiptDetailsCard = document.querySelector(
            ".opening-balance-receipts-card"
        );
    
        if (!paymentSummaryCard || !receiptDetailsCard) {
            return;
        }
    
        if (window.matchMedia("(min-width: 992px)").matches) {
            const summaryHeight =
                paymentSummaryCard.getBoundingClientRect().height;
    
            receiptDetailsCard.style.setProperty(
                "--payment-summary-height",
                `${summaryHeight}px`
            );
        } else {
            receiptDetailsCard.style.removeProperty(
                "--payment-summary-height"
            );
        }
    }
    
    window.addEventListener("resize", matchOpeningBalanceReceiptCardHeight);
    
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
    const activityBills = getReportActivityBills(reportBills);
    const openingBalanceReceiptRows = [];

    // Use the existing payment calculation and collect its opening-balance details.
    loadPaymentSummary(
        reportBills,
        activityBills,
        openingBalanceReceiptRows
    );

    const amountReceived = parseAmount(
        document.getElementById("totalAmountReceived")?.textContent
    );

    const billPayments = parseAmount(
        document.getElementById("billPaymentsTotal")?.textContent
    );

    const openingBalanceReceived = parseAmount(
        document.getElementById("openingBalanceReceivedTotal")?.textContent
    );

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const settings = db.settings || {};
    const shopName = settings.shopName || "SVSS Billing System";
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const formatPdfAmount = value =>
        `Rs. ${Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    const formatFilterDate = value => {
        if (!value) return "";

        const [year, month, day] = value.split("-").map(Number);

        if (!year || !month || !day) return value;

        return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    let reportPeriod = "All dates";

    if (fromDate.value && toDate.value) {
        reportPeriod =
            `${formatFilterDate(fromDate.value)} to ${formatFilterDate(toDate.value)}`;
    } else if (fromDate.value) {
        reportPeriod = `From ${formatFilterDate(fromDate.value)}`;
    } else if (toDate.value) {
        reportPeriod = `Up to ${formatFilterDate(toDate.value)}`;
    }

    let totalSales = 0;
    let creditSales = 0;

    const rows = reportBills.map(bill => {
        const amount = getBillTotal(bill);
        const paymentMode = String(bill.paymentMode || "-").trim();

        totalSales += amount;

        if (paymentMode.toLowerCase() === "credit") {
            creditSales += amount;
        }

        return [
            bill.billNo || "-",
            formatDisplayDate(bill.date),
            bill.customer || "Walk-in Customer",
            paymentMode,
            formatPdfAmount(amount)
        ];
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(24, 49, 86);
    doc.text(shopName, pageWidth / 2, 15, {
        align: "center",
        maxWidth: pageWidth - margin * 2
    });

    doc.setDrawColor(190, 207, 226);
    doc.line(margin, 20, pageWidth - margin, 20);

    doc.setFontSize(18);
    doc.text("SALES REPORT", pageWidth / 2, 29, {
        align: "center"
    });

    doc.setFontSize(10);
    doc.text(`Report Period: ${reportPeriod}`, pageWidth / 2, 36, {
        align: "center"
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(95, 105, 120);
    doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        margin,
        43
    );

    const summaryCards = [
        { label: "Total Bills", value: String(reportBills.length) },
        { label: "Total Sales", value: formatPdfAmount(totalSales) },
        { label: "Credit Sales", value: formatPdfAmount(creditSales) },
        { label: "Bill Payments", value: formatPdfAmount(billPayments) },
        {
            label: "Opening Balance Received",
            value: formatPdfAmount(openingBalanceReceived)
        },
        {
            label: "Total Amount Received",
            value: formatPdfAmount(amountReceived)
        }
    ];

    const cardGap = 4;
    const cardY = 49;
    const cardHeight = 20;
    const cardsPerRow = 3;
    const cardRowGap = 3;
    const cardWidth =
        (pageWidth - margin * 2 - cardGap * (cardsPerRow - 1)) /
        cardsPerRow;

    summaryCards.forEach((card, index) => {
        const row = Math.floor(index / cardsPerRow);
        const column = index % cardsPerRow;
        const x = margin + column * (cardWidth + cardGap);
        const y = cardY + row * (cardHeight + cardRowGap);

        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(193, 218, 244);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(75, 91, 112);
        doc.text(card.label, x + cardWidth / 2, y + 7, {
            align: "center",
            maxWidth: cardWidth - 3
        });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(24, 49, 86);
        doc.text(card.value, x + cardWidth / 2, y + 15, {
            align: "center",
            maxWidth: cardWidth - 3
        });
    });

    // Create the sales table first.
    doc.autoTable({
        startY: 98,
        margin: {
            left: margin,
            right: margin,
            bottom: 16
        },
        head: [[
            "Bill No",
            "Date",
            "Customer",
            "Payment Mode",
            "Amount"
        ]],
        body: rows,
        foot: [[
            "",
            "",
            "",
            "GRAND TOTAL",
            formatPdfAmount(totalSales)
        ]],
        showFoot: "lastPage",
        theme: "grid",
        styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak",
            textColor: [55, 62, 72],
            lineColor: [215, 223, 232],
            lineWidth: 0.15
        },
        headStyles: {
            fillColor: [46, 130, 186],
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },
        alternateRowStyles: {
            fillColor: [245, 248, 252]
        },
        footStyles: {
            fillColor: [225, 240, 255],
            textColor: [24, 49, 86],
            fontStyle: "bold"
        },
        columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 25 },
            2: { cellWidth: 70 },
            3: { cellWidth: 29 },
            4: { cellWidth: 26, halign: "right" }
        }
    });

    // Add customer-level opening-balance receipts below the sales table.
    if (openingBalanceReceiptRows.length > 0) {
        let receiptSectionY = doc.lastAutoTable.finalY + 12;

        if (receiptSectionY > pageHeight - 45) {
            doc.addPage();
            receiptSectionY = 20;
        }

        const openingBalanceReceiptTotal =
            openingBalanceReceiptRows.reduce(
                (total, receipt) => total + receipt.amount,
                0
            );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(24, 49, 86);
        doc.text("Opening Balance Receipts", margin, receiptSectionY);

        doc.autoTable({
            startY: receiptSectionY + 5,
            margin: {
                left: margin,
                right: margin,
                bottom: 16
            },
            head: [[
                "Customer",
                "Payment Date",
                "Payment Mode",
                "Opening Balance Received",
                "Remarks"
            ]],
            body: openingBalanceReceiptRows.map(receipt => [
                receipt.customer,
                receipt.date
                    ? formatDisplayDate(receipt.date)
                    : "-",
                receipt.paymentMode,
                formatPdfAmount(receipt.amount),
                receipt.remarks
            ]),
            foot: [[
                "",
                "",
                "TOTAL",
                formatPdfAmount(openingBalanceReceiptTotal),
                ""
            ]],
            showFoot: "lastPage",
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 8,
                cellPadding: 2,
                overflow: "linebreak",
                textColor: [55, 62, 72],
                lineColor: [215, 223, 232],
                lineWidth: 0.15
            },
            headStyles: {
                fillColor: [46, 130, 186],
                textColor: [255, 255, 255],
                fontStyle: "bold"
            },
            alternateRowStyles: {
                fillColor: [245, 248, 252]
            },
            footStyles: {
                fillColor: [225, 240, 255],
                textColor: [24, 49, 86],
                fontStyle: "bold"
            },
            columnStyles: {
                0: { cellWidth: 48 },
                1: { cellWidth: 27 },
                2: { cellWidth: 28 },
                3: { cellWidth: 49, halign: "right" },
                4: { cellWidth: "auto" }
            }
        });
    }

    const pageCount = doc.internal.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 108, 118);
        doc.text(
            `Page ${page} of ${pageCount}`,
            pageWidth - margin,
            pageHeight - 7,
            { align: "right" }
        );
    }

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

            const balance = getBillBalance(bill);

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
                getBillTotal(bill);

            customerMap[customer].paid +=
                getBillPaid(bill);

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
                    getBillBalance(bill) <= 0
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
            getBillTotal(bill);

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