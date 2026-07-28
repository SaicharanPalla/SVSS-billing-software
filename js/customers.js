// ==========================================
// SVSS Billing Software
// Customers Module
// Part 3 - Database + Load + Display
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    // ==============================
    // Elements
    // ==============================

    const customerTableBody =
        document.getElementById("customerTableBody");

    const saveCustomerBtn =
    document.getElementById("saveCustomer");

    const addCustomerModal =
    new bootstrap.Modal(
        document.getElementById("addCustomerModal")
    );

    // ==============================
    // Variables
    // ==============================

    let db = {};

    let bills = [];

    let customerData = [];

    let currentCustomer = null;

    let editIndex = -1;

    // ==============================
    // Database
    // ==============================

    async function refreshDatabase() {

    db = await window.api.getDatabase();

    db.bills = db.bills || [];

    db.customers = db.customers || [];

    bills = db.bills;

}

    async function saveDatabase() {

        db.bills = bills;

        await window.api.saveDatabase(db);

    }

    // ==============================
    // Load Customers
    // ==============================

    async function loadCustomers() {

        await refreshDatabase();

        const customers = {};

// --------------------------
// Manual Customers
// --------------------------

db.customers.forEach(customer => {

    const key =
        customer.name + "_" + customer.mobile;

    customers[key] = {

        name: customer.name,

        mobile: customer.mobile,

        address: customer.address || "-",

        gst: customer.gst || "",

        email: customer.email || "",

        notes: customer.notes || "",

        openingBalance:
            Number(customer.openingBalance) || 0,

        bills: [],

        totalPurchase: 0,

        totalPaid: 0,

        totalBalance:
            Number(customer.openingBalance) || 0

    };

});

        // --------------------------
        // Bills Available
        // --------------------------

        if (bills.length > 0) {

            bills.forEach(bill => {

                const name =
                    (bill.customer || "Walk-in Customer").trim();

                const mobile =
                    (bill.mobile || "-").trim();

                const key =
                    name + "_" + mobile;

                if (!customers[key]) {

    customers[key] = {

        name,

        mobile,

        address:
            bill.address || "-",

        gst: "",

        email: "",

        notes: "",

        openingBalance: 0,

        bills: [],

        totalPurchase: 0,

        totalPaid: 0,

        totalBalance: 0

    };

}

                const grandTotal =
                    Number(
                        String(bill.grandTotal)
                        .replace(/[^\d.]/g, "")
                    ) || 0;

                const paid =
                    Number(bill.amountPaid) || 0;

                const balance =
                    Number(bill.balanceDue) || 0;

                customers[key].bills.push(bill);

                customers[key].totalPurchase += grandTotal;

                customers[key].totalPaid += paid;

                customers[key].totalBalance += balance;

                customers[key].totalBalance +=Number(customers[key].openingBalance) || 0;

            });

        }

        // --------------------------
        // No Bills
        // --------------------------

        else {

    customerData = [];

}

        customerData = Object.values(customers);

        displayCustomers(customerData);

    }

    // ==============================
    // Display Customers
    // ==============================

    function displayCustomers(data) {

        if (data.length === 0) {

            customerTableBody.innerHTML = `

                <tr class="empty-row">

                    <td colspan="8">

                        No Customers Found

                    </td>

                </tr>

            `;

            return;

        }

        let html = "";

        data.forEach((customer, index) => {

            html += `

            <tr>

                <td>

                    ${customer.name}

                </td>

                <td>

                    ${customer.mobile}

                </td>

                <td>

                    ${customer.address}

                </td>

                <td>

                    ${customer.bills.length}

                </td>

                <td class="purchase">

                    ₹${customer.totalPurchase.toFixed(2)}

                </td>

                <td class="paid">

                    ₹${customer.totalPaid.toFixed(2)}

                </td>

                <td class="balance">

                    ₹${customer.totalBalance.toFixed(2)}

                </td>

                <td>

                  <button
                      class="btn btn-primary btn-sm viewCustomerBtn"
                      data-index="${index}">
              
                      <i class="bi bi-eye"></i>
              
                      View
              
                  </button>
              
                  <button
                      class="btn btn-warning btn-sm editCustomerBtn ms-1"
                      data-index="${index}">
              
                      <i class="bi bi-pencil-square"></i>
              
                      Edit
              
                  </button>
                  <button
                       class="btn btn-danger btn-sm deleteCustomerBtn ms-1"
                       data-index="${index}">
                   
                       <i class="bi bi-trash"></i>
                   
                       Delete

                   </button>

                </td>

            </tr>

            `;

        });

        customerTableBody.innerHTML = html;

    }

    // ==============================
    // Search Customers
    // ==============================

    searchCustomer.addEventListener("keyup", function () {

        const keyword =
            this.value
            .toLowerCase()
            .trim();

        const filtered =
            customerData.filter(customer =>

                customer.name
                    .toLowerCase()
                    .includes(keyword)

                ||

                customer.mobile
                    .toLowerCase()
                    .includes(keyword)

            );

        displayCustomers(filtered);

    });
   // ==========================================
// Save / Update Customer
// ==========================================

saveCustomerBtn.addEventListener("click", async function () {

    const name =
        document.getElementById("customerName").value.trim();

    const mobile =
        document.getElementById("customerMobile").value.trim();

    const address =
        document.getElementById("customerAddress").value.trim();

    const gst =
        document.getElementById("customerGST").value.trim();

    const email =
        document.getElementById("customerEmail").value.trim();

    const notes =
        document.getElementById("customerNotes").value.trim();

    const openingBalance =
        Number(
            document.getElementById("openingBalance").value
        ) || 0;

    if (!name) {

        showToast("Please enter Customer Name.","info");

        return;

    }

    if (!/^\d{10}$/.test(mobile)) {

        showToast("Customer already exists", "warning");

        return;

    }

    await refreshDatabase();

    // ======================================
    // UPDATE CUSTOMER
    // ======================================

    if (editIndex >= 0) {

        const oldCustomer = customerData[editIndex];

        const dbIndex = db.customers.findIndex(c =>
            c.mobile === oldCustomer.mobile
        );

        if (dbIndex === -1) {

            showToast("Customer not found.","info");

            return;

        }

        const duplicate = db.customers.find((c, i) =>
            c.mobile === mobile && i !== dbIndex
        );

        if (duplicate) {

            showToast("Mobile Number already exists.","error");

            return;

        }

        db.customers[dbIndex] = {

            ...db.customers[dbIndex],

            name,

            mobile,

            address,

            gst,

            email,

            notes,

            openingBalance

        };
        const oldName = oldCustomer.name;
const oldMobile = oldCustomer.mobile;

bills.forEach(bill => {

    if (
        (bill.customer || "").trim() === oldName &&
        (bill.mobile || "").trim() === oldMobile
    ) {

        bill.customer = name;
        bill.mobile = mobile;
        bill.address = address;

    }

});

        db.bills = bills;

       await window.api.saveDatabase(db);

        showToast("Customer Updated Successfully.","success");

    }

    // ======================================
    // ADD CUSTOMER
    // ======================================

    else {

        const duplicate =
            db.customers.find(c => c.mobile === mobile);

        if (duplicate) {

            showToast("Customer already exists", "warning");

            return;

        }

        db.customers.push({

            customerId:
                "CUS" + Date.now(),

            name,

            mobile,

            address,

            gst,

            email,

            notes,

            openingBalance,

            createdDate:
                new Date().toISOString()

        });

        db.bills = bills;

       await window.api.saveDatabase(db);

        showToast("Customer Added Successfully", "success");

    }

    // ======================================
    // RESET FORM
    // ======================================

    editIndex = -1;

    document.getElementById("customerName").value = "";
    document.getElementById("customerMobile").value = "";
    document.getElementById("customerAddress").value = "";
    document.getElementById("customerGST").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerNotes").value = "";
    document.getElementById("openingBalance").value = "0";

    document.getElementById("saveCustomer").innerHTML = `
        <i class="bi bi-check-circle-fill"></i>
        Save Customer
    `;

    addCustomerModal.hide();

    await loadCustomers();

});
    // ==========================================
    // View Customer
    // ==========================================

    const customerModal = new bootstrap.Modal(
        document.getElementById("customerModal")
    );

    const paymentModal = new bootstrap.Modal(
        document.getElementById("paymentModal")
    );

    document.addEventListener("click", function (e) {

        if (!e.target.closest(".viewCustomerBtn")) return;

        const index = e.target.closest(".viewCustomerBtn").dataset.index;

        currentCustomer = customerData[index];

        if (!currentCustomer) return;

        showCustomer(currentCustomer);

    });

    // ==========================================
    // Show Customer Details
    // ==========================================

    function showCustomer(customer) {

        document.getElementById("viewCustomerName").textContent =
            customer.name;

        document.getElementById("viewCustomerMobile").textContent =
            customer.mobile;

        document.getElementById("viewCustomerAddress").textContent =
            customer.address;

        document.getElementById("customerPurchase").textContent =
            "Rs. " + customer.totalPurchase.toFixed(2);

        document.getElementById("customerPaid").textContent =
            "Rs. " + customer.totalPaid.toFixed(2);

        document.getElementById("customerBalance").textContent =
            "Rs. " + customer.totalBalance.toFixed(2);

        loadBillHistory(customer);

        customerModal.show();

    }
    function formatDate(dateString) {

    if (!dateString) return "-";

    const parts = dateString.split("-");

    if (parts.length !== 3) return dateString;

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}
// ==========================================
// Edit Customer
// ==========================================

document.addEventListener("click", function (e) {

    const btn = e.target.closest(".editCustomerBtn");

    if (!btn) return;

    editIndex = Number(btn.dataset.index);

    const customer = customerData[editIndex];

    if (!customer) return;

    document.getElementById("customerName").value =
        customer.name;

    document.getElementById("customerMobile").value =
        customer.mobile;

    document.getElementById("customerAddress").value =
        customer.address;

    document.getElementById("customerGST").value =
        customer.gst || "";

    document.getElementById("customerEmail").value =
        customer.email || "";

    document.getElementById("openingBalance").value =
        customer.openingBalance || 0;

    document.getElementById("customerNotes").value =
        customer.notes || "";

    document.getElementById("saveCustomer").innerHTML = `
        <i class="bi bi-check-circle-fill"></i>
        Update Customer
    `;

    addCustomerModal.show();

});
     // ==========================================
    // Delete Customer
    // ==========================================
    
    document.addEventListener("click", async function (e) {
    
        const btn = e.target.closest(".deleteCustomerBtn");
    
        if (!btn) return;
    
        const index = Number(btn.dataset.index);
    
        const customer = customerData[index];
    
        if (!customer) return;
    
        // ===============================
        // Don't allow deletion if bills exist
        // ===============================
    
        if (customer.bills.length > 0) {
    
            showToast(
    `Cannot delete customer.
    
    This customer has ${customer.bills.length} bill(s).
    
    Please delete the bills first if you really want to remove this customer.`
            );
    
            return;
    
        }
    
        // ===============================
        // Confirmation
        // ===============================
    
        const ok = confirm(
            `Delete customer "${customer.name}" ?`
        );
    
        if (!ok) return;
    
        await refreshDatabase();
    
        const dbIndex = db.customers.findIndex(c =>
            c.mobile === customer.mobile
        );
    
        if (dbIndex === -1) {
    
            showToast("Customer not found.","info");
    
            return;
    
        }
    
        db.customers.splice(dbIndex, 1);
    
        await window.api.saveDatabase(db);
    
        showToast("Customer deleted successfully.","Success");
    
        await loadCustomers();
    
    });
    // ==========================================
    // Bill History
    // ==========================================

    function loadBillHistory(customer) {

        const tbody =
            document.getElementById("customerBills");

        tbody.innerHTML = "";

        if (customer.bills.length === 0) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="6" class="text-center text-muted">

                        No Bills Found

                    </td>

                </tr>

            `;

            return;

        }

        customer.bills.forEach(bill => {

            const row = document.createElement("tr");

            const total =
                Number(
                    String(bill.grandTotal)
                    .replace(/[^\d.]/g, "")
                ) || 0;

            const paid =
                Number(bill.amountPaid) || 0;

            const balance =
                Number(bill.balanceDue) || 0;

            let status = "Paid";

            if (balance > 0)
                status = "Pending";

            row.innerHTML = `

                <td>${bill.billNo || "-"}</td>

                <td>${formatDate(bill.date)}</td>

                <td>Rs.${total.toFixed(2)}</td>

                <td>Rs.${paid.toFixed(2)}</td>

                <td>Rs.${balance.toFixed(2)}</td>

                <td>

                    <span class="badge ${balance > 0 ? "bg-danger" : "bg-success"}">

                        ${status}

                    </span>

                </td>

            `;

            tbody.appendChild(row);

        });

    }

    // ==========================================
    // Receive Payment Button
    // ==========================================

    document
        .getElementById("receivePayment")
        .addEventListener("click", function () {

            if (!currentCustomer) return;

            document.getElementById("payCustomer").value =
                currentCustomer.name;

            document.getElementById("payBalance").value =
                "Rs. " + currentCustomer.totalBalance.toFixed(2);

            document.getElementById("payAmount").value = "";

            document.getElementById("payMode").value = "Cash";

            document.getElementById("payRemarks").value = "";

            customerModal.hide();

            setTimeout(() => {
            
                paymentModal.show();
            
            }, 200);

            paymentModal.show();

            showCustomer(currentCustomer);

        });

    // ==========================================
    // Print Statement Button
    // ==========================================

    document
        .getElementById("printStatement")
        .addEventListener("click", function () {

            if (!currentCustomer) return;

            printCustomerStatement(currentCustomer);

        });
    // ==========================================
// Save Payment (Fixed)
// ==========================================

document
    .getElementById("savePayment")
    .addEventListener("click", async function () {

        if (!currentCustomer) return;

        let amount =
            Number(document.getElementById("payAmount").value);

        if (isNaN(amount) || amount <= 0) {

            showToast("Enter a valid payment amount.","error");

            return;

        }

        await refreshDatabase();

        // Find all bills of this customer
        const customerBills = bills
            .filter(bill =>
                (bill.customer || "").trim() === currentCustomer.name &&
                (bill.mobile || "").trim() === currentCustomer.mobile
            )
            .sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );

        // Oldest pending bill first
        for (const bill of customerBills) {

            if (amount <= 0) break;

            let balance =
                Number(bill.balanceDue) || 0;

            if (balance <= 0) continue;

            const pay =
                Math.min(balance, amount);

            bill.amountPaid =
    (Number(bill.amountPaid) || 0) + pay;

    bill.balanceDue =
        Number((balance - pay).toFixed(2));
    
    // Update payment status
    bill.paymentStatus =
    bill.balanceDue <= 0
            ? "Paid"
            : "Pending";
    
    amount -= pay;

        }

        // Save database

        db.bills = bills;

        await window.api.saveDatabase(db);

        // Reload customer list
        await loadCustomers();

        // Get updated customer object
        const oldName = currentCustomer.name;
        const oldMobile = currentCustomer.mobile;

        currentCustomer =
        customerData.find(c =>
        c.name === oldName &&
        c.mobile === oldMobile
    );
        // Refresh modal immediately
        if (currentCustomer) {

            document.getElementById("viewCustomerName").textContent =
                currentCustomer.name;

            document.getElementById("viewCustomerMobile").textContent =
                currentCustomer.mobile;

            document.getElementById("viewCustomerAddress").textContent =
                currentCustomer.address;

            document.getElementById("customerPurchase").textContent =
                "Rs. " + currentCustomer.totalPurchase.toFixed(2);

            document.getElementById("customerPaid").textContent =
                "Rs. " + currentCustomer.totalPaid.toFixed(2);

            document.getElementById("customerBalance").textContent =
                "Rs. " + currentCustomer.totalBalance.toFixed(2);

            loadBillHistory(currentCustomer);

        }

        paymentModal.hide();

        showToast("Payment saved successfully.","success");

    });

    // ==========================================
    // Print Customer Statement
    // ==========================================

    function printCustomerStatement(customer) {

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Sri Venkata Siva Sai Cloth & Matchings", 14, 18);

        doc.setFontSize(12);
        doc.text("Customer Statement", 14, 28);

        doc.text("Customer : " + customer.name, 14, 40);
        doc.text("Mobile : " + customer.mobile, 14, 48);
        doc.text("Address : " + customer.address, 14, 56);

        doc.autoTable({

            startY: 65,

            head: [[
                "Bill No",
                "Date",
                "Grand Total",
                "Paid",
                "Balance"
            ]],

            body: customer.bills.map(bill => [

                bill.billNo || "-",

                formatDate(bill.date),

                "Rs. " + (
                    Number(
                        String(bill.grandTotal)
                            .replace(/[^\d.]/g, "")
                    ) || 0
                ).toFixed(2),

                "Rs. " + (
                    Number(bill.amountPaid) || 0
                ).toFixed(2),

                "Rs. " + (
                    Number(bill.balanceDue) || 0
                ).toFixed(2)

            ])

        });

        let y = doc.lastAutoTable.finalY + 15;

        doc.text(
    "Total Purchase : Rs. " +
    customer.totalPurchase.toFixed(2),
    14,
    y
    );
    
    y += 8;
    
    doc.text(
        "Total Paid : Rs. " +
        customer.totalPaid.toFixed(2),
        14,
        y
    );
    
    y += 8;
    
    doc.text(
        "Balance Due : Rs. " +
        customer.totalBalance.toFixed(2),
        14,
        y
    );
    
            doc.save(customer.name + "_Statement.pdf");

    }

    // ==========================================
    // Initial Load
    // ==========================================
    // ======================================
// Keyboard Shortcuts - Customers
// ======================================

// Ctrl + N → Add Customer
document.addEventListener("svss:new", () => {

    editIndex = -1;

    document.getElementById("customerName").value = "";
    document.getElementById("customerMobile").value = "";
    document.getElementById("customerAddress").value = "";
    document.getElementById("customerGST").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerNotes").value = "";
    document.getElementById("openingBalance").value = "0";

    document.getElementById("saveCustomer").innerHTML = `
        <i class="bi bi-check-circle-fill"></i>
        Save Customer
    `;

    addCustomerModal.show();

});

// Ctrl + F → Focus Search
document.addEventListener("svss:search", () => {

    const search = document.getElementById("searchCustomer");

    if (search) {

        search.focus();
        search.select();

    }

});

// Escape → Close Open Modal
document.addEventListener("svss:escape", () => {

    const addModal =
        bootstrap.Modal.getInstance(
            document.getElementById("addCustomerModal")
        );

    if (addModal) {

        addModal.hide();

    }

    const viewModal =
        bootstrap.Modal.getInstance(
            document.getElementById("customerModal")
        );

    if (viewModal) {

        viewModal.hide();

    }

    const paymentModalInstance =
        bootstrap.Modal.getInstance(
            document.getElementById("paymentModal")
        );

    if (paymentModalInstance) {

        paymentModalInstance.hide();

    }

    });

    
    await applyTheme();
    
    await loadCustomers();
    

});