// =====================================
// PROFESSIONAL INVOICE
// print.js
// =====================================

document.addEventListener("DOMContentLoaded", async function () {

    // =====================================
    // GET BILL NUMBER FROM URL
    // =====================================

    const params = new URLSearchParams(window.location.search);

    const billNo = params.get("bill");

    if (!billNo) {

        showToast("Bill Number not found.","info");

        window.close();

        return;

    }

    // =====================================
    // LOAD DATABASE
    // =====================================

    const db = await window.api.getDatabase();

    const bills = db.bills || [];

    const invoice = bills.find(bill => bill.billNo == billNo);

    if (!invoice) {

        showToast("Invoice not found.","info");

        window.close();

        return;

    }

    // =====================================
    // CUSTOMER DETAILS
    // =====================================

    document.getElementById("billNo").textContent =
        invoice.billNo || "";

    document.getElementById("customer").textContent =
        invoice.customer || "Walk-in Customer";

    document.getElementById("mobile").textContent =
        invoice.mobile || "-";

    document.getElementById("billDate").textContent =
        invoice.date || "";

    document.getElementById("paymentMode").textContent =
        invoice.paymentMode || "Cash";

    // =====================================
    // PRODUCTS
    // =====================================

    const tbody = document.getElementById("invoiceBody");

    tbody.innerHTML = "";

    (invoice.items || []).forEach(item => {

        const gst =
            item.gst ??
            (
                Number(item.cgst || 0) +
                Number(item.sgst || 0)
            );

        const row = `

        <tr>

            <td>${item.code || ""}</td>

            <td>${item.productName || item.product || item.name || ""}</td>

            <td>${item.unit || ""}</td>

            <td>${item.qty || 0}</td>

            <td>₹${Number(item.rate || 0).toFixed(2)}</td>

            <td>${gst}%</td>

            <td>₹${Number(item.total || 0).toFixed(2)}</td>

        </tr>

        `;

        tbody.insertAdjacentHTML("beforeend", row);

    });

    // =====================================
    // TOTALS
    // =====================================

    document.getElementById("subTotal").textContent =
        invoice.subTotal || "₹0.00";

    document.getElementById("gstTotal").textContent =
        invoice.gstTotal || "₹0.00";

    document.getElementById("discount").textContent =
        invoice.discount || "₹0.00";

    document.getElementById("grandTotal").textContent =
        invoice.grandTotal || "₹0.00";

    // =====================================
    // AUTO PRINT
    // =====================================

    setTimeout(() => {

        window.focus();

        requestAnimationFrame(() => {

            setTimeout(() => {

                window.print();

            }, 300);

        });

    }, 1500);

});