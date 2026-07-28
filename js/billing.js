document.addEventListener("DOMContentLoaded", async () => {

    // ==============================
    // DOM ELEMENTS
    // ==============================

    const billNo = document.getElementById("billNo");
    const customerName = document.getElementById("customerName");
    const mobile = document.getElementById("mobile");
    const address = document.getElementById("address");
    const customerSuggestion = document.getElementById("customerSuggestion");
    const billDate = document.getElementById("billDate");

    const searchProduct = document.getElementById("searchProduct");
    const productList = document.getElementById("productList");

    const unit = document.getElementById("unit");
    const rate = document.getElementById("rate");

    const cgst = document.getElementById("cgst");
    const sgst = document.getElementById("sgst");
    const gst = document.getElementById("gst");

    const quantity = document.getElementById("quantity");
    const amount = document.getElementById("amount");

    const addItem = document.getElementById("addItem");

    const billTableBody = document.getElementById("billTableBody");

    const subTotal = document.getElementById("subTotal");
    const gstTotal = document.getElementById("gstTotal");
    const discount = document.getElementById("discount");
    const grandTotal = document.getElementById("grandTotal");

    const amountPaid = document.getElementById("amountPaid");
    const balanceDue = document.getElementById("balanceDue");
    const paymentStatus = document.getElementById("paymentStatus");

    const paymentMode = document.getElementById("paymentMode");

    const saveBill = document.getElementById("saveBill");
    const newBill = document.getElementById("newBill");

    const printBill = document.getElementById("printBill");
    const printBillBottom = document.getElementById("printBillBottom");

    // ==============================
    // DATABASE
    // ==============================

    let db = await window.api.getDatabase();

    let products = db.products || [];

    let customerDatabase = db.customers || [];

    let bills = db.bills || [];

    let settings = db.settings || {};

    let billItems = [];

    let selectedProduct = null;

    // ==============================
    // REFRESH DATABASE
    // ==============================

    async function refreshDatabase() {

        db = await window.api.getDatabase();

        products = db.products || [];

        customerDatabase = db.customers || [];

        bills = db.bills || [];

        settings = db.settings || {};

    }

    // ==============================
    // SAVE DATABASE
    // ==============================

    async function saveDatabase() {

        db.products = products;

        db.customers = customerDatabase;

        db.bills = bills;

        db.settings = settings;

        await window.api.saveDatabase(db);

    }

    // ==============================
    // TODAY DATE
    // ==============================

    billDate.value =
        new Date().toISOString().split("T")[0];

    // ==============================
    // BILL NUMBER
    // ==============================

    function generateBillNumber() {

        const prefix =
            settings.invoicePrefix || "SVSS";

       const now = new Date();

       const day =String(now.getDate()).padStart(2, "0");
       
       const month =String(now.getMonth() + 1).padStart(2, "0");
       
       const year =String(now.getFullYear()).slice(-2);
       
       let nextBillNo = 1;

if (bills.length > 0) {

    const lastBill = bills[bills.length - 1];

    if (lastBill.billNo) {

        const parts = lastBill.billNo.split("-");

        const lastSerial = parseInt(parts[2], 10);

        if (!isNaN(lastSerial)) {

            nextBillNo = lastSerial + 1;

        }

    }

}

const serial = String(nextBillNo).padStart(4, "0");

        billNo.value =`${prefix}-${day}${month}${year}-${serial}`;

    }

    generateBillNumber();

    // ==============================
    // FULL PAID BUTTON
    // ==============================

    document
        .getElementById("fullPaidBtn")
        .addEventListener("click", function () {

            const total =
                parseFloat(
                    grandTotal.innerText.replace(/[^\d.]/g, "")
                ) || 0;

            amountPaid.value = total.toFixed(2);

            balanceDue.value = "₹0.00";

            paymentStatus.value = "Paid";

        });

    // ==============================
    // CALCULATE AMOUNT
    // ==============================

    function calculateAmount() {

        const qty =
            parseFloat(quantity.value) || 0;

        const price =
            parseFloat(rate.value) || 0;

        const basic =
            qty * price;

        amount.value =
            basic.toFixed(2);

    }

    quantity.addEventListener(
        "input",
        calculateAmount
    );

    rate.addEventListener(
        "input",
        calculateAmount
    );

    // ==============================
    // PART 2 STARTS HERE
    // ==============================
    // ==============================
// PRODUCT SEARCH
// ==============================

searchProduct.addEventListener("keyup", async function () {

    await refreshDatabase();

    const keyword = this.value.toLowerCase().trim();

    productList.innerHTML = "";

    if (keyword === "") {

        productList.style.display = "none";
        return;

    }

    const result = products.filter(product =>

        product.productName.toLowerCase().includes(keyword) ||

        product.code.toLowerCase().includes(keyword)

    );

    if (result.length === 0) {

        productList.style.display = "none";
        return;

    }

    productList.style.display = "block";

    result.forEach(product => {

        const item = document.createElement("a");

        item.href = "#";

        item.className =
            "list-group-item list-group-item-action";

        item.innerHTML =
            `<strong>${product.code}</strong> - ${product.productName}`;

        item.onclick = function (e) {

            e.preventDefault();

            selectedProduct = product;

            searchProduct.value = product.productName;

            unit.value = product.unit;

            rate.value = product.Rate;

            cgst.value = product.cgst;

            sgst.value = product.sgst;

            gst.value = product.gst;

            if (product.unit === "Meter") {

                quantity.min = "0.01";
                quantity.step = "0.01";
                quantity.value = "1.00";

            } else {

                quantity.min = "1";
                quantity.step = "1";
                quantity.value = "1";

            }

            calculateAmount();

            productList.innerHTML = "";

            productList.style.display = "none";

            rate.focus();

        };

        productList.appendChild(item);

    });

});

// ==============================
// SAVE CUSTOMER
// ==============================

async function saveCustomer() {

    const name = customerName.value.trim();

    if (name === "") return;

    await refreshDatabase();

    const existing = customerDatabase.find(c =>
        c.mobile === mobile.value.trim()
    );

    if (existing) {

        existing.name = name;

        existing.mobile = mobile.value.trim();

        existing.address = address.value.trim();

    } else {

        customerDatabase.push({

            name: name,

            mobile: mobile.value.trim(),

            address: address.value.trim()

        });

    }

    await saveDatabase();

}

// ==============================
// CUSTOMER SEARCH
// ==============================

customerName.addEventListener("keyup", async function () {

    await refreshDatabase();

    const text = this.value.toLowerCase().trim();

    customerSuggestion.innerHTML = "";

    if (text === "") {

        customerSuggestion.style.display = "none";

        return;

    }

    const result = customerDatabase.filter(c =>

        c.name.toLowerCase().includes(text) ||

        c.mobile.includes(text)

    );

    if (result.length === 0) {

        customerSuggestion.style.display = "none";

        return;

    }

    customerSuggestion.style.display = "block";

    result.forEach(customer => {

        const item = document.createElement("a");

        item.href = "#";

        item.className =
            "list-group-item list-group-item-action";

        item.innerHTML = `
            <strong>${customer.name}</strong><br>
            📞 ${customer.mobile}<br>
            📍 ${customer.address || ""}
        `;

        item.onclick = function (e) {

            e.preventDefault();

            customerName.value = customer.name;

            mobile.value = customer.mobile;

            address.value = customer.address;

            customerSuggestion.style.display = "none";

        };

        customerSuggestion.appendChild(item);

    });

});

// ==============================
// PART 3 STARTS HERE
// ==============================
// ==============================
// ADD ITEM
// ==============================

addItem.addEventListener("click", function () {

    if (!selectedProduct) {

        showToast("Please select a product.","info");
        return;

    }

    const qty = parseFloat(quantity.value);

    if (isNaN(qty) || qty <= 0) {

        showToast("Enter valid quantity.","warning" );
        return;

    }

    const price = parseFloat(rate.value) || 0;

    const cgstPercent = parseFloat(cgst.value) || 0;

    const sgstPercent = parseFloat(sgst.value) || 0;

    const gstPercent = parseFloat(gst.value) || 0;

    const basicAmount = qty * price;

    const gstAmount = (basicAmount * gstPercent) / 100;

    const totalAmount = basicAmount + gstAmount;

    billItems.push({

        code: selectedProduct.code,

        productName: selectedProduct.productName,

        unit: selectedProduct.unit,

        qty: qty,

        rate: price,

        cgst: cgstPercent,

        sgst: sgstPercent,

        gst: gstPercent,

        basic: basicAmount,

        gstAmount: gstAmount,

        total: totalAmount

    });

    renderBillTable();

    clearProductSelection();

});

// ==============================
// RENDER BILL TABLE
// ==============================

function renderBillTable() {

    billTableBody.innerHTML = "";

    billItems.forEach((item, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${item.code}</td>

            <td>${item.productName}</td>

            <td>${item.unit}</td>

            <td>

                ${item.unit === "Meter"

                    ? Number(item.qty).toFixed(2) + " Meter"

                    : parseInt(item.qty) + " Piece"}

            </td>

            <td>${item.rate.toFixed(2)}</td>

            <td>${item.cgst}%</td>

            <td>${item.sgst}%</td>

            <td>${item.gst}%</td>

            <td>₹${item.total.toFixed(2)}</td>

            <td>

                <button

                    class="btn btn-danger btn-sm removeItem"

                    data-index="${index}">

                    <i class="bi bi-trash"></i>

                </button>

            </td>

        `;

        billTableBody.appendChild(row);

    });

    calculateTotals();

}

// ==============================
// CALCULATE BALANCE
// ==============================

function calculateBalance() {

    const total =

        parseFloat(

            grandTotal.innerText.replace(/[^\d.]/g, "")

        ) || 0;

    let paid = parseFloat(amountPaid.value);

    if (isNaN(paid) || paid < 0) {

        paid = 0;

    }

    if (paid > total) {

        paid = total;

        amountPaid.value = total.toFixed(2);

    }

    const balance = total - paid;

    balanceDue.value = "₹" + balance.toFixed(2);

    paymentStatus.value =

        balance === 0 ? "Paid" : "Pending";

}

amountPaid.addEventListener(

    "input",

    calculateBalance

);

// ==============================
// REMOVE ITEM
// ==============================

billTableBody.addEventListener("click", function (e) {

    const button = e.target.closest(".removeItem");

    if (!button) return;

    const index = Number(button.dataset.index);

    billItems.splice(index, 1);

    renderBillTable();

});

// ==============================
// CLEAR PRODUCT
// ==============================

function clearProductSelection() {

    selectedProduct = null;

    searchProduct.value = "";

    unit.value = "";

    rate.value = "";

    cgst.value = "";

    sgst.value = "";

    gst.value = "";

    quantity.value = "";

    amount.value = "";

}

// ==============================
// CALCULATE TOTALS
// ==============================

function calculateTotals() {

    let sub = 0;

    let gstValue = 0;

    billItems.forEach(item => {

        sub += item.basic;

        gstValue += item.gstAmount;

    });

    const discountValue =

        parseFloat(discount.value) || 0;

    const grand =

        sub + gstValue - discountValue;

    subTotal.innerHTML =

        "₹" + sub.toFixed(2);

    gstTotal.innerHTML =

        "₹" + gstValue.toFixed(2);

    grandTotal.innerHTML =

        "₹" + grand.toFixed(2);

    calculateBalance();

}

// ==============================
// DISCOUNT EVENT
// ==============================

discount.addEventListener("input", () => {

    calculateTotals();

});

// ==============================
// PART 4 STARTS HERE
// ==============================
// ==============================
// RESET BILL FORM
// ==============================

function resetBillForm() {

    customerName.value = "Walk-in Customer";

    mobile.value = "";

    address.value = "";

    billDate.value =
        new Date().toISOString().split("T")[0];

    paymentMode.value = "Cash";

    clearProductSelection();

    billItems = [];

    billTableBody.innerHTML = "";

    discount.value = 0;

    subTotal.innerHTML = "₹0.00";

    gstTotal.innerHTML = "₹0.00";

    grandTotal.innerHTML = "₹0.00";

    amountPaid.value = "";

    balanceDue.value = "";

    paymentStatus.value = "";

    customerSuggestion.innerHTML = "";

    customerSuggestion.style.display = "none";

    generateBillNumber();

    customerName.focus();

}

// ==============================
// NEW BILL
// ==============================

newBill.addEventListener("click", function () {

    if (!confirm("Start a new bill?")) return;

    resetBillForm();

});

// ==============================
// SAVE BILL
// ==============================

async function saveCurrentBill() {

    calculateBalance();

    if (billItems.length === 0) {

        showToast("Please add at least one product.","error");

        return false;

    }

    await refreshDatabase();

    const enteredBillNo = billNo.value.trim();

    const alreadyExists = bills.some(bill =>
        bill.billNo === enteredBillNo
    );

    if (alreadyExists) {

        showToast(
            "Bill Number already exists.\nGenerating next Bill Number.","warning"
        );

        

        await saveDatabase();

        generateBillNumber();

        return false;

    }

    await saveCustomer();

    const bill = {

        billNo: enteredBillNo,

        customer:
            customerName.value || "Walk-in Customer",

        mobile: mobile.value,

        address: address.value,

        date: billDate.value,

        paymentMode: paymentMode.value,

        amountPaid:
            parseFloat(amountPaid.value) || 0,

        balanceDue:
            parseFloat(
                balanceDue.value.replace(/[^\d.]/g, "")
            ) || 0,

        paymentStatus: paymentStatus.value,

        items: billItems,

        subTotal: subTotal.innerText,

        gstTotal: gstTotal.innerText,

        discount: discount.value,

        grandTotal: grandTotal.innerText

    };

    bills.push(bill);

    

    await saveDatabase();

    return true;

}

// ==============================
// SAVE BUTTON
// ==============================

saveBill.addEventListener("click", async function () {

    const ok = await saveCurrentBill();

    if (!ok) return;

    showToast("Bill Saved Successfully.","Success");

    resetBillForm();

});

// ==============================
// PART 5 STARTS HERE
// ==============================
// ==============================
// PRINT BILL
// ==============================

async function printInvoice() {

    const saved = await saveCurrentBill();

    if (!saved) return;

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    // ==========================
    // SHOP DETAILS
    // ==========================

    const SHOP_NAME =
        settings.shopName ||
        "Sri Venkata Siva Sai Cloth & Matchings";

    const SHOP_ADDRESS =
        settings.address ||
        "Opp Sai Lodge, R.R.Road, Chirala";

    const SHOP_PHONE =
        settings.mobile || "";

    // ==========================
    // HEADER
    // ==========================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);

    doc.text(
        SHOP_NAME,
        105,
        18,
        { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(
        SHOP_ADDRESS,
        105,
        25,
        { align: "center" }
    );

    if (SHOP_PHONE !== "") {

        doc.text(
            "Phone : " + SHOP_PHONE,
            105,
            31,
            { align: "center" }
        );

    }

    doc.line(10, 36, 200, 36);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);

    doc.text(
        "TAX INVOICE",
        105,
        44,
        { align: "center" }
    );

    // ==========================
    // CUSTOMER DETAILS
    // ==========================

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(
        "Bill No : " + billNo.value,
        14,
        55
    );

    doc.text(
    "Date : " + formatDisplayDate(billDate.value),
    150,
    55
    );

    doc.text(
        "Customer : " + customerName.value,
        14,
        63
    );

    doc.text(
        "Mobile : " +
        (mobile.value || "-"),
        14,
        71
    );

    const addressText =
        "Address : " +
        (address.value || "-");

    const addressLines =
        doc.splitTextToSize(
            addressText,
            120
        );

    doc.text(
        addressLines,
        14,
        79
    );

    doc.text(
        "Payment : " +
        paymentMode.value,
        150,
        79
    );

    // ==========================
    // PRODUCT TABLE
    // ==========================

    const rows = billItems.map(item => [

        item.code,

        item.productName,

        item.unit,

        item.qty + " " + item.unit,

        item.rate.toFixed(2),

        item.cgst + "%",

        item.sgst + "%",

        item.gst + "%",

        item.total.toFixed(2)

    ]);

    const tableY =
        79 + (addressLines.length * 7) + 5;

    doc.autoTable({

        startY: tableY,

        head: [[

            "Code",

            "Product",

            "Unit",

            "Qty",

            "Rate",

            "CGST",

            "SGST",

            "GST",

            "Total"

        ]],

        body: rows,

        theme: "grid",

        headStyles: {

            fillColor: [41, 128, 185],

            textColor: 255,

            halign: "center"

        },

        bodyStyles: {

            halign: "center"

        }

    });

    let y =
        doc.lastAutoTable.finalY + 12;

    // ==========================
    // TOTALS
    // ==========================

    doc.setFont("helvetica", "bold");

    doc.text(
        "Sub Total : " +
        subTotal.innerText.replace("₹", "Rs. "),
        135,
        y
    );

    y += 8;

    const totalGST =
        parseFloat(
            gstTotal.innerText.replace(/[^\d.]/g, "")
        ) || 0;

    doc.text(
        "CGST : Rs. " +
        (totalGST / 2).toFixed(2),
        135,
        y
    );

    y += 8;

    doc.text(
        "SGST : Rs. " +
        (totalGST / 2).toFixed(2),
        135,
        y
    );

    y += 8;

    doc.text(
        "Total GST : " +
        gstTotal.innerText.replace("₹", "Rs. "),
        135,
        y
    );

    y += 8;

    doc.text(
        "Discount : Rs. " +
        discount.value,
        135,
        y
    );

    y += 8;

    doc.setFontSize(13);

    doc.text(
        "Grand Total : " +
        grandTotal.innerText.replace("₹", "Rs. "),
        135,
        y
    );

    y += 8;

    doc.setFontSize(11);

    doc.text(
        "Amount Paid : Rs. " +
        Number(amountPaid.value || 0).toFixed(2),
        135,
        y
    );

    y += 8;

    doc.text(
        "Balance Due : " +
        balanceDue.value.replace("₹", "Rs. "),
        135,
        y
    );

    y += 8;

    doc.text(
        "Status : " +
        paymentStatus.value,
        135,
        y
    );

    y += 20;

    // ==========================
    // SIGNATURE
    // ==========================

    doc.line(
        140,
        y,
        195,
        y
    );

    doc.setFontSize(10);

    doc.text(
        "Authorized Signature",
        167,
        y + 6,
        { align: "center" }
    );

    // ==========================
    // FOOTER
    // ==========================

    doc.setFontSize(11);

    doc.text(
        "Thank you for shopping with us!",
        105,
        285,
        { align: "center" }
    );

    const pdfFileName =
    `SVSS_Bill_${billNo.value.split("-").pop()}_${formatDisplayDate(billDate.value)}.pdf`;

    doc.save(pdfFileName);

    setTimeout(() => {

        const choice = confirm(
            "Bill Saved & Printed Successfully!\n\nCreate New Bill?"
        );

        if (choice) {

            resetBillForm();

        }

    }, 500);

}

// ==============================
// PART 6 STARTS HERE
// ==============================
// ==============================
// PRINT BUTTONS
// ==============================

if (printBill) {

    printBill.addEventListener("click", async function () {

        await printInvoice();

    });

}

if (printBillBottom) {

    printBillBottom.addEventListener("click", async function () {

        await printInvoice();

    });

}

// ==============================
// INITIALIZE PAGE
// ==============================

(async function () {

    await refreshDatabase();

    generateBillNumber();

    calculateTotals();

    calculateBalance();

    customerSuggestion.innerHTML = "";

    customerSuggestion.style.display = "none";

    billDate.value =
        new Date().toISOString().split("T")[0];

    customerName.focus();

})();

// ==============================
// AUTO HIDE PRODUCT LIST
// ==============================

document.addEventListener("click", function (e) {

    if (

        !searchProduct.contains(e.target) &&

        !productList.contains(e.target)

    ) {

        productList.style.display = "none";

    }

});

// ==============================
// AUTO HIDE CUSTOMER LIST
// ==============================

document.addEventListener("click", function (e) {

    if (

        !customerName.contains(e.target) &&

        !customerSuggestion.contains(e.target)

    ) {

        customerSuggestion.style.display = "none";

    }

});

// ==============================
// ENTER KEY SUPPORT
// ==============================

searchProduct.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        e.preventDefault();

        if (rate) {

            rate.focus();

        }

    }

});

quantity.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        e.preventDefault();

        addItem.click();

    }

});

// ==============================
// WINDOW BEFORE UNLOAD
// ==============================

window.addEventListener("beforeunload", async () => {

    await saveDatabase();

});

// ======================================
// Keyboard Shortcuts - Billing
// ======================================

// Ctrl + N → New Bill
document.addEventListener("svss:new", () => {

    newBill.click();

});

// Ctrl + S → Save Bill
document.addEventListener("svss:save", () => {

    saveBill.click();

});

// Ctrl + P → Print Bill
document.addEventListener("svss:print", () => {

    if (printBill) {

        printBill.click();

    }

});

// Ctrl + F → Focus Product Search
document.addEventListener("svss:search", () => {

    searchProduct.focus();
    searchProduct.select();

});

// Esc → Hide Suggestions
document.addEventListener("svss:escape", () => {

    productList.style.display = "none";

    customerSuggestion.style.display = "none";

});
// ==============================
// BILLING.JS COMPLETED
// ==============================

});