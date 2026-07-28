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
// DATABASE FUNCTIONS
// ==============================

async function refreshDatabase() {

    db = await window.api.getDatabase();

    bills = db.bills || [];

}

async function saveDatabase() {

    db.bills = bills;

    await window.api.saveDatabase(db);

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

        const gst = parseFloat(
            String(bill.gstTotal).replace(/[^\d.]/g, "")
        ) || 0;

        historyTableBody.innerHTML += `

<tr>

    <td>${bill.billNo}</td>

    <td>${bill.customer}</td>

    <td>₹${(gst / 2).toFixed(2)}</td>

    <td>₹${(gst / 2).toFixed(2)}</td>

    <td>${bill.gstTotal}</td>

    <td>${bill.grandTotal}</td>

    <td>₹${Number(bill.amountPaid || 0).toFixed(2)}</td>

    <td>₹${Number(bill.balanceDue || 0).toFixed(2)}</td>

    <td>

    ${(() => {

        const balance =
            Number(bill.balanceDue) || 0;

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
            onclick="viewBill(${index})">

            <i class="bi bi-eye"></i>

        </button>

        <button
            class="btn btn-danger btn-sm"
            onclick="deleteBill(${index})">

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

function viewBill(index) {

    if (!bills[index]) {

        showToast("Bill not found.","error");

        return;

    }

    selectedBill = bills[index];

    // ==========================
    // CUSTOMER DETAILS
    // ==========================

    setText("viewBillNo", selectedBill.billNo);
    setText("viewCustomer", selectedBill.customer);
    setText("viewMobile", selectedBill.mobile || "-");
    setText("viewAddress", selectedBill.address || "-");
    setText("viewDate", formatDisplayDate(selectedBill.date));
    setText("viewPaymentMode", selectedBill.paymentMode || "Cash");

    setText(
        "viewAmountPaid",
        "₹" + Number(selectedBill.amountPaid || 0).toFixed(2)
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

    const totalGST =
        parseFloat(
            String(selectedBill.gstTotal).replace(/[^\d.]/g, "")
        ) || 0;

    setText(
        "viewCGST",
        "₹" + (totalGST / 2).toFixed(2)
    );

    setText(
        "viewSGST",
        "₹" + (totalGST / 2).toFixed(2)
    );

    setText("viewGST", selectedBill.gstTotal);

    setText(
        "viewDiscount",
        "₹" + Number(selectedBill.discount || 0).toFixed(2)
    );

    setText(
        "viewGrandTotal",
        selectedBill.grandTotal
    );

    setText(
        "viewAmountPaid2",
        "₹" + Number(selectedBill.amountPaid || 0).toFixed(2)
    );

    setText(
        "viewBalanceDue2",
        "₹" + Number(selectedBill.balanceDue || 0).toFixed(2)
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

    (selectedBill.items || []).forEach(item => {

        tbody.innerHTML += `

<tr>

    <td>${item.code}</td>

    <td>${item.productName}</td>

    <td>${item.unit}</td>

    <td>${
        item.unit === "Meter"
            ? Number(item.qty).toFixed(2)
            : parseInt(item.qty)
    }</td>

    <td>₹${Number(item.rate).toFixed(2)}</td>

    <td>${item.cgst}%</td>

    <td>${item.sgst}%</td>

    <td>${item.gst}%</td>

    <td>₹${Number(item.total).toFixed(2)}</td>

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

// ==============================
// PART 4 STARTS HERE
// ==============================
// ==============================
// REPRINT BILL
// ==============================

document.getElementById("reprintBill").addEventListener("click", async function () {

    if (!selectedBill) {

        showToast("No bill selected.","info");

        return;

    }

    await refreshDatabase();

    const settings = db.settings || {};

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    // ==========================
    // SHOP DETAILS
    // ==========================

    const SHOP_NAME =
        settings.shopName ||
        "Sri Venkata Siva Sai Cloth & Matchings";

    const SHOP_ADDRESS =
        settings.address || "-";

    const SHOP_PHONE =
        settings.mobile || "-";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(SHOP_NAME, 105, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(SHOP_ADDRESS, 105, 26, { align: "center" });
    doc.text("Phone : " + SHOP_PHONE, 105, 32, { align: "center" });

    doc.line(10, 38, 200, 38);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("TAX INVOICE", 105, 46, { align: "center" });

    // ==========================
    // CUSTOMER DETAILS
    // ==========================

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text("Bill No : " + selectedBill.billNo, 14, 58);
    doc.text("Date : " + formatDisplayDate(selectedBill.date), 150, 58);

    doc.text("Customer : " + selectedBill.customer, 14, 66);

    doc.text(
        "Mobile : " + (selectedBill.mobile || "-"),
        14,
        74
    );

    doc.text(
        "Address : " + (selectedBill.address || "-"),
        14,
        82
    );

    doc.text(
        "Payment : " + (selectedBill.paymentMode || "Cash"),
        150,
        82
    );

    // ==========================
    // ITEMS TABLE
    // ==========================

    const rows = (selectedBill.items || []).map(item => [

        item.code,

        item.productName,

        item.unit,

        item.unit === "Meter"
            ? Number(item.qty).toFixed(2)
            : parseInt(item.qty),

        Number(item.rate).toFixed(2),

        item.cgst + "%",

        item.sgst + "%",

        item.gst + "%",

        Number(item.total).toFixed(2)

    ]);

    doc.autoTable({

        startY: 90,

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

        styles: {
            fontSize: 9
        }

    });

    let y = doc.lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");

    doc.text(
        "Sub Total : " +
        String(selectedBill.subTotal).replace("₹", "Rs. "),
        135,
        y
    );

    y += 8;

    doc.text(
        "GST : " +
        String(selectedBill.gstTotal).replace("₹", "Rs. "),
        135,
        y
    );

    y += 8;

    doc.text(
        "Discount : Rs. " +
        Number(selectedBill.discount || 0).toFixed(2),
        135,
        y
    );

    y += 8;

    doc.setFontSize(13);

    doc.text(
        "Grand Total : " +
        String(selectedBill.grandTotal).replace("₹", "Rs. "),
        135,
        y
    );

    y += 8;

    doc.setFontSize(11);

    doc.text(
        "Amount Paid : Rs. " +
        Number(selectedBill.amountPaid || 0).toFixed(2),
        135,
        y
    );

    y += 8;

    doc.text(
        "Balance Due : Rs. " +
        Number(selectedBill.balanceDue || 0).toFixed(2),
        135,
        y
    );

    y += 8;

    doc.text(
        "Status : " +
        (selectedBill.paymentStatus || "Paid"),
        135,
        y
    );

    y += 18;

    doc.line(145, y, 195, y);

    doc.setFontSize(10);

    doc.text(
        "Authorized Signature",
        170,
        y + 6,
        { align: "center" }
    );

    doc.setFontSize(11);

    doc.text(
        "Thank you for shopping with us!",
        105,
        285,
        { align: "center" }
    );

    const pdfFileName =
    `SVSS_Bill_${selectedBill.billNo.split("-").pop()}_${formatDisplayDate(selectedBill.date)}(report).pdf`;

    doc.save(pdfFileName);

});

// ==============================
// PART 5 STARTS HERE
// ==============================
// ==============================
// DELETE BILL
// ==============================

function deleteBill(index) {

    if (!bills[index]) {

        showToast("Bill not found.", "error");

        return;

    }

    deleteBillIndex = index;

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