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

    const filtered = bills.filter(bill =>

        (bill.billNo || "")
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
    setText("viewMobile", selectedBill.mobile || "-");
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
    "viewAmountPaid",
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
// ==============================
document.getElementById("reprintBill").addEventListener("click", async function () {

try{

    if(!selectedBill){

        showToast("No bill selected.","info");

        return;

    }

    await refreshDatabase();

    const settings = db.settings || {};

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();

    const pageHeight = doc.internal.pageSize.getHeight();

    const centerX = pageWidth / 2;

    // ======================================
    // DOUBLE BORDER
    // ======================================

    doc.setDrawColor(255,193,7);

    doc.setLineWidth(0.8);

    doc.rect(
        6,
        6,
        pageWidth-12,
        pageHeight-12
    );

    doc.setLineWidth(0.4);

    doc.rect(
        9,
        9,
        pageWidth-18,
        pageHeight-18
    );

    // ======================================
    // LOGO
    // ======================================

    const logo = document.getElementById("shopLogo");

    if(logo){

        doc.addImage(
            logo,
            "PNG",
            14,
            10,
            22,
            22
        );

    }

    // ======================================
    // SHOP DETAILS
    // ======================================

    const SHOP_NAME =
        settings.shopName ||
        "Sri Venkata Siva Sai Cloth & Matchings";

    const SHOP_ADDRESS =
        settings.shopAddress || "-";

    const SHOP_PHONE =
        settings.shopMobile || "-";

    const SHOP_GST =
        settings.shopGST || "-";

    doc.setFont("helvetica","bold");
    doc.setFontSize(17);

    doc.text(
        SHOP_NAME,
        centerX,
        18,
        {align:"center"}
    );

    doc.setFont("helvetica","normal");
    doc.setFontSize(11);

    doc.text(
        SHOP_ADDRESS,
        centerX,
        26,
        {align:"center"}
    );

    doc.text(
        "Phone : " +
        SHOP_PHONE +
        "  |  GSTIN : " +
        SHOP_GST,
        centerX,
        32,
        {align:"center"}
    );

    doc.setDrawColor(255,193,7);

    doc.line(
        12,
        38,
        pageWidth-12,
        38
    );

    // ======================================
    // TAX INVOICE
    // ======================================

    doc.setFont("helvetica","bold");

    doc.setFontSize(16);

    doc.text(
        "TAX INVOICE",
        centerX,
        48,
        {align:"center"}
    );

    doc.line(
        20,
        48,
        centerX-28,
        48
    );

    doc.line(
        centerX+28,
        48,
        pageWidth-20,
        48
    );

    // ======================================
    // CUSTOMER DETAILS BOX
    // ======================================

    const detailsY = 54;

    doc.roundedRect(
        12,
        detailsY,
        pageWidth-24,
        44,
        2,
        2
    );

    const leftLabelX = 14;
    const leftColonX = 35;
    const leftValueX = 44;

    doc.setFont("helvetica","bold");
    doc.setFontSize(11);

    doc.text("Bill No",leftLabelX,63);
    doc.text("Customer",leftLabelX,73);
    doc.text("Mobile",leftLabelX,83);
    doc.text("Address",leftLabelX,93);

    doc.setFont("helvetica","normal");

    doc.text(":",leftColonX,63);
    doc.text(":",leftColonX,73);
    doc.text(":",leftColonX,83);
    doc.text(":",leftColonX,93);

    doc.text(
        selectedBill.billNo,
        leftValueX,
        63
    );

    doc.text(
        selectedBill.customer || "Walk-in Customer",
        leftValueX,
        73
    );

    doc.text(
        selectedBill.mobile || "-",
        leftValueX,
        83
    );

    const addressLines = doc.splitTextToSize(
        selectedBill.address || "-",
        80
    );

    doc.text(
        addressLines,
        leftValueX,
        93
    );

    // ======================================
    // RIGHT SIDE
    // ======================================

    const rightLabelX = 142;
    const rightColonX = 168;   // moved slightly left
    const rightValueX = 174;   // moved slightly left
    
    doc.setFont("helvetica","bold");
    
    doc.text("Date", rightLabelX, 63);
    doc.text("Payment", rightLabelX, 73);
    doc.text("Bill Book No", rightLabelX, 83);
    
    doc.setFont("helvetica","normal");
    
    // Colon aligned
    doc.text(":", rightColonX, 63);
    doc.text(":", rightColonX, 73);
    doc.text(":", rightColonX, 83);
    
    // Values aligned
    doc.text(
        formatDisplayDate(selectedBill.date),
        rightValueX,
        63
    );
    
    doc.text(
        selectedBill.paymentMode || "Cash",
        rightValueX,
        73
    );
    
    doc.text(
        selectedBill.billBookNo || "-",
        rightValueX,
        83
    );

// ======================================
// PRODUCT TABLE
// ======================================

const rows = (selectedBill.items || []).map((item,index)=>[

    index + 1,

    item.code,

    item.productName,

    item.hsnCode || "",

    item.unit,

    item.unit === "Meter"
        ? Number(item.qty).toFixed(2)
        : parseInt(item.qty),

    Number(item.rate).toFixed(2),

    Number(item.basic || (
        Number(item.rate) * Number(item.qty)
    )).toFixed(2),

    item.cgst + "%",

    item.sgst + "%",

    item.gst + "%",

    Number(item.total).toFixed(2)

]);

doc.autoTable({

    startY:102,

        head:[[
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

    body:rows,

    theme:"grid",

    styles:{

        lineColor:[255,193,7],

        lineWidth:0.2,

        fontSize:9,

        halign:"center",

        valign:"middle"

    },

    headStyles:{

        fillColor:[255,193,7],

        textColor:[0,0,0],

        fontStyle:"bold",

        halign:"center",

        fontSize:10

    },

    columnStyles:{
    0:{cellWidth:8},
    1:{cellWidth:16},
    2:{cellWidth:24},
    3:{cellWidth:15},
    4:{cellWidth:15},
    5:{cellWidth:12},
    6:{cellWidth:16},
    7:{cellWidth:18},
    8:{cellWidth:14},
    9:{cellWidth:14},
    10:{cellWidth:12},
    11:{cellWidth:19}
},

    margin:{
        left:14,
        right:12
    }

});

// ======================================
// NEXT SECTION START POSITION
// ======================================

const lastTableY = doc.lastAutoTable.finalY;

const currentPage =
    doc.internal.getNumberOfPages();

doc.setPage(currentPage);

let y = lastTableY;

// Same logic as Billing Page
const requiredHeight = 130;

if (y + requiredHeight > pageHeight - 15) {

    doc.addPage();

    const current =
        doc.internal.getNumberOfPages();

    doc.setPage(current);

    doc.setDrawColor(255,193,7);

    doc.setLineWidth(0.8);

    doc.rect(
        6,
        6,
        pageWidth - 12,
        pageHeight - 12
    );

    doc.setLineWidth(0.4);

    doc.rect(
        9,
        9,
        pageWidth - 18,
        pageHeight - 18
    );

    y = 20;

} else {

    y += 8;

}
const paymentX = 14;
const paymentY = Math.max(y, 20);
const paymentW = 74;
const paymentH = 34;

// ======================================
// TRANSPORT DETAILS
// ======================================

let infoY = paymentY + paymentH + 10;

function infoRow(label, value) {

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    doc.text(
        label,
        14,
        infoY
    );

    doc.setFont("helvetica", "normal");

    doc.text(
        ":",
        40,
        infoY
    );

    doc.text(
        value || "",
        44,
        infoY
    );

    infoY += 6;
}

infoRow(
    "No. of Bales",
    selectedBill.noOfBales
);

infoRow(
    "Transport",
    selectedBill.transport
);

infoRow(
    "L.R. No",
    selectedBill.lrNo
);

infoRow(
    "Delivery Shop No",
    selectedBill.deliveryShopNo
);


// ======================================
// AMOUNT IN WORDS
// ======================================

// Gap after Transport Details
infoY += 2;

doc.setFont("helvetica", "bold");
doc.setFontSize(11);

doc.text(
    "Amount In Words :",
    14,
    infoY
);

// Move down for amount text
infoY += 7;

doc.setFont("helvetica", "normal");
doc.setFontSize(10);

const amountWords = doc.splitTextToSize(
    numberToWords(
        Number(
            String(selectedBill.grandTotal)
                .replace(/[^\d.]/g, "")
        )
    ),
    95
);

doc.text(
    amountWords,
    14,
    infoY
);

// Move according to number of lines
infoY += (amountWords.length * 5);


// ======================================
// BANK DETAILS
// ======================================

// Gap after Amount In Words
infoY += 8;

doc.setFont("helvetica", "bold");
doc.setFontSize(11);

doc.text(
    "Bank Details",
    14,
    infoY
);

infoY += 6;

doc.setFont("helvetica", "normal");
doc.setFontSize(11);

doc.text(
    "Axis Bank, Chirala Branch",
    14,
    infoY
);

infoY += 7;

doc.text(
    "A/c No : 917020033692459",
    14,
    infoY
);

infoY += 7;

doc.text(
    "IFSC      : UTIB0001017",
    14,
    infoY
);
// ======================================
// PAYMENT BOX
// ======================================



doc.setDrawColor(255,193,7);
doc.setLineWidth(0.4);

doc.roundedRect(
    paymentX,
    paymentY,
    paymentW,
    paymentH,
    2,
    2
);

doc.setFont("helvetica","bold");
doc.setFontSize(10);

let py = paymentY + 7;

function paymentRow(label,value){

    doc.setFont("helvetica","bold");
    doc.text(label,paymentX+3,py);

    doc.setFont("helvetica","normal");
    doc.text(":",paymentX+28,py);

    doc.text(value,paymentX+33,py);

    py += 7;

}

paymentRow(
    "Payment",
    selectedBill.paymentMode || "Cash"
);

paymentRow(
    "Paid",
    "Rs. " +
    Number(selectedBill.amountPaid || 0).toFixed(2)
);

paymentRow(
    "Balance",
    "Rs. " +
    Number(selectedBill.balanceDue || 0).toFixed(2)
);

doc.setFont("helvetica","bold");
doc.text("Status",paymentX+3,py);

doc.setFont("helvetica","normal");
doc.text(":",paymentX+28,py);

const status =
(Number(selectedBill.balanceDue)||0)<=0
?"Paid":"Pending";

if(status==="Paid"){

    doc.setTextColor(0,128,0);

}else{

    doc.setTextColor(220,53,69);

}

doc.text(
    status,
    paymentX+33,
    py
);

doc.setTextColor(0);

// ======================================
// SUMMARY BOX
// ======================================

const boxX = 120;
const boxY = y;
const boxW = 74;
const boxH = 30;

doc.roundedRect(
    boxX,
    boxY,
    boxW,
    boxH,
    2,
    2
);

const gst =
parseFloat(
String(selectedBill.gstTotal)
.replace(/[^\d.]/g,"")
)||0;

let sy = boxY + 7;

function summaryRow(label,value,bold=false){

    doc.setFont(
        "helvetica",
        bold?"bold":"normal"
    );

    doc.text(label,boxX+3,sy);

    doc.text(
        value,
        boxX+70,
        sy,
        {align:"right"}
    );

    sy += 6;

}

summaryRow(
    "Sub Total",
    "Rs. " +
    Number(
        String(selectedBill.subTotal ?? 0)
            .replace(/[^\d.-]/g, "")
    ).toFixed(2)
);

summaryRow(
    "CGST (2.5%)",
    "Rs. "+(gst/2).toFixed(2)
);

summaryRow(
    "SGST (2.5%)",
    "Rs. "+(gst/2).toFixed(2)
);

summaryRow(
    "Total GST",
    "Rs. "+gst.toFixed(2)
);

doc.line(
    boxX+3,
    sy,
    boxX+70,
    sy
);

sy += 5;

summaryRow(
    "Discount",
    "Rs. "+
    Number(selectedBill.discount||0).toFixed(2)
);
const subTotal =
    Number(String(selectedBill.subTotal).replace(/[^\d.]/g, ""));

const discount =
    Number(selectedBill.discount || 0);

const calculatedGrand =
    Number(String(selectedBill.grandTotal).replace(/[^\d.]/g, ""));

const roundOff =
    selectedBill.roundOff !== undefined
        ? Number(selectedBill.roundOff)
        : (() => {

            const sub =
                Number(String(selectedBill.subTotal)
                    .replace(/[^\d.]/g, ""));

            const gst =
                Number(String(selectedBill.gstTotal)
                    .replace(/[^\d.]/g, ""));

            const discount =
                Number(selectedBill.discount || 0);

            const grand =
                Number(String(selectedBill.grandTotal)
                    .replace(/[^\d.]/g, ""));

            return +(grand - (sub + gst - discount)).toFixed(2);

        })();

summaryRow(
    "Round Off",
    (Number(roundOff) >= 0 ? "+" : "") +
    Number(roundOff).toFixed(2)
);

doc.setFillColor(255,248,220);

doc.rect(
    boxX,
    sy-4,
    boxW,
    8,
    "F"
);
summaryRow(
    "Grand Total",
    "Rs. " +
    Number(
        String(selectedBill.grandTotal)
            .replace(/[^\d.-]/g, "")
    ).toFixed(2),
    true
);




// ======================================
// SIGNATURE
// ======================================

const signY = pageHeight - 42;

doc.line(
    145,
    signY,
    195,
    signY
);

doc.setFont("helvetica","bold");
doc.setFontSize(10);

doc.text(
    "Authorized Signature",
    170,
    signY+6,
    {align:"center"}
);

// ======================================
// FOOTER
// ======================================

const footerY = pageHeight - 22;

doc.setDrawColor(255,193,7);

doc.line(
    12,
    footerY,
    pageWidth-12,
    footerY
);

doc.setFont("helvetica","bold");
doc.setFontSize(11);

doc.text(
    "Thank You For Shopping With Us!",
    pageWidth/2,
    footerY+5,
    {align:"center"}
);

doc.setFont("helvetica","normal");
doc.setFontSize(8);

doc.text(
    "Computer Generated Invoice",
    pageWidth/2,
    footerY+10,
    {align:"center"}
);

doc.text(
    "Page " + doc.internal.getCurrentPageInfo().pageNumber,
    pageWidth - 12,
    pageHeight - 2,
    { align: "right" }
);

// ======================================
// SAVE PDF
// ======================================

const pdfFileName =
`${selectedBill.billNo}_${formatDisplayDate(selectedBill.date)}(report).pdf`;

doc.save(pdfFileName);
    } catch (error) {

    alert(
        "ERROR:\n\n" +
        error.message +
        "\n\n" +
        error.stack
    );

}

});


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

        showToast("Bill not found.","error");

        return;

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