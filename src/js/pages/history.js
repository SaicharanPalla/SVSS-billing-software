// ==============================
// SVSS - Bill History
// ==============================

const historyTableBody = document.getElementById("historyTableBody");
const totalBills = document.getElementById("totalBills");
const searchBill = document.getElementById("searchBill");

let db = {};
let bills = [];
let deleteBillIndex = -1;
let selectedBill = null;

// ==============================
// Safe Text Setter
// ==============================

function setText(id, value) {

    const el = document.getElementById(id);

    if (el) {

        el.textContent = value ?? "";

    } else {

        console.error("Element not found:", id);

    }

}
// ==============================
// CURRENCY FORMATTER
// Always display Rs.
// ==============================

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

function formatCurrency(value) {
    return "Rs. " + parseAmount(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
// ==========================================
// GET CUSTOMER GST FROM BILL OR CUSTOMER DB
// GST FIRST, MOBILE SECOND
// ==========================================

function getBillCustomerGST(bill) {

    // --------------------------------------
    // 1. GST stored directly in bill
    // --------------------------------------

    const billGST = String(
        bill?.gst ||
        bill?.gstNo ||
        bill?.gstin ||
        ""
    ).trim();

    if (billGST && billGST !== "-") {
        return billGST;
    }


    // --------------------------------------
    // 2. Find customer from customer database
    // --------------------------------------

    const customers = Array.isArray(db?.customers)
        ? db.customers
        : [];


    // Match by Customer ID first
    let customer = null;

    if (bill?.customerId) {

        customer = customers.find(c =>
            String(c?.customerId || "").trim() ===
            String(bill.customerId || "").trim()
        );

    }


    // --------------------------------------
    // 3. Match by customer name + mobile
    // --------------------------------------

    if (!customer) {

        const billName = String(
            bill?.customer || ""
        ).trim().toLowerCase();

        const billMobile = String(
            bill?.mobile || ""
        ).trim();

        customer = customers.find(c => {

            const customerName = String(
                c?.name || ""
            ).trim().toLowerCase();

            const customerMobile = String(
                c?.mobile || ""
            ).trim();

            return (
                customerName === billName &&
                (
                    !billMobile ||
                    !customerMobile ||
                    customerMobile === billMobile
                )
            );

        });

    }


    // --------------------------------------
    // 4. Read GST from customer
    // --------------------------------------

    const customerGST = String(
        customer?.gst ||
        customer?.gstNo ||
        customer?.gstin ||
        ""
    ).trim();

    return customerGST;

}


// ==========================================
// CUSTOMER CONTACT
// GST FIRST, MOBILE SECOND
// ==========================================

function getBillCustomerContact(bill) {

    const gst = getBillCustomerGST(bill);

    const mobile = String(
        bill?.mobile || ""
    ).trim();


    if (gst && gst !== "-") {
        return gst;
    }


    if (mobile && mobile !== "-") {
        return mobile;
    }


    return "-";
}
// ==============================
// DATABASE FUNCTIONS
// ==============================

async function refreshDatabase() {

    db = await window.api.getDatabase();

    bills = db.bills || [];

}

async function saveDatabase() {

    db.bills = bills;

    // Save locally first
    await window.api.saveDatabase(db);

    // Upload updated bills to cloud in browser mode
    if (window.api.isBrowser) {
        await window.api.saveBills(bills);
    }

}

// ==============================
// LOAD BILLS
// ==============================

async function loadBills() {

    await refreshDatabase();

    displayBills(bills);

}

// ==============================
// PART 2 STARTS HERE
// ==============================
// ==============================
// DISPLAY BILLS
// ==============================

function displayBills(billList) {

    historyTableBody.innerHTML = "";

    totalBills.innerText = billList.length;

    if (billList.length === 0) {

        historyTableBody.innerHTML = `
        <tr>
            <td colspan="10" class="text-center text-muted">
                No Bills Found
            </td>
        </tr>
        `;

        return;

    }

    billList.forEach((bill, index) => {

        const gst = parseAmount(bill.gstTotal);

        historyTableBody.innerHTML += `

<tr>
   
   <td>${index + 1}</td>

    <td>

    <strong>${bill.billNo}</strong>

    <br>

    <small class="text-info fw-semibold">

        Book : ${bill.billBookNo || "-"}

    </small>

    </td>

    <td>${bill.customer}</td>

    <td>Rs. ${(gst / 2).toFixed(2)}</td>

    <td>Rs. ${(gst / 2).toFixed(2)}</td>

    <td>${formatCurrency(bill.gstTotal)}</td>

    <td>${formatCurrency(bill.grandTotal)}</td>
    
    <td>${formatCurrency(bill.amountPaid)}</td>
    
    <td>${formatCurrency(bill.balanceDue)}</td>

    <td>

    ${(() => {

        const balance = parseAmount(bill.balanceDue);

        const status =
            balance <= 0
                ? "Paid"
                : "Pending";

        return `

            <span class="badge ${
                status === "Paid"
                    ? "bg-success"
                    : "bg-warning text-dark"
            }">

                ${status}

            </span>

        `;

    })()}

</td>

    <td>

        <button
            class="btn btn-primary btn-sm me-1"
            onclick="viewBill('${bill.billNo}')">
        
            <i class="bi bi-eye"></i>
        
        </button>
        
        <button
            class="btn btn-danger btn-sm"
            onclick="deleteBill('${bill.billNo}')">
        
            <i class="bi bi-trash"></i>
        
        </button>

    </td>

</tr>

`;

    });

}

// ==============================
// SEARCH BILLS
// ==============================

searchBill.addEventListener("keyup", function () {

    const keyword = this.value
        .trim()
        .toLowerCase();

    // If search box is empty
    if (!keyword) {

        displayBills(bills);

        return;

    }

    // ==========================================
    // BOOK NUMBER SEARCH
    // Example:
    // 410  → B-410
    // B-410 → B-410
    // ==========================================

    const normalizedKeyword = keyword
        .replace(/^b[\s-]*/i, "")
        .trim();

    const bookMatches = bills.filter(bill => {

        const bookNo = String(
            bill.billBookNo || ""
        )
        .toLowerCase()
        .replace(/^b[\s-]*/i, "")
        .trim();

        return bookNo === normalizedKeyword;

    });

    // ==========================================
    // PRIORITY:
    // If exact Bill Book No exists,
    // SHOW ONLY THAT BILL
    // ==========================================

    if (bookMatches.length > 0) {

        displayBills(bookMatches);

        return;

    }

    // ==========================================
    // NORMAL SEARCH
    // Bill No / Customer / Mobile / Book No
    // ==========================================

    const filtered = bills.filter(bill =>

        (bill.billNo || "")
            .toLowerCase()
            .includes(keyword)

        ||

        (bill.billBookNo || "")
            .toLowerCase()
            .includes(keyword)

        ||

        (bill.customer || "")
            .toLowerCase()
            .includes(keyword)

        ||

        (bill.mobile || "")
            .toLowerCase()
            .includes(keyword)
        
        ||

        (bill.gst || "")
            .toLowerCase()
            .includes(keyword)    

    );

    displayBills(filtered);

});
// ==============================
// PART 3 STARTS HERE
// ==============================
// ==============================
// VIEW BILL
// ==============================

function viewBill(billNo) {

    selectedBill = bills.find(
        bill => bill.billNo === billNo
    );

    if (!selectedBill) {

        showToast("Bill not found.","error");

        return;

    }

    // ==========================
    // CUSTOMER DETAILS
    // ==========================

    setText("viewBillNo", selectedBill.billNo);
    setText("viewBillBookNo",selectedBill.billBookNo || "-");
    setText("viewCustomer", selectedBill.customer);
    setText(
    "viewMobile",
    getBillCustomerContact(selectedBill)
    );
    setText("viewAddress", selectedBill.address || "-");
    setText("viewDate", formatDisplayDate(selectedBill.date));
    setText("viewPaymentMode", selectedBill.paymentMode || "Cash");

    setText(
    "viewAmountPaid",
    formatCurrency(selectedBill.amountPaid)
);

    const status =
    (Number(selectedBill.balanceDue) || 0) <= 0
        ? "Paid"
        : "Pending";

    setText(
        "viewPaymentStatus",
        status
    );

    // ==========================
    // SUMMARY
    // ==========================

    setText("viewSubTotal", selectedBill.subTotal);

    const totalGST = parseAmount(selectedBill.gstTotal);

    setText(
        "viewCGST",
        "Rs. " + (totalGST / 2).toFixed(2)
    );

    setText(
        "viewSGST",
        "Rs. " + (totalGST / 2).toFixed(2)
    );

    setText(
    "viewGST",
    formatCurrency(selectedBill.gstTotal)
    );

    setText(
    "viewDiscount",
    formatCurrency(selectedBill.discount)
    );

    setText(
    "viewGrandTotal",
    formatCurrency(selectedBill.grandTotal)
);

    setText(
    "viewAmountPaid2",
    formatCurrency(selectedBill.amountPaid)
    );
    
    setText(
        "viewBalanceDue2",
        formatCurrency(selectedBill.balanceDue)
    );

    setText(
    "viewPaymentStatus2",
    status
);

    // ==========================
    // PRODUCTS
    // ==========================

    const tbody = document.getElementById("viewItems");

    tbody.innerHTML = "";

    (selectedBill.items || []).forEach((item, index) => {

    tbody.innerHTML += `

<tr>

    <td>${index + 1}</td>

    <td>${item.code}</td>

    <td>${item.productName}</td>

    <td>${item.unit}</td>

    <td>${
        item.unit === "Meter"
            ? Number(item.qty).toFixed(2)
            : parseInt(item.qty)
    }</td>

    <td>${formatCurrency(item.rate)}</td>

    <td>${item.cgst}%</td>

    <td>${item.sgst}%</td>

    <td>${item.gst}%</td>

    <td>${formatCurrency(item.total)}</td>

</tr>

`;

    });

    // ==========================
    // OPEN MODAL
    // ==========================

    const modal = new bootstrap.Modal(
        document.getElementById("billModal")
    );

    modal.show();

}
// ==========================================
// FULL EDIT BILL
// ==========================================

let editBillItems = [];

const editBillBtn =
    document.getElementById("editBillBtn");

const editBillModalElement =
    document.getElementById("editBillModal");

const editBillItemsBody =
    document.getElementById("editBillItems");


// ==========================================
// CHECK EDIT BILL ELEMENTS
// ==========================================

if (editBillBtn && editBillModalElement && editBillItemsBody) {

    editBillBtn.addEventListener("click", function () {

        if (!selectedBill) {

            showToast(
                "No bill selected.",
                "error"
            );

            return;
        }

        document.getElementById("editBillNo").value =
            selectedBill.billNo || "";

        document.getElementById("editBillBookNo").value =
            selectedBill.billBookNo || "";

        document.getElementById("editBillCustomer").value =
            selectedBill.customer || "";

        document.getElementById("editBillMobile").value =
            selectedBill.mobile || "";

        document.getElementById("editBillGST").value =
            getBillCustomerGST(selectedBill) || "";  

        document.getElementById("editBillAddress").value =
            selectedBill.address || "";

        document.getElementById("editBillPaymentMode").value =
            selectedBill.paymentMode || "Cash";

        document.getElementById("editNoOfBales").value =
            selectedBill.noOfBales || "";

        document.getElementById("editTransport").value =
            selectedBill.transport || "";

        document.getElementById("editLRNo").value =
            selectedBill.lrNo || "";

        document.getElementById("editDeliveryShopNo").value =
            selectedBill.deliveryShopNo || "";

        document.getElementById("editDiscount").value =
            Number(selectedBill.discount || 0);

        document.getElementById("editAmountPaid").value =
            Number(selectedBill.amountPaid || 0);


        const dateInput =
            document.getElementById("editBillDate");

        if (selectedBill.date) {

            const date =
                new Date(selectedBill.date);

            if (!isNaN(date.getTime())) {

                dateInput.value =
                    date.toISOString().split("T")[0];

            }

        }


        editBillItems =
            JSON.parse(
                JSON.stringify(
                    selectedBill.items || []
                )
            );


        renderEditBillItems();


        const modal =
            new bootstrap.Modal(
                editBillModalElement
            );

        modal.show();

    });

}


// ==========================================
// RENDER EDIT BILL PRODUCTS
// ==========================================
// ==========================================
// HANDLE EDIT BILL ITEM CHANGE
// ==========================================

function handleEditBillItemChange(event) {

    const input = event.target;

    const index =
        Number(input.dataset.index);

    const field =
        input.dataset.field;

    if (
        Number.isNaN(index) ||
        !editBillItems[index] ||
        !field
    ) {
        return;
    }

    let value = input.value;

    // ======================================
    // NUMBER FIELDS
    // ======================================

    if (
        field === "qty" ||
        field === "rate" ||
        field === "cgst" ||
        field === "sgst" ||
        field === "gst"
    ) {

        value = Number(value || 0);

    }

    // ======================================
    // UPDATE ITEM
    // ======================================

    editBillItems[index][field] = value;

    // ======================================
    // UNIT CHANGE
    // ======================================

    if (field === "unit") {

        const qtyInput =
            document.querySelector(
                `.edit-item-qty[data-index="${index}"]`
            );

        if (qtyInput) {

            qtyInput.step =
                value === "Meter"
                    ? "0.01"
                    : "1";

            if (value === "Piece") {

                editBillItems[index].qty =
                    Math.round(
                        Number(
                            editBillItems[index].qty || 0
                        )
                    );

                qtyInput.value =
                    editBillItems[index].qty;

            }

        }

    }

    // ======================================
    // RECALCULATE
    // ======================================

    calculateEditBillTotals();

}

function renderEditBillItems() {

    editBillItemsBody.innerHTML = "";


    if (editBillItems.length === 0) {

        editBillItemsBody.innerHTML = `

            <tr>

                <td
                    colspan="11"
                    class="text-center text-muted">

                    No products added

                </td>

            </tr>

        `;

        calculateEditBillTotals();

        return;
    }


    editBillItems.forEach(
        (item, index) => {

            const qty =
                Number(item.qty || 0);

            const rate =
                Number(item.rate || 0);


            const cgst =
                Number(item.cgst || 0);

            const sgst =
                Number(item.sgst || 0);


            const gst =
                Number(
                    item.gst !== undefined
                        ? item.gst
                        : cgst + sgst
                );


            editBillItemsBody.innerHTML += `

                <tr>

                    <td>

                        <input
                            type="text"
                            class="form-control form-control-sm"
                            value="${escapeEditValue(item.code)}"
                            data-index="${index}"
                            data-field="code">

                    </td>


                    <td>

                        <input
                            type="text"
                            class="form-control form-control-sm"
                            value="${escapeEditValue(item.productName)}"
                            data-index="${index}"
                            data-field="productName">

                    </td>


                    <td>

                        <input
                            type="text"
                            class="form-control form-control-sm"
                            value="${escapeEditValue(item.hsnCode || "")}"
                            data-index="${index}"
                            data-field="hsnCode">

                    </td>


                    <td>

                        <select
                            class="form-select form-select-sm"
                            data-index="${index}"
                            data-field="unit">

                            <option
                                value="Piece"
                                ${item.unit === "Piece" ? "selected" : ""}>
                                Piece
                            </option>

                            <option
                                value="Meter"
                                ${item.unit === "Meter" ? "selected" : ""}>
                                Meter
                            </option>

                        </select>

                    </td>


                    <td>

                        <input
                            type="number"
                            class="form-control form-control-sm edit-item-qty"
                            min="0"
                            step="${item.unit === "Meter" ? "0.01" : "1"}"
                            value="${qty}"
                            data-index="${index}"
                            data-field="qty">

                    </td>


                    <td>

                        <input
                            type="number"
                            class="form-control form-control-sm edit-item-rate"
                            min="0"
                            step="0.01"
                            value="${rate.toFixed(2)}"
                            data-index="${index}"
                            data-field="rate">

                    </td>


                    <td>

                        <input
                            type="number"
                            class="form-control form-control-sm"
                            min="0"
                            step="0.01"
                            value="${cgst}"
                            data-index="${index}"
                            data-field="cgst">

                    </td>


                    <td>

                        <input
                            type="number"
                            class="form-control form-control-sm"
                            min="0"
                            step="0.01"
                            value="${sgst}"
                            data-index="${index}"
                            data-field="sgst">

                    </td>


                    <td>

                        <input
                            type="number"
                            class="form-control form-control-sm"
                            min="0"
                            step="0.01"
                            value="${gst}"
                            data-index="${index}"
                            data-field="gst">

                    </td>


                    <td>

                        <strong
                            id="editItemTotal_${index}">

                            Rs. 0.00

                        </strong>

                    </td>


                    <td>

                        <button
                            type="button"
                            class="btn btn-danger btn-sm"
                            onclick="removeEditBillItem(${index})">

                            <i class="bi bi-trash"></i>

                        </button>

                    </td>

                </tr>

            `;

        }
    );


    // Attach input listeners

    editBillItemsBody
        .querySelectorAll("input, select")
        .forEach(input => {

            input.addEventListener(
                "input",
                handleEditBillItemChange
            );

            input.addEventListener(
                "change",
                handleEditBillItemChange
            );

        });


    calculateEditBillTotals();

}
// ==========================================
// CALCULATE EDIT BILL TOTALS
// ==========================================

function calculateEditBillTotals() {

    let subTotal = 0;

    let cgstTotal = 0;

    let sgstTotal = 0;


    editBillItems.forEach(
        (item, index) => {

            const qty =
                Number(item.qty || 0);

            const rate =
                Number(item.rate || 0);

            const cgst =
                Number(item.cgst || 0);

            const sgst =
                Number(item.sgst || 0);


            const basic =
                qty * rate;


            const cgstAmount =
                basic * cgst / 100;

            const sgstAmount =
                basic * sgst / 100;


            const total =
                basic +
                cgstAmount +
                sgstAmount;


            item.basic =
                Number(basic.toFixed(2));

            item.gst =
                Number(
                    (cgst + sgst).toFixed(2)
                );

            item.total =
                Number(total.toFixed(2));


            subTotal += basic;

            cgstTotal += cgstAmount;

            sgstTotal += sgstAmount;


            const totalElement =
                document.getElementById(
                    `editItemTotal_${index}`
                );

            if (totalElement) {

                totalElement.textContent =
                    "Rs. " +
                    total.toFixed(2);

            }

        }
    );


    const totalGST =
        cgstTotal + sgstTotal;


    const discount =
        Number(
            document.getElementById(
                "editDiscount"
            ).value || 0
        );


    let grandTotal =
        subTotal +
        totalGST -
        discount;


    if (grandTotal < 0) {

        grandTotal = 0;

    }


    const amountPaid =
        Number(
            document.getElementById(
                "editAmountPaid"
            ).value || 0
        );


    const balanceDue =
        Math.max(
            grandTotal - amountPaid,
            0
        );


    document.getElementById(
        "editSubTotal"
    ).textContent =
        "Rs. " + subTotal.toFixed(2);


    document.getElementById(
        "editCGST"
    ).textContent =
        "Rs. " + cgstTotal.toFixed(2);


    document.getElementById(
        "editSGST"
    ).textContent =
        "Rs. " + sgstTotal.toFixed(2);


    document.getElementById(
        "editGST"
    ).textContent =
        "Rs. " + totalGST.toFixed(2);


    document.getElementById(
        "editGrandTotal"
    ).textContent =
        "Rs. " + grandTotal.toFixed(2);


    document.getElementById(
        "editBalanceDue"
    ).textContent =
        "Rs. " + balanceDue.toFixed(2);


    document.getElementById(
        "editBillStatus"
    ).textContent =
        balanceDue <= 0
            ? "Paid"
            : "Pending";


    // Store calculated values temporarily

    window.currentEditBillTotals = {

        subTotal:
            Number(subTotal.toFixed(2)),

        cgstTotal:
            Number(cgstTotal.toFixed(2)),

        sgstTotal:
            Number(sgstTotal.toFixed(2)),

        gstTotal:
            Number(totalGST.toFixed(2)),

        grandTotal:
            Number(grandTotal.toFixed(2)),

        balanceDue:
            Number(balanceDue.toFixed(2))

    };

}
// ==========================================
// ADD PRODUCT TO EDIT BILL
// ==========================================

document
    .getElementById("addEditBillItem")
    .addEventListener("click", function () {

        editBillItems.push({

            code: "",

            productName: "",

            hsnCode: "",

            unit: "Piece",

            qty: 1,

            rate: 0,

            cgst: 0,

            sgst: 0,

            gst: 0,

            basic: 0,

            total: 0

        });


        renderEditBillItems();

    });
// ==========================================
// REMOVE EDIT BILL PRODUCT
// ==========================================

window.removeEditBillItem =
    function (index) {

        if (
            index < 0 ||
            index >= editBillItems.length
        ) {
            return;
        }


        editBillItems.splice(
            index,
            1
        );


        renderEditBillItems();

    };
    // ==========================================
// SAFE HTML VALUE
// ==========================================

function escapeEditValue(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}
// ==========================================
// DISCOUNT / PAYMENT CHANGE
// ==========================================

document
    .getElementById("editDiscount")
    .addEventListener(
        "input",
        calculateEditBillTotals
    );


document
    .getElementById("editAmountPaid")
    .addEventListener(
        "input",
        calculateEditBillTotals
    );
    // ==========================================
// SAVE FULL BILL EDIT
// ==========================================

document
    .getElementById("saveFullBillEdit")
    .addEventListener(
        "click",
        async function () {

            if (!selectedBill) {

                showToast(
                    "No bill selected.",
                    "error"
                );

                return;

            }


            try {

                // ----------------------------------
                // FIND ORIGINAL BILL
                // ----------------------------------

                const billIndex =
                    bills.findIndex(
                        bill =>
                            bill.billNo ===
                            selectedBill.billNo
                    );


                if (billIndex === -1) {

                    showToast(
                        "Bill not found.",
                        "error"
                    );

                    return;

                }


                // ----------------------------------
                // CURRENT TOTALS
                // ----------------------------------

                calculateEditBillTotals();


                const totals =
                    window.currentEditBillTotals;


                // ----------------------------------
                // AMOUNT PAID
                // ----------------------------------

                const amountPaid =
                    Number(
                        document.getElementById(
                            "editAmountPaid"
                        ).value || 0
                    );


                // ----------------------------------
                // UPDATE BILL
                // ----------------------------------

                const updatedBill = {

                    ...bills[billIndex],


                    // Bill details

                    billBookNo:
                        document.getElementById(
                            "editBillBookNo"
                        ).value.trim(),


                    customer:
                        document.getElementById(
                            "editBillCustomer"
                        ).value.trim(),


                    mobile:
                        document.getElementById(
                            "editBillMobile"
                        ).value.trim(),

                    gst:
                        document.getElementById(
                            "editBillGST"
                        ).value.trim(),    


                    address:
                        document.getElementById(
                            "editBillAddress"
                        ).value.trim(),


                    paymentMode:
                        document.getElementById(
                            "editBillPaymentMode"
                        ).value,


                    noOfBales:
                        document.getElementById(
                            "editNoOfBales"
                        ).value,


                    transport:
                        document.getElementById(
                            "editTransport"
                        ).value.trim(),


                    lrNo:
                        document.getElementById(
                            "editLRNo"
                        ).value.trim(),


                    deliveryShopNo:
                        document.getElementById(
                            "editDeliveryShopNo"
                        ).value.trim(),


                    // Date

                    date:
                        document.getElementById(
                            "editBillDate"
                        ).value,


                    // Products

                    items:
                        JSON.parse(
                            JSON.stringify(
                                editBillItems
                            )
                        ),


                    // Totals

                    subTotal:
                        "Rs. " +
                        totals.subTotal.toFixed(2),


                    cgstTotal:
                        "Rs. " +
                        totals.cgstTotal.toFixed(2),


                    sgstTotal:
                        "Rs. " +
                        totals.sgstTotal.toFixed(2),


                    gstTotal:
                        "Rs. " +
                        totals.gstTotal.toFixed(2),


                    discount:
                        Number(
                            document.getElementById(
                                "editDiscount"
                            ).value || 0
                        ),


                    grandTotal:
                        "Rs. " +
                        totals.grandTotal.toFixed(2),


                    amountPaid:
                        Number(
                            amountPaid.toFixed(2)
                        ),


                    balanceDue:
                        Number(
                            totals.balanceDue.toFixed(2)
                        ),


                    paymentStatus:
                        totals.balanceDue <= 0
                            ? "Paid"
                            : "Pending"

                };


                // ----------------------------------
                // UPDATE ARRAY
                // ----------------------------------

                bills[billIndex] =
                    updatedBill;


                selectedBill =
                    bills[billIndex];


                // ----------------------------------
                // SAVE DATABASE
                // ----------------------------------

                await saveDatabase();


                // ----------------------------------
                // REFRESH
                // ----------------------------------

                displayBills(bills);


                // ----------------------------------
                // REFRESH VIEW
                // ----------------------------------

                viewBill(
                    selectedBill.billNo
                );


                // ----------------------------------
                // SUCCESS
                // ----------------------------------

                showToast(
                    "Bill updated successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Edit Bill Error:",
                    error
                );


                showToast(
                    "Failed to update bill.",
                    "error"
                );

            }

        }
    );

// ==============================
// PART 4 STARTS HERE
// ==============================

// ==============================
// REPRINT BILL
// SAME STRUCTURE AS BILLING PAGE
// ==============================

document
    .getElementById("reprintBill")
    .addEventListener(
        "click",
        async function () {

            try {

                // ==========================================
                // CHECK SELECTED BILL
                // ==========================================

                if (!selectedBill) {

                    showToast(
                        "No bill selected.",
                        "error"
                    );

                    return;
                }


                // ==========================================
                // REFRESH DATABASE
                // ==========================================

                await refreshDatabase();


                // ==========================================
                // GET LATEST BILL
                // ==========================================

                const selectedBillNo =
                    selectedBill.billNo;


                const latestBill =
                    bills.find(
                        bill =>
                            String(bill.billNo || "") ===
                            String(selectedBillNo || "")
                    );


                if (!latestBill) {

                    showToast(
                        "Bill not found.",
                        "error"
                    );

                    return;
                }


                selectedBill = latestBill;


                // ==========================================
                // SETTINGS
                // ==========================================

                const invoiceSettings =
                    db.settings || {};


                // ==========================================
                // CREATE PDF
                // EXACT BILLING PAGE FORMAT
                // ==========================================

                const { jsPDF } =
                    window.jspdf;


                const doc =
                    new jsPDF({

                        orientation: "portrait",

                        unit: "mm",

                        format: "a4"

                    });


                const pageWidth =
                    doc.internal.pageSize.getWidth();


                const pageHeight =
                    doc.internal.pageSize.getHeight();


                const centerX =
                    pageWidth / 2;


                // ==========================================
                // COLORS
                // ==========================================

                const GOLD =
                    [255, 193, 7];


                const LIGHT_GOLD =
                    [255, 248, 220];


                const BLACK =
                    [0, 0, 0];


                const RED =
                    [220, 53, 69];


                // ==========================================
                // MONEY FORMAT
                // ==========================================

                function formatInvoiceMoney(value) {

                    const amount =
                        Number(
                            String(value ?? 0)
                                .replace(/[^\d.-]/g, "")
                        ) || 0;


                    return (
                        "Rs. " +
                        amount.toLocaleString(
                            "en-IN",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }
                        )
                    );
                }


                function formatInvoiceTableMoney(value) {

                    const amount =
                        Number(
                            String(value ?? 0)
                                .replace(/[^\d.-]/g, "")
                        ) || 0;


                    return amount.toLocaleString(
                        "en-IN",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );
                }


                function numericValue(value) {

                    return Number(
                        String(value ?? 0)
                            .replace(/[^\d.-]/g, "")
                    ) || 0;
                }


                // ==========================================
                // PAGE BORDER
                // EXACT BILLING PAGE
                // ==========================================

                function drawPageBorder() {

                    // Outer border

                    doc.setDrawColor(...GOLD);

                    doc.setLineWidth(1.5);

                    doc.roundedRect(
                        4,
                        4,
                        pageWidth - 8,
                        pageHeight - 8,
                        5,
                        5
                    );


                    // Inner border

                    doc.setLineWidth(0.45);

                    doc.roundedRect(
                        8,
                        8,
                        pageWidth - 16,
                        pageHeight - 16,
                        4,
                        4
                    );
                }


                drawPageBorder();


                // ==========================================
                // SHOP DETAILS
                // ==========================================

                const SHOP_NAME =
                    invoiceSettings.shopName ||
                    "Sri Venkata Siva Sai Cloth & Matchings";


                const SHOP_ADDRESS =
                    invoiceSettings.shopAddress ||
                    "Opp Sai Lodge, R.R. Road, Chirala - 523155, Andhra Pradesh";


                const SHOP_PHONE =
                    invoiceSettings.shopMobile ||
                    "";


                const SHOP_GST =
                    invoiceSettings.shopGST ||
                    "";


                // ==========================================
                // LOGO
                // ==========================================

                try {

                    const logo =
                        document.getElementById("shopLogo");


                    if (
                        logo &&
                        logo.complete &&
                        logo.naturalWidth > 0
                    ) {

                        doc.addImage(
                            logo,
                            "PNG",
                            13,
                            11,
                            29,
                            29
                        );
                    }

                } catch (e) {

                    console.log(
                        "Invoice logo not found"
                    );
                }


                // ==========================================
                // SHOP HEADER
                // ==========================================

                const headerCenterX =
                    centerX + 10;


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(20);


                doc.text(
                    SHOP_NAME,
                    headerCenterX,
                    22,
                    {
                        align: "center"
                    }
                );


                doc.setFont(
                    "helvetica",
                    "normal"
                );

                doc.setFontSize(12);


                const shopAddressLines =
                    doc.splitTextToSize(
                        SHOP_ADDRESS,
                        120
                    );


                doc.text(
                    shopAddressLines,
                    headerCenterX,
                    29,
                    {
                        align: "center"
                    }
                );


                const phoneY =
                    32 +
                    (
                        shopAddressLines.length *
                        5
                    );


                doc.text(
                    "Phone : " +
                    SHOP_PHONE +
                    "   |   GSTIN : " +
                    SHOP_GST,
                    headerCenterX,
                    phoneY,
                    {
                        align: "center"
                    }
                );


                // ==========================================
                // TAX INVOICE DECORATIVE LINE
                // ==========================================

                doc.setDrawColor(...GOLD);

                doc.setLineWidth(0.8);


                // Left line

                doc.line(
                    12,
                    47,
                    76,
                    47
                );


                // Right line

                doc.line(
                    134,
                    47,
                    pageWidth - 12,
                    47
                );


                // Left diamond

                doc.setLineWidth(0.7);

                doc.rect(
                    78,
                    45,
                    4,
                    4,
                    "S"
                );


                // Right diamond

                doc.rect(
                    pageWidth - 82,
                    45,
                    4,
                    4,
                    "S"
                );
                // ==========================================
                // COPY LABEL
                // ==========================================
                
                doc.setFont(
                    "helvetica",
                    "bold"
                );
                
                doc.setFontSize(9);
                
                doc.setTextColor(
                    90,
                    90,
                    90
                );
                
                doc.text(
                    "COPY INVOICE",
                    pageWidth - 18,
                    13,
                    {
                        align: "right"
                    }
                );
                
                doc.setTextColor(
                    ...BLACK
                );


                // ==========================================
                // TAX INVOICE BOX
                // ==========================================

                doc.setFillColor(
                    ...GOLD
                );


                doc.roundedRect(
                    78,
                    42,
                    54,
                    10,
                    3,
                    3,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(15);


                doc.text(
                    "TAX INVOICE",
                    centerX,
                    49,
                    {
                        align: "center"
                    }
                );


                // ==========================================
                // CUSTOMER + INVOICE DETAILS
                // ==========================================

                const detailsY = 57;

                const detailsH = 42;

                const leftX = 11;

                const gap = 5;

                const boxW =
                    (
                        pageWidth -
                        22 -
                        gap
                    ) / 2;

                const rightX =
                    leftX +
                    boxW +
                    gap;


                // ==========================================
                // CUSTOMER DETAILS BOX
                // ==========================================

                doc.setDrawColor(...GOLD);

                doc.setLineWidth(0.6);


                doc.roundedRect(
                    leftX,
                    detailsY,
                    boxW,
                    detailsH,
                    3,
                    3
                );


                // Header background

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    leftX + 0.5,
                    detailsY + 0.5,
                    boxW - 1,
                    10,
                    2.5,
                    2.5,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(11);


                doc.text(
                    "CUSTOMER DETAILS",
                    leftX + 5,
                    detailsY + 7
                );


                // ==========================================
                // HISTORICAL CUSTOMER DATA
                // ==========================================

                const customerGST =
                    getBillCustomerGST(
                        selectedBill
                    ) || "-";


                const customerNameValue =
                    selectedBill.customer ||
                    "Walk-in Customer";


                const customerMobile =
                    selectedBill.mobile ||
                    getBillCustomerContact(
                        selectedBill
                    ) ||
                    "-";


                const customerAddress =
                    selectedBill.address ||
                    "-";


                const customerRows = [

                    [
                        "Customer",
                        customerNameValue
                    ],

                    [
                        "Mobile",
                        customerMobile
                    ],

                    [
                        "GST No.",
                        customerGST
                    ],

                    [
                        "Address",
                        customerAddress
                    ]

                ];


                let customerY =
                    detailsY + 17;


                customerRows.forEach(
                    ([label, value]) => {

                        doc.setFont(
                            "helvetica",
                            "normal"
                        );

                        doc.setFontSize(9.5);


                        doc.text(
                            label,
                            leftX + 5,
                            customerY
                        );


                        doc.text(
                            ":",
                            leftX + 34,
                            customerY
                        );


                        doc.text(
                            String(value || "-"),
                            leftX + 40,
                            customerY
                        );


                        customerY += 7;

                    }
                );


                // ==========================================
                // INVOICE DETAILS BOX
                // ==========================================

                doc.setDrawColor(...GOLD);


                doc.roundedRect(
                    rightX,
                    detailsY,
                    boxW,
                    detailsH,
                    3,
                    3
                );


                // Header background

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    rightX + 0.5,
                    detailsY + 0.5,
                    boxW - 1,
                    10,
                    2.5,
                    2.5,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(11);


                doc.text(
                    "INVOICE DETAILS",
                    rightX + 5,
                    detailsY + 7
                );


                const invoiceRows = [

                    [
                        "Bill No.",
                        selectedBill.billNo ||
                        "-"
                    ],

                    [
                        "Date",
                        formatDisplayDate(
                            selectedBill.date
                        )
                    ],

                    [
                        "Payment",
                        selectedBill.paymentMode ||
                        "-"
                    ],

                    [
                        "Bill Book No.",
                        selectedBill.billBookNo ||
                        "-"
                    ]

                ];


                let invoiceY =
                    detailsY + 17;


                invoiceRows.forEach(
                    ([label, value]) => {

                        doc.setFont(
                            "helvetica",
                            "normal"
                        );

                        doc.setFontSize(9.5);


                        doc.text(
                            label,
                            rightX + 5,
                            invoiceY
                        );


                        doc.text(
                            ":",
                            rightX + 39,
                            invoiceY
                        );


                        doc.text(
                            String(value || "-"),
                            rightX + 45,
                            invoiceY
                        );


                        invoiceY += 7;

                    }
                );


                // ==========================================
                // PRODUCT TABLE
                // ==========================================

                const tableY =
                    detailsY +
                    detailsH +
                    4;


                const rows =
                    (selectedBill.items || [])
                        .map(
                            (item, index) => [

                                index + 1,

                                item.code || "-",

                                item.productName || "-",

                                item.hsnCode || "-",

                                item.unit || "-",

                                item.unit === "Meter"
                                    ? Number(
                                        item.qty || 0
                                    ).toFixed(2)
                                    : parseInt(
                                        item.qty || 0
                                    ) || 0,

                                formatInvoiceTableMoney(
                                    item.rate
                                ),

                                formatInvoiceTableMoney(
                                    item.basic
                                ),

                                (item.cgst || 0) + "%",

                                (item.sgst || 0) + "%",

                                (item.gst || 0) + "%",

                                formatInvoiceTableMoney(
                                    item.total
                                )

                            ]
                        );


                doc.autoTable({

                    startY: tableY,

                    margin: {

                        left: 11,

                        right: 10

                    },

                    tableWidth: "auto",

                    theme: "grid",

                    head: [[

                        "Sl",

                        "Code",

                        "Product",

                        "HSN",

                        "Unit",

                        "Qty",

                        "Rate\n(Rs.)",

                        "Taxable\n(Rs.)",

                        "CGST\n2.5%",

                        "SGST\n2.5%",

                        "GST\n5%",

                        "Total\n(Rs.)"

                    ]],

                    body: rows,

                    styles: {

                        font: "helvetica",

                        fontSize: 7.4,

                        cellPadding: 2,

                        halign: "center",

                        valign: "middle",

                        lineColor: GOLD,

                        lineWidth: 0.25,

                        textColor: BLACK

                    },

                    headStyles: {

                        fillColor: GOLD,

                        textColor: BLACK,

                        fontStyle: "bold",

                        fontSize: 7.4,

                        halign: "center",

                        valign: "middle"

                    },

                    bodyStyles: {

                        minCellHeight: 10

                    },

                    columnStyles: {

                        0: {
                            cellWidth: 8
                        },

                        1: {
                            cellWidth: 15
                        },

                        2: {
                            cellWidth: 29
                        },

                        3: {
                            cellWidth: 12
                        },

                        4: {
                            cellWidth: 15
                        },

                        5: {
                            cellWidth: 11
                        },

                        6: {
                            cellWidth: 15
                        },

                        7: {
                            cellWidth: 19
                        },

                        8: {
                            cellWidth: 15
                        },

                        9: {
                            cellWidth: 15
                        },

                        10: {
                            cellWidth: 12
                        },

                        11: {
                            cellWidth: 22
                        }

                    }

                });


                // ==========================================
                // POSITION AFTER TABLE
                // ==========================================

                let y =
                    doc.lastAutoTable.finalY + 5;


                if (
                    y + 105 >
                    pageHeight - 15
                ) {

                    doc.addPage();

                    drawPageBorder();

                    y = 18;

                }


                // ==========================================
                // PAYMENT DETAILS
                // ==========================================

                const paymentX = 11;

                const paymentW = 83;

                const paymentH = 42;


                doc.setDrawColor(...GOLD);


                doc.roundedRect(
                    paymentX,
                    y,
                    paymentW,
                    paymentH,
                    3,
                    3
                );


                // Header

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    paymentX + 0.5,
                    y + 0.5,
                    paymentW - 1,
                    10,
                    2.5,
                    2.5,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(11);


                doc.text(
                    "PAYMENT DETAILS",
                    paymentX + 5,
                    y + 7
                );


                const amountPaid =
                    numericValue(
                        selectedBill.amountPaid
                    );


                const balanceDue =
                    numericValue(
                        selectedBill.balanceDue
                    );


                const paymentRows = [

                    [
                        "Payment",
                        selectedBill.paymentMode ||
                        "-"
                    ],

                    [
                        "Paid",
                        formatInvoiceMoney(
                            amountPaid
                        )
                    ],

                    [
                        "Balance",
                        formatInvoiceMoney(
                            balanceDue
                        )
                    ]

                ];


                let paymentY =
                    y + 18;


                paymentRows.forEach(
                    ([label, value]) => {

                        doc.setFont(
                            "helvetica",
                            "bold"
                        );

                        doc.setFontSize(9.5);


                        doc.text(
                            label,
                            paymentX + 5,
                            paymentY
                        );


                        doc.setFont(
                            "helvetica",
                            "normal"
                        );


                        doc.text(
                            ":",
                            paymentX + 33,
                            paymentY
                        );


                        doc.text(
                            String(value),
                            paymentX + 39,
                            paymentY
                        );


                        paymentY += 7;

                    }
                );


                // Status

                doc.setFont(
                    "helvetica",
                    "bold"
                );


                doc.text(
                    "Status",
                    paymentX + 5,
                    paymentY
                );


                doc.setFont(
                    "helvetica",
                    "normal"
                );


                doc.text(
                    ":",
                    paymentX + 33,
                    paymentY
                );


                const paymentStatus =
                    balanceDue <= 0
                        ? "Paid"
                        : "Pending";


                if (
                    paymentStatus === "Paid"
                ) {

                    doc.setTextColor(
                        0,
                        150,
                        0
                    );

                } else {

                    doc.setTextColor(
                        ...RED
                    );
                }


                doc.text(
                    paymentStatus,
                    paymentX + 39,
                    paymentY
                );


                doc.setTextColor(
                    ...BLACK
                );


                // ==========================================
                // AMOUNT DETAILS
                // ==========================================

                const amountX =
                    paymentX +
                    paymentW +
                    5;


                const amountW =
                    pageWidth -
                    amountX -
                    11;


                const amountH =
                    86;


                doc.setDrawColor(...GOLD);


                doc.roundedRect(
                    amountX,
                    y,
                    amountW,
                    amountH,
                    3,
                    3
                );


                // Header

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    amountX + 0.5,
                    y + 0.5,
                    amountW - 1,
                    10,
                    2.5,
                    2.5,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(11);


                doc.text(
                    "AMOUNT DETAILS",
                    amountX + 5,
                    y + 7
                );


                // ==========================================
                // AMOUNT VALUES
                // ==========================================

                const subTotalValue =
                    numericValue(
                        selectedBill.subTotal
                    );


                const totalGST =
                    numericValue(
                        selectedBill.gstTotal
                    );


                const discountValue =
                    numericValue(
                        selectedBill.discount
                    );


                const cgstValue =
                    numericValue(
                        selectedBill.cgstTotal
                    ) ||
                    (
                        totalGST / 2
                    );


                const sgstValue =
                    numericValue(
                        selectedBill.sgstTotal
                    ) ||
                    (
                        totalGST / 2
                    );


                const roundOffValue =
                    numericValue(
                        selectedBill.roundOff
                    );


                const grandTotalValue =
                    numericValue(
                        selectedBill.grandTotal
                    );


                let amountY =
                    y + 18;


                // ==========================================
                // AMOUNT ROW
                // ==========================================

                function amountRow(
                    label,
                    value,
                    bold = false
                ) {

                    doc.setFont(
                        "helvetica",
                        bold
                            ? "bold"
                            : "normal"
                    );


                    doc.setFontSize(
                        bold
                            ? 10
                            : 9.5
                    );


                    doc.text(
                        label,
                        amountX + 5,
                        amountY
                    );


                    doc.setFont(
                        "helvetica",
                        "normal"
                    );


                    doc.text(
                        ":",
                        amountX + 39,
                        amountY
                    );


                    doc.text(
                        value,
                        amountX + amountW - 5,
                        amountY,
                        {
                            align: "right"
                        }
                    );


                    amountY += 7;
                }


                amountRow(
                    "Sub Total",
                    formatInvoiceMoney(
                        subTotalValue
                    )
                );


                amountRow(
                    "CGST (2.5%)",
                    formatInvoiceMoney(
                        cgstValue
                    )
                );


                amountRow(
                    "SGST (2.5%)",
                    formatInvoiceMoney(
                        sgstValue
                    )
                );


                // Divider

                doc.setDrawColor(...GOLD);

                doc.setLineWidth(0.4);


                doc.line(
                    amountX + 4,
                    amountY - 3,
                    amountX + amountW - 4,
                    amountY - 3
                );


                amountY += 2;


                amountRow(
                    "Total GST",
                    formatInvoiceMoney(
                        totalGST
                    )
                );


                // Divider

                doc.line(
                    amountX + 4,
                    amountY - 3,
                    amountX + amountW - 4,
                    amountY - 3
                );


                amountY += 2;


                amountRow(
                    "Discount",
                    formatInvoiceMoney(
                        discountValue
                    )
                );


                // Round Off

                let roundOffDisplay =
                    "0.00";


                if (
                    roundOffValue > 0
                ) {

                    roundOffDisplay =
                        "+" +
                        formatInvoiceTableMoney(
                            roundOffValue
                        );

                } else if (
                    roundOffValue < 0
                ) {

                    roundOffDisplay =
                        "-" +
                        formatInvoiceTableMoney(
                            Math.abs(
                                roundOffValue
                            )
                        );
                }


                amountRow(
                    "Round Off",
                    roundOffDisplay
                );


                // ==========================================
                // GRAND TOTAL
                // ==========================================

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    amountX + 3,
                    amountY - 5,
                    amountW - 6,
                    10,
                    2,
                    2,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(10.5);


                doc.text(
                    "Grand Total",
                    amountX + 5,
                    amountY + 2
                );


                doc.text(
                    formatInvoiceMoney(
                        grandTotalValue
                    ),
                    amountX + amountW - 5,
                    amountY + 2,
                    {
                        align: "right"
                    }
                );


                // ==========================================
                // TRANSPORT DETAILS
                // ==========================================

                const transportY =
                    y +
                    paymentH +
                    5;


                const transportH =
                    39;


                doc.setDrawColor(...GOLD);


                doc.roundedRect(
                    paymentX,
                    transportY,
                    paymentW,
                    transportH,
                    3,
                    3
                );


                // Header

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    paymentX + 0.5,
                    transportY + 0.5,
                    paymentW - 1,
                    10,
                    2.5,
                    2.5,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(10.5);


                doc.text(
                    "TRANSPORT DETAILS",
                    paymentX + 5,
                    transportY + 7
                );


                const transportRows = [

                    [
                        "No. of Bales",
                        selectedBill.noOfBales || ""
                    ],

                    [
                        "Transport",
                        selectedBill.transport || ""
                    ],

                    [
                        "L.R. No",
                        selectedBill.lrNo || ""
                    ],

                    [
                        "Delivery Shop No",
                        selectedBill.deliveryShopNo || ""
                    ]

                ];


                let transportTextY =
                    transportY + 18;


                transportRows.forEach(
                    ([label, value]) => {

                        doc.setFont(
                            "helvetica",
                            "bold"
                        );

                        doc.setFontSize(8.7);


                        doc.text(
                            label,
                            paymentX + 5,
                            transportTextY
                        );


                        doc.setFont(
                            "helvetica",
                            "normal"
                        );


                        doc.text(
                            ":",
                            paymentX + 43,
                            transportTextY
                        );


                        doc.text(
                            String(value),
                            paymentX + 48,
                            transportTextY
                        );


                        transportTextY += 6;

                    }
                );


                // ==========================================
                // AMOUNT IN WORDS
                // ==========================================

                const wordsY =
                    transportY +
                    transportH +
                    5;


                const wordsH =
                    22;


                doc.setDrawColor(...GOLD);


                doc.roundedRect(
                    11,
                    wordsY,
                    pageWidth - 22,
                    wordsH,
                    3,
                    3
                );


                // Header background

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    11.5,
                    wordsY + 0.5,
                    pageWidth - 23,
                    9,
                    2.5,
                    2.5,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(10.5);


                doc.text(
                    "AMOUNT IN WORDS",
                    16,
                    wordsY + 7
                );


                const amountWords =
                    numberToWords(
                        grandTotalValue
                    );


                doc.setFont(
                    "helvetica",
                    "normal"
                );

                doc.setFontSize(9.5);


                const amountLines =
                    doc.splitTextToSize(
                        amountWords,
                        pageWidth - 45
                    );


                doc.text(
                    amountLines,
                    16,
                    wordsY + 16
                );


                // ==========================================
                // BANK DETAILS
                // ==========================================

                const bankY =
                    wordsY +
                    wordsH +
                    5;


                const bankW =
                    98;


                const bankH =
                    34;


                doc.setDrawColor(...GOLD);


                doc.roundedRect(
                    11,
                    bankY,
                    bankW,
                    bankH,
                    3,
                    3
                );


                // Header

                doc.setFillColor(
                    ...LIGHT_GOLD
                );


                doc.roundedRect(
                    11.5,
                    bankY + 0.5,
                    bankW - 1,
                    9,
                    2.5,
                    2.5,
                    "F"
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "bold"
                );

                doc.setFontSize(10.5);


                doc.text(
                    "BANK DETAILS",
                    16,
                    bankY + 7
                );


                doc.setFont(
                    "helvetica",
                    "normal"
                );

                doc.setFontSize(9.5);


                doc.text(
                    "Axis Bank, Chirala Branch",
                    16,
                    bankY + 16
                );


                doc.text(
                    "A/c No    :    917020033692459",
                    16,
                    bankY + 23
                );


                doc.text(
                    "IFSC       :    UTIB0001017",
                    16,
                    bankY + 30
                );


                // ==========================================
                // AUTHORIZED SIGNATURE
                // ==========================================

                const signatureXOffset =
                    10;


                const signatureX =
                    pageWidth -
                    62 +
                    signatureXOffset;


                const signatureY =
                    bankY + 22;


                doc.setDrawColor(...GOLD);

                doc.setLineWidth(0.4);


                doc.line(
                    signatureX - 27,
                    signatureY,
                    signatureX + 27,
                    signatureY
                );


                doc.setTextColor(
                    ...BLACK
                );


                doc.setFont(
                    "helvetica",
                    "normal"
                );

                doc.setFontSize(11);


                doc.text(
                    "Authorized Signature",
                    signatureX,
                    signatureY + 7,
                    {
                        align: "center"
                    }
                );


                // ==========================================
                // FOOTER
                // ==========================================

                const footerY =
                    pageHeight - 20;


                // Thank you

                doc.setTextColor(
                    75,
                    20,
                    15
                );


                doc.setFont(
                    "helvetica",
                    "bolditalic"
                );

                doc.setFontSize(10);


                doc.text(
                    "Thank You For Shopping With Us!",
                    centerX,
                    footerY + 9,
                    {
                        align: "center"
                    }
                );


                // Computer generated

                doc.setTextColor(
                    40,
                    40,
                    60
                );


                doc.setFont(
                    "helvetica",
                    "normal"
                );

                doc.setFontSize(7);


                doc.text(
                    "C O M P U T E R   G E N E R A T E D   I N V O I C E",
                    centerX,
                    footerY + 14.5,
                    {
                        align: "center"
                    }
                );


                // ==========================================
                // SAVE PDF
                // ==========================================

                // Convert historical date to DD-MM-YYYY

                let reportDate =
                    formatDisplayDate(
                        selectedBill.date
                    );


                // Fallback if formatDisplayDate
                // returns something unexpected

                if (!reportDate) {

                    const dateObject =
                        new Date(
                            selectedBill.date
                        );


                    if (
                        !isNaN(
                            dateObject.getTime()
                        )
                    ) {

                        reportDate =
                            String(
                                dateObject.getDate()
                            ).padStart(2, "0") +
                            "-" +
                            String(
                                dateObject.getMonth() + 1
                            ).padStart(2, "0") +
                            "-" +
                            dateObject.getFullYear();
                    }
                }


                const pdfFileName =
                    `${selectedBill.billNo}_${reportDate}(report).pdf`;


                doc.save(
                    pdfFileName
                );


                showToast(
                    "Invoice Reprinted Successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Reprint Invoice Error:",
                    error
                );


                showToast(
                    "Failed to reprint invoice.",
                    "error"
                );

            }

        }
    );


// ==============================
// PART 5 STARTS HERE
// ==============================


// ==============================
// PART 5 STARTS HERE
// ==============================
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
// DELETE BILL
// ==============================

function deleteBill(billNo) {

    deleteBillIndex = bills.findIndex(
        bill => bill.billNo === billNo
    );

    if (deleteBillIndex === -1) {

        showToast("Bill not found.", "error");

        return;

    }

    // Show customer name in delete confirmation
    const deleteBillCustomerName =
        document.getElementById("deleteBillCustomerName");

    if (deleteBillCustomerName) {

        deleteBillCustomerName.textContent =
            bills[deleteBillIndex].customer || "Unknown Customer";

    }

    document
        .getElementById("deleteBillModal")
        .classList.add("show");
}

// ==============================
// PART 6 STARTS HERE
// ==============================
// ==============================
// REFRESH HISTORY
// ==============================

window.refreshHistory = async function () {

    await loadBills();

};

// ==============================
// PAGE LOAD
// ==============================

document.addEventListener("DOMContentLoaded", async () => {

    await applyTheme();

    await loadBills();

});

// ==============================
// SAVE DATABASE BEFORE EXIT
// ==============================

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
// ==============================
// DELETE BILL POPUP
// ==============================

document.addEventListener("DOMContentLoaded", () => {

    const deleteBillModal =
        document.getElementById("deleteBillModal");

    const confirmDeleteBill =
        document.getElementById("confirmDeleteBill");

    const cancelDeleteBill =
        document.getElementById("cancelDeleteBill");

    if (!deleteBillModal || !confirmDeleteBill || !cancelDeleteBill) {
        console.error("Delete Bill Modal elements not found.");
        return;
    }

    // Cancel

    cancelDeleteBill.addEventListener("click", () => {

        deleteBillModal.classList.remove("show");

        deleteBillIndex = -1;

    });

    // Click Outside

    deleteBillModal.addEventListener("click", (e) => {

        if (e.target === deleteBillModal) {

            deleteBillModal.classList.remove("show");

            deleteBillIndex = -1;

        }

    });

    // ESC

    document.addEventListener("keydown", (e) => {

        if (
            e.key === "Escape" &&
            deleteBillModal.classList.contains("show")
        ) {

            deleteBillModal.classList.remove("show");

            deleteBillIndex = -1;

        }

    });

    // Confirm Delete

    confirmDeleteBill.addEventListener("click", async () => {

        if (deleteBillIndex < 0) return;

        bills.splice(deleteBillIndex, 1);

        await saveDatabase();

        await loadBills();

        deleteBillModal.classList.remove("show");

        deleteBillIndex = -1;

        showToast("Bill Deleted Successfully", "success");

    });

});


// ==============================
// HISTORY.JS COMPLETED
// ==============================