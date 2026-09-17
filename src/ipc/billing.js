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
    const billBookNo = document.getElementById("billBookNo");

    const noOfBales =document.getElementById("noOfBales");
    
    const transport =document.getElementById("transport");
    
    const lrNo =document.getElementById("lrNo");
    
    const deliveryShopNo =document.getElementById("deliveryShopNo");
    
    const saveBill = document.getElementById("saveBill");
    const newBill = document.getElementById("newBill");

    const printBill = document.getElementById("printBill");
    const printBillBottom = document.getElementById("printBillBottom");

    // ==========================================
// BILL DATE PICKER
// ==========================================

const billDatePicker = flatpickr("#billDate", {
    dateFormat: "d-m-Y",
    allowInput: false,
    clickOpens: true,
    disableMobile: true,
    defaultDate: new Date(),

    onChange: function (selectedDates, dateStr) {
        billDate.value = dateStr;

        billDate.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );
    }
});

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

    const today = new Date();

    billDate.value =
    String(today.getDate()).padStart(2, "0") + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    today.getFullYear();

    // ==============================
    // BILL NUMBER
    // ==============================

    async function generateBillNumber() {

    await refreshDatabase();

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

   await generateBillNumber();

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

    const actualAmount = qty * price;

    const roundedAmount =
        Number.isInteger(actualAmount)
            ? actualAmount
            : Math.ceil(actualAmount);

    amount.value =
        roundedAmount.toFixed(2);

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
// PRODUCT SEARCH + KEYBOARD NAVIGATION
// ==============================

let productResults = [];
let productSelectedIndex = -1;


// --------------------------------
// Select Product
// --------------------------------

function selectProduct(product) {

    selectedProduct = product;

    searchProduct.value = product.productName;

    unit.value = product.unit;
    rate.value = product.Rate;

    cgst.value = product.cgst;
    sgst.value = product.sgst;
    gst.value = product.gst;


    // Meter product
    if (product.unit === "Meter") {

        quantity.min = "0.01";
        quantity.step = "0.01";
        quantity.value = "1.00";

    }

    // Piece product
    else {

        quantity.min = "1";
        quantity.step = "1";
        quantity.value = "1";

    }


    calculateAmount();


    // Hide suggestions
    productList.innerHTML = "";
    productList.style.display = "none";


    // Reset keyboard selection
    productSelectedIndex = -1;


    // Move to Rate
    rate.focus();
}


// --------------------------------
// Highlight suggestion
// --------------------------------

function highlightProduct(index) {

    const items =
        productList.querySelectorAll(".product-suggestion-item");

    if (items.length === 0) return;


    // Keep index inside range
    if (index < 0) {
        index = items.length - 1;
    }

    if (index >= items.length) {
        index = 0;
    }


    productSelectedIndex = index;


    // Remove previous highlight
    items.forEach(item => {
        item.classList.remove("active");
    });


    // Add highlight
    const selectedItem = items[index];

    selectedItem.classList.add("active");


    // Keep selected item visible
    selectedItem.scrollIntoView({
        block: "nearest"
    });
}


// --------------------------------
// Search Product
// --------------------------------

searchProduct.addEventListener("input", async function () {

    await refreshDatabase();


    const keyword =
        this.value.toLowerCase().trim();


    productList.innerHTML = "";

    productSelectedIndex = -1;


    if (keyword === "") {

        productList.style.display = "none";

        return;
    }


    productResults = products.filter(product =>

        product.productName
            .toLowerCase()
            .includes(keyword)

        ||

        product.code
            .toLowerCase()
            .includes(keyword)

    );


    if (productResults.length === 0) {

        productList.style.display = "none";

        return;
    }


    productList.style.display = "block";


    productResults.forEach((product, index) => {

        const item =
            document.createElement("a");


        item.href = "#";


        item.className =
            "list-group-item list-group-item-action product-suggestion-item";


        item.innerHTML =
            `<strong>${product.code}</strong> - ${product.productName}`;


        // --------------------------------
        // Mouse click
        // --------------------------------

        item.addEventListener("click", function (e) {

            e.preventDefault();

            selectProduct(product);

        });


        productList.appendChild(item);

    });

});


// --------------------------------
// Keyboard Navigation
// --------------------------------

searchProduct.addEventListener("keydown", function (e) {

    const items =
        productList.querySelectorAll(
            ".product-suggestion-item"
        );


    // If no suggestions
    if (
        productList.style.display === "none" ||
        items.length === 0
    ) {

        // Enter with no selection
        if (e.key === "Enter") {

            e.preventDefault();

            if (rate) {
                rate.focus();
            }

        }

        return;
    }


    // ==============================
    // ARROW DOWN
    // ==============================

    if (e.key === "ArrowDown") {

        e.preventDefault();

        highlightProduct(
            productSelectedIndex + 1
        );

        return;
    }


    // ==============================
    // ARROW UP
    // ==============================

    if (e.key === "ArrowUp") {

        e.preventDefault();

        highlightProduct(
            productSelectedIndex - 1
        );

        return;
    }


    // ==============================
    // ENTER
    // ==============================

    if (e.key === "Enter") {

        e.preventDefault();


        // If nothing is highlighted,
        // select the first suggestion
        if (productSelectedIndex < 0) {

            productSelectedIndex = 0;

        }


        const product =
            productResults[productSelectedIndex];


        if (product) {

            selectProduct(product);

        }

        return;
    }


    // ==============================
    // ESC
    // ==============================

    if (e.key === "Escape") {

        e.preventDefault();

        productList.innerHTML = "";

        productList.style.display = "none";

        productSelectedIndex = -1;

        return;
    }

});

// ==============================
// SAVE CUSTOMER
// ==============================

async function saveCustomer() {

    const name = customerName.value.trim();

    if (name === "") return;

    customerDatabase = (await window.api.getCustomers()) || [];

    const mobileNo = mobile.value.trim();
    const customer = customerName.value.trim().toLowerCase();
    
    const existing = customerDatabase.find(c => {
    
        if (mobileNo !== "") {
            return c.mobile === mobileNo;
        }
    
        return c.name.toLowerCase() === customer;
    
    });

    if (existing) {
        customerName.dataset.customerId = existing.customerId || "";

        const contactValue = mobile.value.trim();

    const isMobile =
        /^\d{10}$/.test(contactValue);
    
    const isGST =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/
        .test(contactValue.toUpperCase());
    
    if (existing) {

    existing.name = name;
    existing.address = address.value.trim();

    if (isMobile) {
        existing.mobile = contactValue;
    }

    if (isGST) {
        existing.gst = contactValue.toUpperCase();
    }

    customerName.dataset.customerId =
        existing.customerId || "";

    }
    
        } else {
    
        const contactValue = mobile.value.trim();

        const selectedGST =
            customerName.dataset.customerGst || "";
        
        const billMobile =
            /^\d{10}$/.test(contactValue)
                ? contactValue
                : "";
        
        const billGST =
            selectedGST ||
            (
                /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/
                .test(contactValue.toUpperCase())
                    ? contactValue.toUpperCase()
                    : ""
            );
    
    const newCustomer = {

    customerId: "CUS" + Date.now(),

    name,

    mobile: billMobile,

    gst: billGST,

    address: address.value.trim()

};

customerDatabase.push(newCustomer);

customerName.dataset.customerId = newCustomer.customerId;

    }

    await saveDatabase();

    // Refresh local data immediately after saving
    
    
    return true;
    
    }

// ==============================
// CUSTOMER SEARCH + KEYBOARD NAVIGATION
// ==============================

let customerResults = [];
let customerSelectedIndex = -1;


// ==============================
// SELECT CUSTOMER
// ==============================

function selectCustomer(customer) {

    customerName.value = customer.name;

    // Load Mobile first, otherwise GST
    mobile.value =
        customer.mobile ||
        customer.gst ||
        "";

    address.value =
        customer.address || "";

    // Remember selected customer
    customerName.dataset.customerId =
        customer.customerId || "";

    // Remember GST separately
    customerName.dataset.customerGst =
        customer.gst || "";

    // Hide suggestions
    customerSuggestion.innerHTML = "";
    customerSuggestion.style.display = "none";

    // Reset selection
    customerSelectedIndex = -1;

    // Move to mobile field
    mobile.focus();
}


// ==========================================
// HIGHLIGHT CUSTOMER
// ==========================================

function highlightCustomer(index) {

    const items =
        customerSuggestion.querySelectorAll(
            ".customer-suggestion-item"
        );

    if (items.length === 0) return;


    // Keep index inside range

    if (index < 0) {
        index = items.length - 1;
    }

    if (index >= items.length) {
        index = 0;
    }


    customerSelectedIndex = index;


    // Remove previous highlight

    items.forEach(item => {

        item.classList.remove("active");

        // Clear inline styles
        item.style.backgroundColor = "";
        item.style.color = "";

        const strong =
            item.querySelector("strong");

        if (strong) {
            strong.style.color = "";
        }

    });


    // Selected customer

    const selectedItem = items[index];


    selectedItem.classList.add("active");


    // FORCE visual highlight

    selectedItem.style.backgroundColor =
        "#3567dc";

    selectedItem.style.color =
        "#ffffff";


    const strong =
        selectedItem.querySelector("strong");

    if (strong) {

        strong.style.color =
            "#ffffff";

    }


    // Keep selected item visible

    selectedItem.scrollIntoView({
        block: "nearest"
    });

}

// ==============================
// CUSTOMER SEARCH
// ==============================

customerName.addEventListener("input", async function () {

    await refreshDatabase();

    const text =
        this.value.toLowerCase().trim();


    customerSuggestion.innerHTML = "";

    customerSelectedIndex = -1;


    if (text === "") {

        customerSuggestion.style.display = "none";

        return;
    }


    // Customers + previous bills
    const allCustomers = [
        ...customerDatabase,

        ...bills.map(b => ({
            name: b.customer,
            mobile: b.mobile || "",
            gst: b.gst || "",
            address: b.address || "",
            customerId: b.customerId || ""
        }))
    ];


    // Remove duplicate names
    const uniqueCustomers = [];

    const seen = new Set();


    allCustomers.forEach(customer => {

        const key =
            (customer.name || "")
                .trim()
                .toLowerCase();


        if (key && !seen.has(key)) {

            seen.add(key);

            uniqueCustomers.push(customer);
        }

    });


    // Search by name, mobile or GST
    customerResults =
        uniqueCustomers.filter(customer =>

            (customer.name || "")
                .toLowerCase()
                .includes(text)

            ||

            (customer.mobile || "")
                .includes(text)

            ||

            (customer.gst || "")
                .toLowerCase()
                .includes(text)

        );


    if (customerResults.length === 0) {

        customerSuggestion.style.display = "none";

        return;
    }


    customerSuggestion.style.display = "block";


    // Create suggestions
    customerResults.forEach((customer, index) => {

        const item =
            document.createElement("a");


        item.href = "#";


        item.className =
            "list-group-item list-group-item-action customer-suggestion-item";


        item.innerHTML = `
            <strong>${customer.name || "-"}</strong><br>
            📞 ${customer.mobile || "-"}<br>
            🧾 ${customer.gst || "-"}<br>
            📍 ${customer.address || "-"}
        `;


        // ==============================
        // MOUSE HOVER
        // ==============================

        item.addEventListener("mouseenter", function () {

            customerSelectedIndex = index;

            const allItems =
                customerSuggestion.querySelectorAll(
                    ".customer-suggestion-item"
                );

            allItems.forEach(i => {
                i.classList.remove("active");
            });

            item.classList.add("active");
        });


        // ==============================
        // MOUSE CLICK
        // ==============================

        item.addEventListener("click", function (e) {

            e.preventDefault();

            selectCustomer(customer);

        });


        customerSuggestion.appendChild(item);

    });

});


// ==============================
// CUSTOMER KEYBOARD NAVIGATION
// ==============================

customerName.addEventListener("keydown", function (e) {

    const items =
        customerSuggestion.querySelectorAll(
            ".customer-suggestion-item"
        );


    // No suggestions
    if (
        customerSuggestion.style.display === "none" ||
        items.length === 0
    ) {

        return;
    }


    // ==============================
    // ARROW DOWN
    // ==============================

    if (e.key === "ArrowDown") {

        e.preventDefault();

        highlightCustomer(
            customerSelectedIndex + 1
        );

        return;
    }


    // ==============================
    // ARROW UP
    // ==============================

    if (e.key === "ArrowUp") {

        e.preventDefault();

        highlightCustomer(
            customerSelectedIndex - 1
        );

        return;
    }


    // ==============================
    // ENTER
    // ==============================

    if (e.key === "Enter") {

        e.preventDefault();


        // If nothing highlighted,
        // select first customer
        if (customerSelectedIndex < 0) {

            customerSelectedIndex = 0;

        }


        const customer =
            customerResults[customerSelectedIndex];


        if (customer) {

            selectCustomer(customer);

        }

        return;
    }


    // ==============================
    // ESC
    // ==============================

    if (e.key === "Escape") {

        e.preventDefault();

        customerSuggestion.innerHTML = "";

        customerSuggestion.style.display = "none";

        customerSelectedIndex = -1;

        return;
    }

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

    const enteredAmount = parseFloat(amount.value);

    if (isNaN(enteredAmount) || enteredAmount < 0) {
        showToast("Enter valid amount.", "warning");
        return;
    }
    
    const basicAmount = enteredAmount;
    
    const gstAmount =(basicAmount * gstPercent) / 100;
    
    const totalAmount =basicAmount + gstAmount;

    billItems.push({

        code: selectedProduct.code,

        productName: selectedProduct.productName,

        hsnCode: selectedProduct.hsnCode || "",

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

    // ==============================
    // UPDATE PRODUCT COUNT
    // ==============================

    const productCount =
        document.getElementById("productCount");

    if (productCount) {
        productCount.textContent =
            `(${billItems.length})`;
    }

    billItems.forEach((item, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${index + 1}</td>
        
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
    let cgstValue = 0;
    let sgstValue = 0;
    let gstValue = 0;

    billItems.forEach(item => {

        sub += item.basic;

        const itemCGST = (item.basic * item.cgst) / 100;
        const itemSGST = (item.basic * item.sgst) / 100;

        cgstValue += itemCGST;
        sgstValue += itemSGST;
        gstValue += itemCGST + itemSGST;

    });

    const discountValue =
        parseFloat(discount.value) || 0;

    const exactGrand =
        sub + gstValue - discountValue;

    const roundedGrand =
        Math.ceil(exactGrand);

    const roundOff =
        +(roundedGrand - exactGrand).toFixed(2);

    // UPDATE HTML
    subTotal.innerHTML =
        "₹" + sub.toFixed(2);

    gstTotal.innerHTML =
        "₹" + gstValue.toFixed(2);

    grandTotal.innerHTML =
        "₹" + roundedGrand.toFixed(2);

    // STORE ROUND OFF
    grandTotal.dataset.roundOff =
        roundOff;

    calculateBalance();

}
function numberToWords(num) {

    if (num === 0) return "Zero Rupees Only";

    const a = [
        "", "One", "Two", "Three", "Four", "Five",
        "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen",
        "Fifteen", "Sixteen", "Seventeen",
        "Eighteen", "Nineteen"
    ];

    const b = [
        "", "", "Twenty", "Thirty", "Forty",
        "Fifty", "Sixty", "Seventy",
        "Eighty", "Ninety"
    ];

    function convert(n){

        if(n < 20) return a[n];

        if(n < 100)
            return b[Math.floor(n/10)] +
            (n%10 ? " " + a[n%10] : "");

        if(n < 1000)
            return a[Math.floor(n/100)] +
            " Hundred " +
            convert(n%100);

        if(n < 100000)
            return convert(Math.floor(n/1000)) +
            " Thousand " +
            convert(n%1000);

        if(n < 10000000)
            return convert(Math.floor(n/100000)) +
            " Lakh " +
            convert(n%100000);

        return convert(Math.floor(n/10000000)) +
            " Crore " +
            convert(n%10000000);

    }

    return convert(Math.floor(num)).trim() +
        " Rupees Only";

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
// GENERATE BILL BOOK NUMBER
// ==============================

async function generateBillBookNumber() {

    await refreshDatabase();

    if (!settings.nextBillBookNo) {

        settings.nextBillBookNo = 1;

        await saveDatabase();

    }

    billBookNo.value =
        "B-" +
        String(settings.nextBillBookNo).padStart(3, "0");

}
// ==============================
// RESET BILL FORM
// ==============================

async function resetBillForm() {

    await refreshDatabase();

    customerName.value = "Walk-in Customer";

    mobile.value = "";

    address.value = "";

    const today = new Date();

    billDate.value =
    String(today.getDate()).padStart(2, "0") + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    today.getFullYear();

    paymentMode.value = "Credit";

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

    noOfBales.value = "";

    transport.value = "";
    
    lrNo.value = "";
    
    deliveryShopNo.value = "";


    customerName.focus();

    // At the very end of resetBillForm()
await generateBillNumber();

if (typeof generateBillBookNumber === "function") {
    await generateBillBookNumber();
}

}

// ==============================
// NEW BILL
// ==============================

newBill.addEventListener("click", async function () {

    if (!confirm("Start a new bill?")) return;

    await resetBillForm();

});
// ==============================
// TOAST MESSAGE
// ==============================

function showToast(message, type = "success") {

    // Remove existing toast
    const oldToast = document.getElementById("svssToast");

    if (oldToast) {
        oldToast.remove();
    }

    // Create toast
    const toast = document.createElement("div");

    toast.id = "svssToast";

    toast.innerHTML = `
        <div class="svss-toast-icon">
            ${
                type === "success"
                    ? "✓"
                    : type === "warning"
                        ? "!"
                        : "✕"
            }
        </div>

        <div class="svss-toast-message">
            ${message}
        </div>

        <button
            class="svss-toast-close"
            type="button">
            ×
        </button>
    `;

    // Add styles
    Object.assign(toast.style, {

        position: "fixed",

        top: "25px",

        right: "25px",

        minWidth: "320px",

        maxWidth: "450px",

        padding: "16px 18px",

        background:
            type === "success"
                ? "#198754"
                : type === "warning"
                    ? "#ffc107"
                    : "#dc3545",

        color: "#fff",

        borderRadius: "10px",

        display: "flex",

        alignItems: "center",

        gap: "12px",

        fontSize: "16px",

        fontWeight: "600",

        boxShadow:
            "0 8px 25px rgba(0,0,0,0.35)",

        zIndex: "999999",

        opacity: "0",

        transform: "translateX(30px)",

        transition:
            "all 0.3s ease"

    });

    // Icon
    const icon =
        toast.querySelector(
            ".svss-toast-icon"
        );

    Object.assign(icon.style, {

        width: "30px",

        height: "30px",

        borderRadius: "50%",

        background: "rgba(255,255,255,0.2)",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",

        fontSize: "20px",

        fontWeight: "bold",

        flexShrink: "0"

    });

    // Message
    const msg =
        toast.querySelector(
            ".svss-toast-message"
        );

    Object.assign(msg.style, {

        flex: "1"

    });

    // Close button
    const close =
        toast.querySelector(
            ".svss-toast-close"
        );

    Object.assign(close.style, {

        border: "none",

        background: "transparent",

        color: "#fff",

        fontSize: "24px",

        cursor: "pointer",

        lineHeight: "1"

    });

    close.addEventListener(
        "click",
        () => {

            toast.remove();

        }
    );

    document.body.appendChild(toast);

    // Show animation
    requestAnimationFrame(() => {

        toast.style.opacity = "1";

        toast.style.transform =
            "translateX(0)";

    });

    // Automatically hide
    setTimeout(() => {

        if (!toast.isConnected) return;

        toast.style.opacity = "0";

        toast.style.transform =
            "translateX(30px)";

        setTimeout(() => {

            if (toast.isConnected) {
                toast.remove();
            }

        }, 300);

    }, 3000);

}

// ==============================
// SAVE BILL
// ==============================

async function saveCurrentBill() {

    calculateBalance();

    if (billItems.length === 0) {

        showToast("Please add at least one product.", "error");
        return false;

    }

    await refreshDatabase();

    const enteredBillNo = billNo.value.trim();

    // ==============================
    // CHECK IF BILL ALREADY EXISTS
    // ==============================

    const existingBillIndex = bills.findIndex(
        bill => bill.billNo === enteredBillNo
    );

    // ==============================
    // CHECK DUPLICATE BILL BOOK NO
    // ==============================

    const enteredBookNo = billBookNo.value.trim();
    const match = enteredBookNo.match(/^B-(\d+)$/i);

    if (match) {
    
        settings.nextBillBookNo = parseInt(match[1], 10) + 1;
    
    }

    if (enteredBookNo !== "") {

        const duplicateBook = bills.find((bill, index) =>

            index !== existingBillIndex &&
            bill.billBookNo &&
            bill.billBookNo.toUpperCase() === enteredBookNo.toUpperCase()

        );

        if (duplicateBook) {

            showToast(
                "Bill Book No already exists.",
                "warning"
            );

            billBookNo.focus();

            return false;

        }

    }

    await saveCustomer();
    const contactValue = mobile.value.trim();
    
    const billMobile =
        /^\d{10}$/.test(contactValue)
            ? contactValue
            : "";
    
    const billGST =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/.test(contactValue)
            ? contactValue
            : "";      

    const bill = {
        customerId: customerName.dataset.customerId || "",

        customer: customerName.value.trim() || "Walk-in Customer",

        noOfBales: noOfBales.value,

        transport: transport.value,

        lrNo: lrNo.value,

        deliveryShopNo: deliveryShopNo.value,

        billNo: enteredBillNo,

        mobile: billMobile,

        gst: billGST,

        address: address.value.trim(),

        date: billDate.value,

        paymentMode: paymentMode.value,

        billBookNo: enteredBookNo,

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

        cgstTotal:
            "₹" + (
                (parseFloat(
                    gstTotal.innerText.replace(/[^\d.]/g, "")
                ) || 0) / 2
            ).toFixed(2),

        sgstTotal:
            "₹" + (
                (parseFloat(
                    gstTotal.innerText.replace(/[^\d.]/g, "")
                ) || 0) / 2
            ).toFixed(2),

        amountWords:
            numberToWords(
                parseFloat(
                    grandTotal.innerText.replace(/[^\d.]/g, "")
                ) || 0
            ),

        discount: discount.value,

        roundOff: Number(grandTotal.dataset.roundOff || 0),

        grandTotal: grandTotal.innerText

    };

    // ==============================
    // SAVE OR UPDATE BILL
    // ==============================

if (existingBillIndex >= 0) {

    bills[existingBillIndex] = bill;

} else {

    bills.push(bill);

    // nextBillBookNo is already updated from the entered Bill Book No.

}

console.log("Entered Book No:", enteredBookNo);
console.log("Next Bill Book No:", settings.nextBillBookNo);

// ==========================================
// SAVE TO LOCAL DATABASE
// ==========================================

await saveDatabase();

// ==========================================
// CLOUD SYNC — BILLS
// ==========================================

try {

    await window.api.saveBills(bills);

    console.log(
        "SVSS Cloud: Bills synchronized successfully."
    );

} catch (cloudError) {

    console.warn(
        "SVSS Cloud: Bill synchronization failed."
    );

    console.warn(cloudError);

}

// ==========================================
// REFRESH LOCAL DATABASE
// ==========================================

await refreshDatabase();

console.log("After Save:", settings.nextBillBookNo);

return true;
    
    }

// ==============================
// SAVE BUTTON
// ==============================

saveBill.addEventListener("click", async function () {

    const ok = await saveCurrentBill();
    
    if (!ok) return;
    
    // Wait for database write to finish
    await refreshDatabase();
    
    // Reset immediately
    await resetBillForm();
    
    showToast(
        "Bill Saved Successfully.",
        "success"
    );

});

// ==============================
// PART 5 STARTS HERE
// ==============================
// ==============================
// PRINT BILL
// ==============================

async function printInvoice() {

    // Save current bill first
    const saved = await saveCurrentBill();

    if (!saved) {
        return;
    }

    // Reload latest database (settings, bills, etc.)
    await refreshDatabase();

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    

// ======================================
// PAGE
// ======================================

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const centerX = pageWidth / 2;


function drawPageBorder() {

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Outer Border
    doc.setDrawColor(255,193,7);
    doc.setLineWidth(1.2);
    doc.rect(
        5,
        5,
        pageWidth - 10,
        pageHeight - 10
    );

    // Inner Border
    doc.setLineWidth(0.4);
    doc.rect(
        8,
        8,
        pageWidth - 16,
        pageHeight - 16
    );
    doc.setFontSize(8);
doc.setTextColor(120);

doc.text(
    `Page ${doc.getCurrentPageInfo().pageNumber}`,
    pageWidth - 18,
    pageHeight - 6
);

doc.setTextColor(0);

}

// ✅ ADD THIS
drawPageBorder();


// ======================================
// SHOP DETAILS
// ======================================

const SHOP_NAME =
    settings.shopName ||
    "Sri Venkata Siva Sai Cloth & Matching Center";

const SHOP_ADDRESS =
    settings.shopAddress ||
    "Opp Sai Lodge, R.R.Road, Chirala-523155";

const SHOP_PHONE =
    settings.shopMobile || "";

const SHOP_GST =
    settings.shopGST || "";


// ======================================
// LOGO
// ======================================

try{

    const logo =
        document.getElementById("shopLogo");

    if(
        logo &&
        logo.complete &&
        logo.naturalWidth > 0
    ){

        doc.addImage(
            logo,
            "PNG",
            10,
            10,
            24,
            24
        );

    }

}catch(e){

    console.log("Logo not found");

}


// ======================================
// SHOP HEADER
// ======================================

doc.setFont("helvetica","bold");
doc.setFontSize(16);

doc.text(
    SHOP_NAME,
    centerX,
    16,
    {
        align:"center"
    }
);

doc.setFont("helvetica","normal");
doc.setFontSize(10);

const shopAddressLines =
    doc.splitTextToSize(
        SHOP_ADDRESS,
        120
    );

doc.text(
    shopAddressLines,
    centerX,
    23,
    {
        align:"center"
    }
);

const phoneY =
    24 + (shopAddressLines.length * 5);

doc.text(
    "Phone : " +
    SHOP_PHONE +
    "   |   GSTIN : " +
    SHOP_GST,
    centerX,
    phoneY,
    {
        align:"center"
    }
);


// ======================================
// HEADER LINE
// ======================================

const headerBottom =
    phoneY + 8;

doc.setDrawColor(255,193,7);

doc.setLineWidth(0.8);

doc.line(
    10,
    headerBottom,
    200,
    headerBottom
);


// ======================================
// TAX INVOICE
// ======================================

const invoiceY =
    headerBottom + 10;

doc.setFont("helvetica","bold");
doc.setFontSize(17);

doc.setTextColor(255,193,7);

doc.text(
    "TAX INVOICE",
    centerX,
    invoiceY,
    {
        align:"center"
    }
);

doc.setTextColor(0);


// ======================================
// CUSTOMER DETAILS
// ======================================

const detailsY =
    invoiceY + 12;

const addressLines =
    doc.splitTextToSize(
        address.value || "-",
        70
    );

const customerBoxHeight =
    30 + (addressLines.length * 7);

doc.setDrawColor(255,193,7);

doc.roundedRect(
    10,
    detailsY-6,
    190,
    customerBoxHeight,
    2,
    2
);


// ---------- LEFT ----------

const leftLabelX = 14;
const leftColonX = 35;
const leftValueX = 44;

doc.setFont("helvetica","bold");
doc.setFontSize(11);

doc.text("Bill No", leftLabelX, detailsY);
doc.text("Customer", leftLabelX, detailsY + 8);
doc.text("Mobile", leftLabelX, detailsY + 16);
doc.text("Address", leftLabelX, detailsY + 24);

doc.setFont("helvetica","normal");

doc.text(":", leftColonX, detailsY);
doc.text(":", leftColonX, detailsY + 8);
doc.text(":", leftColonX, detailsY + 16);
doc.text(":", leftColonX, detailsY + 24);

doc.text(
    billNo.value,
    leftValueX,
    detailsY
);

const customer =
    customerName.value.trim() || "Walk-in Customer";

doc.text(
    customer,
    leftValueX,
    detailsY + 8
);

doc.text(
    mobile.value || "-",
    leftValueX,
    detailsY + 16
);

doc.text(
    addressLines,
    leftValueX,
    detailsY + 24
);

//------Right------------
const rightLabelX = 142;
const rightColonX = 171;
const rightValueX = 178;

doc.setFont("helvetica","bold");

doc.text("Date", rightLabelX, detailsY);
doc.text("Payment", rightLabelX, detailsY + 8);
doc.text("Bill Book No", rightLabelX, detailsY + 16);

doc.setFont("helvetica","normal");


doc.text(":", rightColonX, detailsY);
doc.text(":", rightColonX, detailsY + 8);
doc.text(":", rightColonX, detailsY + 16);

doc.text(
    formatDisplayDate(billDate.value),
    rightValueX,
    detailsY
);

doc.text(
    paymentMode.value,
    rightValueX,
    detailsY + 8
);

doc.text(
    billBookNo.value || "-",
    rightValueX,
    detailsY + 16
);


// ======================================
// PRODUCT TABLE START POSITION
// ======================================

const tableY =
    detailsY +
    customerBoxHeight +
    4;


// ======================================
// PRODUCT TABLE
// ======================================

const rows = billItems.map((item, index) => [

    index + 1,

    item.code,

    item.productName,

    item.hsnCode || "",

    item.unit,

    item.unit === "Meter"
        ? Number(item.qty).toFixed(2)
        : parseInt(item.qty),

    item.rate.toFixed(2),

    item.basic.toFixed(2),

    item.cgst + "%",

    item.sgst + "%",

    item.gst + "%",

    item.total.toFixed(2)

]);

doc.autoTable({
    tableWidth: "wrap",
    
    margin: {
        left: 10,
        right: 10
    },

    startY: tableY,

    theme: "grid",

    head: [[
        "Sl",
        "Code",
        "Product",
        "HSN",
        "Unit",
        "Qty",
        "Rate",
        "Taxable",
        "CGST",
        "SGST",
        "GST",
        "Total"
    ]],

    body: rows,

    styles: {

        font: "helvetica",

        fontSize: 9,

        cellPadding: 2,

        halign: "center",

        valign: "middle",

        lineColor: [255,193,7],

        lineWidth: 0.2

    },

    headStyles: {

        fillColor: [255,193,7],

        textColor: [0,0,0],

        fontStyle: "bold",

        fontSize: 10,

        halign: "center"

    },

    columnStyles: {

    0:  { cellWidth: 7 },   // Sl
    1:  { cellWidth: 15 },  // Code
    2:  { cellWidth: 28 },  // Product
    3:  { cellWidth: 15 },  // HSN
    4:  { cellWidth: 15 },  // Unit
    5:  { cellWidth: 12 },  // Qty
    6:  { cellWidth: 15 },  // Rate
    7:  { cellWidth: 18 },  // Taxable
    8:  { cellWidth: 15 },  // CGST
    9:  { cellWidth: 15 },  // SGST
    10: { cellWidth: 15 },  // GST
    11: { cellWidth: 20 }   // Total

}

});


// ======================================
// AMOUNT IN WORDS
// ======================================

// ======================================
// CHECK AVAILABLE SPACE AFTER TABLE
// ======================================

const currentPage =
    doc.internal.getNumberOfPages();

doc.setPage(currentPage);

let y =
    doc.lastAutoTable.finalY;

// Total height needed for payment section + footer
const requiredHeight = 130;

// If not enough space, continue on next page
if (y + requiredHeight > pageHeight - 15) {

    doc.addPage();

    drawPageBorder();

    y = 20;

} else {

    // Keep payment section close to the table
    y += 8;

}

// ==========================
// PAYMENT BOX (LEFT)
// ==========================

const paymentBoxX = 14;
const paymentBoxY = y;
const paymentBoxW = 72;
const paymentBoxH = 34;

doc.setDrawColor(255,193,7);
doc.setLineWidth(0.5);

doc.roundedRect(
    paymentBoxX,
    paymentBoxY,
    paymentBoxW,
    paymentBoxH,
    2,
    2
);

doc.setFont("helvetica","bold");
doc.setFontSize(10);
let py = paymentBoxY + 8;

function paymentRow(label, value) {

    doc.setFont("helvetica", "bold");
    doc.text(label, paymentBoxX + 3, py);

    doc.setFont("helvetica", "normal");
    doc.text(":", paymentBoxX + 31, py);

    if (value) {

        doc.text(value, paymentBoxX + 35, py);

    } else {

        doc.line(
            paymentBoxX + 35,
            py,
            paymentBoxX + 66,
            py
        );

    }

    py += 7;

}

paymentRow(
    "Payment",
    paymentMode.value
);

paymentRow(
    "Paid",
    "Rs. " + Number(amountPaid.value || 0).toFixed(2)
);

paymentRow(
    "Balance",
    balanceDue.value.replace("₹","Rs. ")
);

doc.setFont("helvetica","bold");

doc.text(
    "Status",
    paymentBoxX+3,
    py
);

doc.setFont("helvetica", "normal");
doc.text(":", paymentBoxX + 31, py);

if (paymentStatus.value === "Paid") {

    doc.setTextColor(0, 150, 0);

} else {

    doc.setTextColor(220, 53, 69);

}

doc.text(
    paymentStatus.value,
    paymentBoxX + 35,
    py
);

doc.setTextColor(0);

py += 8;

// ==========================
// TRANSPORT DETAILS
// ==========================

let infoY = paymentBoxY + paymentBoxH + 10;

function infoRow(label, value) {

    doc.setFont("helvetica","bold");
    doc.setFontSize(11);

    doc.text(label, 14, infoY);

    doc.setFont("helvetica","normal");

    doc.text(":", 40, infoY);

    doc.text(value || "", 44, infoY);

    infoY += 8;

}

infoRow("No. of Bales", noOfBales.value);

infoRow("Transport", transport.value);

infoRow("L.R. No", lrNo.value);

infoRow("Delivery Shop No", deliveryShopNo.value);


// ======================================
// AMOUNT IN WORDS
// ======================================

const amountWordsY = infoY + 6;

doc.setFont("helvetica","bold");
doc.setFontSize(11);

doc.text(
    "Amount In Words :",
    14,
    amountWordsY
);

doc.setFont("helvetica","normal");

const amountWords = numberToWords(
    parseFloat(
        grandTotal.innerText.replace(/[^\d.]/g,"")
    ) || 0
);

const amountLines = doc.splitTextToSize(amountWords,110);

doc.text(
    amountLines,
    14,
    amountWordsY + 7
);

// ==========================
// BANK DETAILS
// ==========================

const bankY =
    amountWordsY +
    (amountLines.length * 6) +
    12;

doc.setFont("helvetica","bold");
doc.setFontSize(12);

doc.text("Bank Details",14,bankY);

doc.setFont("helvetica","normal");
doc.setFontSize(11);

doc.text("Axis Bank, Chirala Branch",14,bankY+7);
doc.text("A/c No : 917020033692459",14,bankY+14);
doc.text("IFSC   : UTIB0001017",14,bankY+21);


// ==========================
// SUMMARY (RIGHT)
// ==========================
const boxX = 132;
const boxY = paymentBoxY;

doc.setDrawColor(255,193,7);
doc.setLineWidth(0.5);

const summaryBoxH = 34;

doc.roundedRect(
    boxX - 6,
    paymentBoxY,
    70,
    summaryBoxH,
    2,
    2
);



doc.setFont("helvetica","bold");
doc.setFontSize(10);

let sy = boxY + 9;

function summaryRow(label,value){

    doc.setFont("helvetica","bold");

    doc.text(
        label,
        boxX,
        sy
    );

    doc.setFont("helvetica","normal");

    doc.text(
        ":",
        boxX+28,
        sy
    );

    doc.text(
        value,
        195,
        sy,
        {
            align:"right"
        }
    );

    sy += 7;

}

summaryRow(
    "Sub Total",
    subTotal.innerText.replace("₹","Rs. ")
);

const totalGST =
    parseFloat(
        gstTotal.innerText.replace(/[^\d.]/g,"")
    ) || 0;

summaryRow(
    "CGST (2.5%)",
    "Rs. " + (totalGST/2).toFixed(2)
);

summaryRow(
    "SGST (2.5%)",
    "Rs. " + (totalGST/2).toFixed(2)
);


// Dotted Line


doc.line(
    boxX,
    sy-2,
    195,
    sy-2
);


sy += 3;


summaryRow(
    "Total GST",
    gstTotal.innerText.replace("₹","Rs. ")
);
doc.setDrawColor(255,193,7);
doc.setLineWidth(0.5);

doc.line(
    boxX - 6,
    sy - 3,
    boxX + 64,
    sy - 3
);

doc.line(
    boxX,
    sy-3,
    195,
    sy-3
);

sy += 3;

summaryRow(
    "Discount",
    "Rs. " +
    Number(discount.value || 0).toFixed(2)
);

// ==========================
// ROUND OFF
// ==========================

const roundOffValue =
    Number(grandTotal.dataset.roundOff || 0);

summaryRow(
    "Round Off",
    (roundOffValue > 0 ? "+" : "") +
    roundOffValue.toFixed(2)
);
// ==========================
// NET AMOUNT
// ==========================
const roundedAmount =
    parseFloat(
        grandTotal.innerText.replace(/[^\d.]/g, "")
    ) || 0;

// Grand Total Highlight

doc.setFillColor(255,248,220);

doc.rect(
    boxX-2,
    sy-6,
    65,
    9,
    "F"
);

doc.setFont("helvetica","bold");

doc.text(
    "Grand Total",
    boxX,
    sy
);

doc.text(
    grandTotal.innerText.replace("₹", "Rs. "),
    195,
    sy,
    {
        align: "right"
    }
);

sy += 10;
// ======================================
// SIGNATURE & FOOTER LAYOUT
// ======================================

// Fixed positions near bottom of page
const signY = pageHeight - 45;

const footerLineY = pageHeight - 20;
const footerTextY = pageHeight - 16;


// ==========================
// AUTHORIZED SIGNATURE
// ==========================

doc.setDrawColor(255,193,7);
doc.setLineWidth(0.6);

doc.line(
    145,
    signY,
    198,
    signY
);

doc.setFont("helvetica","bold");
doc.setFontSize(10);

doc.text(
    "Authorized Signature",
    171.5,
    signY + 6,
    {
        align:"center"
    }
);


// ==========================
// FOOTER
// ==========================

doc.setDrawColor(255,193,7);
doc.setLineWidth(0.6);

doc.line(
    10,
    footerLineY,
    200,
    footerLineY
);

doc.setFont("helvetica","bold");
doc.setFontSize(11);

doc.text(
    "Thank You For Shopping With Us!",
    pageWidth / 2,
    footerTextY,
    {
        align:"center"
    }
);

doc.setFont("helvetica","normal");
doc.setFontSize(8);

doc.text(
    "Computer Generated Invoice",
    pageWidth / 2,
    footerTextY + 5,
    { align: "center" }
);


// ==========================
// SAVE PDF
// ==========================

// PDF File Name
const pdfFileName = `${billNo.value}_${billDate.value}.pdf`;

doc.save(pdfFileName);

await refreshDatabase();

await resetBillForm();

showToast(
    "Bill Saved & Printed Successfully.",
    "success"
);
    
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
    console.log(settings);
    console.log(settings.shopName);

    generateBillNumber();
    
    await generateBillBookNumber();

    calculateTotals();

    calculateBalance();

    customerSuggestion.innerHTML = "";

    customerSuggestion.style.display = "none";

    const today = new Date();

   billDate.value =
    String(today.getDate()).padStart(2, "0") + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    today.getFullYear();

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