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

    const searchCustomer =
    document.getElementById("searchCustomer");

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

db.customers.forEach((customer, dbIndex) => {
    

    const mobile =
    (customer.mobile || "")
    .trim();
    
    const key =
    customer.name.trim() + "_" + mobile;

    customers[key] = {

        customerId:customer.customerId,

        dbIndex: dbIndex,

        name: customer.name,

        mobile: customer.mobile,
   
        address: customer.address || "-",

        gst: customer.gst || "",

        email: customer.email || "",

        notes: customer.notes || "",

        openingBalance:
            Number(customer.openingBalance) || 0,

        paymentHistory:
           Array.isArray(customer.paymentHistory)
               ? customer.paymentHistory
               : [],    

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
                    bill.mobile === "-"
                    ? ""
                    : (bill.mobile || "").trim();

                let key = name + "_" + mobile;

// Try to find existing customer with same name
const existingKey = Object.keys(customers).find(k =>

    customers[k].customerId &&
    bill.customerId &&
    customers[k].customerId === bill.customerId

);

if (existingKey) {

    key = existingKey;

    // Update mobile if it was previously empty
    if (!customers[key].mobile && mobile) {
        customers[key].mobile = mobile;
    }

} else {

    customers[key] = {

    customerId:
        "AUTO_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2,8),

        dbIndex: -1,

        name,

        mobile,

        address: bill.address || "-",

        gst: bill.gst || "",

        email: "",

        notes: "",

        openingBalance: 0,

        paymentHistory: [],

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


            });
            Object.values(customers).forEach(customer => {

    customer.totalBalance +=
        Number(customer.openingBalance) || 0;

    });

        }

        // --------------------------
        // No Bills
        // --------------------------



        customerData = Object.values(customers);
        customerData.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "",
        undefined,
        {
            sensitivity: "base"
        }
    )
);

        displayCustomers(customerData);

    }

    // ==============================
    // Display Customers
    // ==============================

    function displayCustomers(data) {

        if (data.length === 0) {

            customerTableBody.innerHTML = `

                <tr class="empty-row">

                    <td colspan="9">

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
                <td class="text-center fw-bold">
                 ${index + 1}
                </td>

                <td>

                    ${customer.name}

                </td>

                <td>

                    ${customer.mobile || customer.gst || "-"}


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
                      data-id="${customer.customerId}"
                      title="view">
                  
                      <i class="bi bi-eye-fill"></i>
                  
                      View
                  
                  </button>
              
                  <button
                    class="btn btn-warning btn-sm editCustomerBtn ms-1"
                    data-id="${customer.customerId}"
                    title="Edit">
              
                      <i class="bi bi-pencil-square"></i>
              
                      Edit
              
                  </button>
                  
                       <button
                          class="btn btn-danger btn-sm deleteCustomerBtn ms-1"
                          data-id="${customer.customerId}"
                          title="Delete">
                   
                       <i class="bi bi-trash-fill"></i>
                   
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

    const filtered = customerData.filter(customer =>

        (customer.name || "")
            .toLowerCase()
            .includes(keyword)

        ||

        (customer.mobile || "")
            .toLowerCase()
            .includes(keyword)

        ||

        (customer.gst || "")
            .toLowerCase()
            .includes(keyword)

        ||

        (customer.address || "")
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

    // Mobile validation
    // Mobile validation (Optional)
    let contact = mobile.trim();

if (contact === "-") {
    contact = "";
}

if (contact !== "") {

    const isMobile = /^\d{10}$/.test(contact);

    const isGST =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/
        .test(contact.toUpperCase());

    if (!isMobile && !isGST) {

        showToast(
            "Please enter a valid Mobile Number or GST Number.",
            "warning"
        );

        return;

    }

}

    await refreshDatabase();

    // ======================================
    // UPDATE CUSTOMER
    // ======================================
    if (editIndex >= 0) {

        const oldCustomer = customerData[editIndex];

        const dbIndex = oldCustomer.dbIndex;

        if (dbIndex === undefined || dbIndex === -1) {

    showToast(
        "This customer exists only in Bill History.\nPlease create a customer record first.",
        "info"
    );

    return;

    }
    const duplicate = db.customers.find((c,i)=>

    i !== dbIndex &&

    mobile &&

    (c.mobile || "").trim() === mobile.trim()

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
           
               (
                   (bill.mobile || "").trim() === oldMobile ||
           
                   !oldMobile ||
           
                   oldMobile === "-"
               )
           
           ) {
           
               bill.customer = name;
               bill.mobile = mobile;
               bill.address = address;
           
           }
    
    });
    
            db.bills = bills;
    
    await window.api.saveDatabase(db);
    
    // ==========================================
    // CLOUD SYNC — CUSTOMERS
    // ==========================================
    
    try {
    
        await window.api.saveCustomers(db.customers);
    
        console.log(
            "SVSS Cloud: Customers synchronized successfully."
        );
    
    } catch (cloudError) {
    
        console.warn(
            "SVSS Cloud: Customer synchronization failed."
        );
    
        console.warn(cloudError);
    
    }
    
    showToast("Customer Updated Successfully.","success");

    }

    // ======================================
    // ADD CUSTOMER
    // ======================================

    else {

        let duplicate = null;
    
    if (mobile !== "" && mobile !== "-") {
    
        duplicate =
db.customers.find(c=>{

const sameMobile=

mobile &&
(c.mobile||"").trim()==mobile.trim();

const sameName=

!mobile &&
(c.name||"").trim().toLowerCase()==
name.trim().toLowerCase();

return sameMobile||sameName;

});
    
    }
    
    if (duplicate) {
    
        showToast("Customer already exists", "warning");
    
        return;
    
    }

        if (duplicate) {

            showToast("Customer already exists", "warning");

            return;

        }

        db.customers.push({

    customerId:
        "CUS_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2,8),

    name,
    mobile,
    address,
    gst,
    email,
    notes,
    openingBalance,

    createdDate: new Date().toISOString()

});
db.bills = bills;

await saveDatabase();

// ==========================================
// CLOUD SYNC — CUSTOMERS
// ==========================================

try {

    await window.api.saveCustomers(db.customers);

    console.log(
        "SVSS Cloud: Customers synchronized successfully."
    );

} catch (cloudError) {

    console.warn(
        "SVSS Cloud: Customer synchronization failed."
    );

    console.warn(cloudError);

}

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

    const btn = e.target.closest(".viewCustomerBtn");

    if (!btn) return;
    
    const customerId = btn.dataset.id;

const customer = customerData.find(c =>
    String(c.customerId) === String(customerId)
);

if (!customer) return;

currentCustomer = customer;

showCustomer(customer);
   });

    // ==========================================
    // Show Customer Details
    // ==========================================

    function showCustomer(customer) {

        document.getElementById("viewCustomerName").textContent =
            customer.name;

       document.getElementById("viewCustomerMobile").textContent =
            customer.mobile || customer.gst || "-";

        document.getElementById("viewCustomerAddress").textContent =
            customer.address;

        document.getElementById("customerPurchase").textContent =
            "Rs. " + customer.totalPurchase.toFixed(2);

        document.getElementById("customerPaid").textContent =
            "Rs. " + customer.totalPaid.toFixed(2);

        document.getElementById("customerBalance").textContent =
            "Rs. " + customer.totalBalance.toFixed(2);

        loadBillHistory(customer);

        loadPaymentHistory(customer);
        
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

    const customerId = btn.dataset.id;

const customer = customerData.find(c =>
    String(c.customerId) === String(customerId)
);
    
    if (!customer) return;
    
    editIndex = customerData.indexOf(customer);
    currentCustomer = customer;

    console.log(customer);

    if (!customer) return;


    document.getElementById("customerName").value =
        customer.name;

    document.getElementById("customerMobile").value =
    customer.mobile || customer.gst || "";

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

    const customerId = btn.dataset.id;

    const customer = customerData.find(c =>
        String(c.customerId) === String(customerId)
    );

    if (!customer) {

        const dbIndex = db.customers.findIndex(c =>
    String(c.customerId) === String(customerId)
);

if (dbIndex === -1) {

    showToast("Customer not found.", "error");

    return;
}

        return;

    }

    // Don't allow delete if bills exist

    if (customer.bills && customer.bills.length > 0) {

        showToast(
            `Cannot delete customer.\n\nThis customer has ${customer.bills.length} bill(s).`
        );

        return;

    }

    // ==========================================
// CUSTOM DELETE CONFIRMATION MODAL
// ==========================================

const deleteModalElement =
    document.getElementById("deleteCustomerModal");

const deleteCustomerModal =
    new bootstrap.Modal(deleteModalElement);

const deleteCustomerName =
    document.getElementById("deleteCustomerName");

const deleteCustomerMobile =
    document.getElementById("deleteCustomerMobile");

const confirmDeleteCustomer =
    document.getElementById("confirmDeleteCustomer");


// Show customer information

deleteCustomerName.textContent =
    customer.name;

deleteCustomerMobile.textContent =
    customer.mobile || customer.gst || "-";


// Show modal

deleteCustomerModal.show();


// Wait for Delete button

const deleteHandler = async function () {

    // Remove this listener after one click
    confirmDeleteCustomer.removeEventListener(
        "click",
        deleteHandler
    );

    // Close modal
    deleteCustomerModal.hide();

    // Continue with existing delete code

    await refreshDatabase();

    const dbIndex =
        db.customers.findIndex(c =>
            String(c.customerId) ===
            String(customerId)
        );

    console.log("Button ID :", customerId);

    console.log("DB Index :", dbIndex);

    console.log(
        "DB Customer :",
        db.customers[dbIndex]
    );


    if (dbIndex === -1) {

        showToast(
            "Customer not found.",
            "error"
        );
   
           return;
       }
   
   
       // Delete customer
   
       // Delete customer

db.customers.splice(dbIndex, 1);

await window.api.saveDatabase(db);

// ==========================================
// CLOUD SYNC — CUSTOMERS
// ==========================================

try {

    await window.api.saveCustomers(db.customers);

    console.log(
        "SVSS Cloud: Customers synchronized successfully."
    );

} catch (cloudError) {

    console.warn(
        "SVSS Cloud: Customer synchronization failed."
    );

    console.warn(cloudError);

}

// ==========================================
// SUCCESS MESSAGE
// ==========================================

showToast(
    "Customer deleted successfully.",
    "success"
);
   
   
       // Reload customer list
   
       await loadCustomers();
   
   };
   
   
   // Attach Delete button
   
   confirmDeleteCustomer.addEventListener(
       "click",
       deleteHandler
   );
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

            <td>
                <strong>${bill.billNo || "-"}</strong><br>
            
                <small class="text-primary fw-semibold">
                    Book : ${bill.billBookNo || "-"}
                </small>
            </td>

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
// PAYMENT HISTORY
// ==========================================

function loadPaymentHistory(customer) {

    const tbody =
        document.getElementById(
            "paymentHistoryBody"
        );

    const countBadge =
        document.getElementById(
            "paymentHistoryCount"
        );


    if (!tbody)
        return;


    tbody.innerHTML = "";


    // ==========================================
    // GET PAYMENT HISTORY
    // ==========================================

    const payments =
        Array.isArray(customer.paymentHistory)
            ? [...customer.paymentHistory]
            : [];


    // Latest payment first

    payments.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );


    // ==========================================
    // UPDATE COUNT
    // ==========================================

    if (countBadge) {

        countBadge.textContent =
            `${payments.length} ${
                payments.length === 1
                    ? "Payment"
                    : "Payments"
            }`;

    }


    // ==========================================
    // NO PAYMENTS
    // ==========================================

    if (payments.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center text-muted py-3">

                    <i class="bi bi-cash-stack"></i>

                    No Payments Found

                </td>

            </tr>

        `;

        return;

    }


    // ==========================================
    // DISPLAY PAYMENTS
    // ==========================================

    payments.forEach(
        (payment, index) => {

            const row =
                document.createElement("tr");


            const amount =
                Number(payment.amount) || 0;


            const totalPaid =
                Number(payment.totalPaid) || 0;


            // Calculate balance at this payment

            const balanceAtPayment =
                Math.max(
                    0,
                    (
                        Number(customer.totalPurchase) +
                        Number(customer.openingBalance || 0) -
                        totalPaid
                    )
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>
                    ${formatDate(payment.date)}
                </td>


                <td class="payment-amount">
                    Rs.${amount.toFixed(2)}
                </td>


                <td>
                    Rs.${totalPaid.toFixed(2)}
                </td>


                <td class="payment-balance">
                    Rs.${balanceAtPayment.toFixed(2)}
                </td>


                <td>

                    <span class="badge bg-secondary">

                        ${
                            payment.paymentMode ||
                            "Cash"
                        }

                    </span>

                </td>


                <td>

                    ${
                        payment.remarks
                            ? payment.remarks
                            : "-"
                    }

                </td>

            `;


            tbody.appendChild(row);

        }
    );

}
// ==========================================
// RECEIVE PAYMENT BUTTON
// ==========================================

document
    .getElementById("receivePayment")
    .addEventListener("click", function () {

        if (!currentCustomer) {
            showToast("Customer not selected.", "warning");
            return;
        }

        // Fill customer name
        document.getElementById("payCustomer").value =
            currentCustomer.name || "";

        // Fill current balance
        document.getElementById("payBalance").value =
            "Rs. " +
            Number(currentCustomer.totalBalance || 0).toFixed(2);

        // Clear old values
        document.getElementById("payAmount").value = "";

        document.getElementById("payMode").value =
            "Cash";

        document.getElementById("payRemarks").value =
            "";

        // Get existing modal instances
        const customerModalElement =
            document.getElementById("customerModal");

        const paymentModalElement =
            document.getElementById("paymentModal");

        const customerModalInstance =
            bootstrap.Modal.getOrCreateInstance(
                customerModalElement
            );

        const paymentModalInstance =
            bootstrap.Modal.getOrCreateInstance(
                paymentModalElement
            );

        // Close customer details
        customerModalInstance.hide();

        // Wait until customer modal is closed
        setTimeout(function () {

            paymentModalInstance.show();

        }, 350);

    });

// ==========================================
// PRINT CUSTOMER STATEMENT BUTTON
// ==========================================

document
    .getElementById("printStatement")
    .addEventListener("click", async function () {

        if (!currentCustomer) {

            showToast(
                "Please select a customer first.",
                "warning"
            );

            return;

        }

        // Check jsPDF
        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            showToast(
                "PDF library is not loaded.",
                "error"
            );

            console.error(
                "jsPDF library is missing."
            );

            return;

        }

        try {

            this.disabled = true;

            this.innerHTML = `
                <span
                    class="spinner-border spinner-border-sm me-1">
                </span>
                Generating...
            `;

            await printCustomerStatement(
                currentCustomer
            );

        } catch (error) {

            console.error(
                "Print Statement Error:",
                error
            );

            showToast(
                "Failed to generate statement.",
                "error"
            );

        } finally {

            this.disabled = false;

            this.innerHTML = `
                <i class="bi bi-printer"></i>
                Print Statement
            `;

        }

    });
// ==========================================
// SAVE PAYMENT + PAYMENT HISTORY
// ==========================================

document
    .getElementById("savePayment")
    .addEventListener("click", async function () {

        if (!currentCustomer) return;

        const paymentInput =
            document.getElementById("payAmount");

        const paymentMode =
            document.getElementById("payMode").value || "Cash";

        const remarks =
            document.getElementById("payRemarks").value.trim();

        const requestedAmount =
            Number(paymentInput.value);

        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            isNaN(requestedAmount) ||
            requestedAmount <= 0
        ) {

            showToast(
                "Enter a valid payment amount.",
                "error"
            );

            return;
        }


        // ==========================================
        // REFRESH DATABASE
        // ==========================================

        await refreshDatabase();


        // ==========================================
        // CHECK CUSTOMER BALANCE
        // ==========================================

        const latestCustomer =
            customerData.find(c =>
                String(c.customerId) ===
                String(currentCustomer.customerId)
            ) || currentCustomer;


        const currentBalance =
            Number(latestCustomer.totalBalance) || 0;


        if (requestedAmount > currentBalance) {

            showToast(
                `Payment cannot be greater than balance due.\n\nBalance Due: Rs.${currentBalance.toFixed(2)}`,
                "error"
            );

            return;
        }


        // ==========================================
        // PAYMENT AMOUNT TO PROCESS
        // ==========================================

        let remainingAmount =
            requestedAmount;


        // ==========================================
        // FIND CUSTOMER BILLS
        // ==========================================

        const customerBills =
            bills
                .filter(bill =>
                    (bill.customer || "").trim() ===
                        currentCustomer.name.trim() &&

                    (bill.mobile || "").trim() ===
                        (currentCustomer.mobile || "").trim()
                )
                .sort((a, b) =>
                    new Date(a.date) -
                    new Date(b.date)
                );


        // ==========================================
        // APPLY PAYMENT TO OLDEST BILLS FIRST
        // ==========================================

        for (const bill of customerBills) {

            if (remainingAmount <= 0)
                break;


            let balance =
                Number(bill.balanceDue) || 0;


            if (balance <= 0)
                continue;


            const paymentForBill =
                Math.min(
                    balance,
                    remainingAmount
                );


            bill.amountPaid =
                Number(bill.amountPaid || 0) +
                paymentForBill;


            bill.balanceDue =
                Number(
                    (
                        balance -
                        paymentForBill
                    ).toFixed(2)
                );


            bill.paymentStatus =
                bill.balanceDue <= 0
                    ? "Paid"
                    : "Pending";


            remainingAmount =
                Number(
                    (
                        remainingAmount -
                        paymentForBill
                    ).toFixed(2)
                );

        }


        // ==========================================
        // APPLY REMAINING PAYMENT TO OPENING BALANCE
        // ==========================================

        if (remainingAmount > 0) {

            const dbCustomer = db.customers.find(c => String(c.customerId) === String(currentCustomer.customerId)) || db.customers.find(c => String(c.name).trim() === String(currentCustomer.name).trim() && String(c.mobile || "").trim() === String(currentCustomer.mobile || "").trim());


            if (dbCustomer) {

                const openingBalance =
                    Number(
                        dbCustomer.openingBalance
                    ) || 0;


                const openingPayment =
                    Math.min(
                        openingBalance,
                        remainingAmount
                    );


                dbCustomer.openingBalance =
                    Number(
                        (
                            openingBalance -
                            openingPayment
                        ).toFixed(2)
                    );


                remainingAmount =
                    Number(
                        (
                            remainingAmount -
                            openingPayment
                        ).toFixed(2)
                    );

            }

        }


        // ==========================================
        // PAYMENT HISTORY
        // ==========================================

        const dbCustomer = db.customers.find(c => String(c.customerId) === String(currentCustomer.customerId)) || db.customers.find(c => String(c.name).trim() === String(currentCustomer.name).trim() && String(c.mobile || "") .trim() === String(currentCustomer.mobile || "").trim());


        if (dbCustomer) {

            // Create payment history if it doesn't exist

            if (!Array.isArray(dbCustomer.paymentHistory)) {

                dbCustomer.paymentHistory = [];

            }


            // Get current total paid from existing history

            const previousPaid =
                dbCustomer.paymentHistory.reduce(
                    (sum, payment) =>
                        sum +
                        (Number(payment.amount) || 0),
                    0
                );


            const newTotalPaid =
                Number(
                    (
                        previousPaid +
                        requestedAmount
                    ).toFixed(2)
                );


            // ==========================================
            // CREATE PAYMENT RECORD
            // ==========================================

            const paymentRecord = {

                paymentId:
                    "PAY-" +
                    Date.now(),

                date:
                    new Date()
                        .toISOString()
                        .split("T")[0],

                amount:
                    Number(
                        requestedAmount.toFixed(2)
                    ),

                totalPaid:
                    newTotalPaid,

                paymentMode:
                    paymentMode,

                remarks:
                    remarks

            };


            dbCustomer.paymentHistory.push(
                paymentRecord
            );

        }


        // ==========================================
        // SAVE DATABASE
        // ==========================================

        db.bills = bills;


        await window.api.saveDatabase(db);


        // ==========================================
        // CLOUD SYNC - CUSTOMER REPAYMENT
        // ==========================================
        if (window.api.isBrowser) {
            await window.api.saveCustomers(db.customers);
            await window.api.saveBills(db.bills);
        }


        // ==========================================
        // RELOAD CUSTOMERS
        // ==========================================

        await loadCustomers();


        // ==========================================
        // GET UPDATED CUSTOMER
        // ==========================================

        currentCustomer =
            customerData.find(c =>

                String(c.name).trim() ===
                    String(currentCustomer.name).trim() &&

                String(c.mobile || "").trim() ===
                    String(currentCustomer.mobile || "").trim()

            );


        // ==========================================
        // REFRESH CUSTOMER MODAL
        // ==========================================

        if (currentCustomer) {

            document.getElementById(
                "viewCustomerName"
            ).textContent =
                currentCustomer.name;


            document.getElementById(
                "viewCustomerMobile"
            ).textContent =
                currentCustomer.mobile || "-";


            document.getElementById(
                "viewCustomerAddress"
            ).textContent =
                currentCustomer.address || "-";


            document.getElementById(
                "customerPurchase"
            ).textContent =
                "Rs. " +
                currentCustomer.totalPurchase.toFixed(2);


            document.getElementById(
                "customerPaid"
            ).textContent =
                "Rs. " +
                currentCustomer.totalPaid.toFixed(2);


            document.getElementById(
                "customerBalance"
            ).textContent =
                "Rs. " +
                currentCustomer.totalBalance.toFixed(2);


            loadBillHistory(
                currentCustomer
            );


            // Load payment history

            loadPaymentHistory(
                currentCustomer
            );

        }


        // ==========================================
        // CLOSE PAYMENT MODAL
        // ==========================================

        paymentModal.hide();


        // ==========================================
        // SUCCESS MESSAGE
        // ==========================================

        showToast(
            "Payment saved successfully.",
            "success"
        );

    });
    // ==========================================
    // Print Customer Statement
    // ==========================================

    async function printCustomerStatement(customer) {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();
    await refreshDatabase();

    const settings = db.settings || {};
    
    const shopName = settings.shopName || "Sri Venkata Siva Sai Cloth & Matching Center";
    
    const shopAddress = settings.shopAddress || "";
    
    const shopMobile = settings.shopMobile || "";
    
    const shopGST = settings.shopGST || "";

    const pageWidth =
        doc.internal.pageSize.getWidth();

    const pageHeight =
        doc.internal.pageSize.getHeight();

    // ======================================
    // PAGE BORDER
    // ======================================

    function drawPageBorder() {

        doc.setDrawColor(255,193,7);

        doc.setLineWidth(1.2);

        doc.rect(
            5,
            5,
            pageWidth-10,
            pageHeight-10
        );

        doc.setLineWidth(0.4);

        doc.rect(
            8,
            8,
            pageWidth-16,
            pageHeight-16
        );

    }

    drawPageBorder();

    // ======================================
    // LOGO
    // ======================================

    try{

        const logo =
            document.getElementById("shopLogo");

        if(
            logo &&
            logo.complete &&
            logo.naturalWidth>0
        ){

            doc.addImage(
                logo,
                "PNG",
                12,
                10,
                24,
                24
            );

        }

    }catch(e){}

    // ======================================
    // SHOP DETAILS
    // ======================================
    
    doc.setFont("helvetica","bold");
    doc.setFontSize(20);
    
    doc.text(
        shopName,
        pageWidth / 2 + 8,
        18,
        { align: "center" }
    );
    
    doc.setFont("helvetica","normal");
    doc.setFontSize(11);
    
    doc.text(
        shopAddress,
        pageWidth / 2,
        25,
        { align: "center" }
    );
    
    doc.text(
        "Phone : " + shopMobile + "   |   GSTIN : " + shopGST,
        pageWidth / 2,
        32,
        { align: "center" }
    );

   

    // ======================================
    // HEADER LINE
    // ======================================

    doc.setDrawColor(255,193,7);

    doc.setLineWidth(0.4);

    doc.line(

        12,

        38,

        pageWidth-12,

        38

    );

    // ======================================
    // TITLE
    // ======================================

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.setFontSize(16);

    doc.text(

        "CUSTOMER STATEMENT",

        pageWidth/2,

        47,

        {align:"center"}

    );
    doc.setDrawColor(255,193,7);

   doc.line(20,47,pageWidth/2-35,47);
   doc.line(pageWidth/2+35,47,pageWidth-20,47);

    // ======================================
    // CUSTOMER BOX
    // ======================================

    const detailsY = 54;

    const customerBoxHeight = 34;

    doc.roundedRect(
    12,
    detailsY,
    pageWidth - 24,
    customerBoxHeight,
    3,
    3
);

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.setFontSize(10);

    // Left Side

    doc.text(

        "Customer",

        16,

        detailsY+9

    );

    doc.text(

        ":",

        34,

        detailsY+8

    );

    doc.setFont(

        "helvetica",

        "normal"

    );

    doc.text(

        customer.name,

        38,

        detailsY+8

    );

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.text(

        "Mobile",

        16,

        detailsY+19

    );

    doc.text(

        ":",

        34,

        detailsY+19

    );

    doc.setFont(

        "helvetica",

        "normal"

    );

    doc.text(

        customer.mobile,

        38,

        detailsY+19

    );

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.text(

        "Address",

        16,

        detailsY+29

    );

    doc.text(

        ":",

        34,

        detailsY+29

    );

    doc.setFont(

        "helvetica",

        "normal"

    );

    const addressLines =
        doc.splitTextToSize(
            customer.address || "-",
            70
        );

    doc.text(

        addressLines,

        38,

        detailsY+29

    );

    // Right Side

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.text(

        "Statement Date",

        120,

        detailsY+8

    );

    doc.text(

        ":",

        151,

        detailsY+8

    );

    doc.setFont(

        "helvetica",

        "normal"

    );

    doc.text(

        new Date().toLocaleDateString("en-GB"),

        155,

        detailsY+8

    );

    doc.setFont(

        "helvetica",

        "bold"

    );

    doc.text(

        "Generated",

        120,

        detailsY+19

    );

    doc.text(

        ":",

        151,

        detailsY+19

    );

    doc.setFont(

        "helvetica",

        "normal"

    );

    doc.text(

        new Date().toLocaleTimeString(),

        155,

        detailsY+19

    );

// ======================================
// STATEMENT TABLE
// ======================================

const rows = customer.bills.map((bill,index)=>{

    const total =
        Number(
            String(bill.grandTotal)
            .replace(/[^\d.]/g,"")
        ) || 0;

    const paid =
        Number(bill.amountPaid) || 0;

    const balance =
        Number(bill.balanceDue) || 0;

    return [

        index + 1,

        bill.billNo || "-",

        bill.billBookNo || "-",

        formatDate(bill.date),

        total.toFixed(2),

        paid.toFixed(2),

        balance.toFixed(2),

        balance > 0
            ? "Pending"
            : "Paid"

    ];

});

const tableY =
detailsY +
customerBoxHeight +
8;

doc.autoTable({

    startY: tableY,

    head:[[
        "Sl",
        "Bill No",
        "Book No",
        "Date",
        "Grand Total",
        "Paid",
        "Balance",
        "Status"
    ]],
    margin: {
    left: 16,
    right: 16
   },

    body: rows,

    theme:"grid",

    styles:{

        fontSize:10,

        halign:"center",

        valign:"middle",

        lineColor:[255,193,7],

        lineWidth:0.2

    },

    headStyles:{

        fillColor:[255,193,7],

        textColor:[0,0,0],

        fontStyle:"bold",

        minCellHeight:10

    },

    bodyStyles:{

        textColor:[40,40,40],

        minCellHeight:10,

    },

    alternateRowStyles:{

        fillColor:[252,252,252]

    },

    columnStyles: {

    // Sl
    0: { cellWidth: 10 },

    // Bill No
    1: { cellWidth: 36 },

    // Book No
    2: { cellWidth: 19 },

    // Date
    3: { cellWidth: 24},

    // Grand Total
    4: { cellWidth: 25 },

    // Paid
    5: { cellWidth: 24 },

    // Balance
    6: { cellWidth: 22 },

    // Status
    7: { cellWidth: 22 }

},

    didParseCell:function(data){

        if(
            data.section==="body" &&
            data.column.index===7
        ){

            if(data.cell.raw==="Paid"){

                data.cell.styles.textColor=[0,140,0];

                data.cell.styles.fontStyle="bold";

            }

            else{

                data.cell.styles.textColor=[220,53,69];

                data.cell.styles.fontStyle="bold";

            }

        }

    }

});

// ======================================
// PAYMENT HISTORY
// ======================================

// Collect all payment history entries for this customer
const paymentHistory = Array.isArray(customer.paymentHistory)
    ? customer.paymentHistory
    : [];

let y = doc.lastAutoTable.finalY + 12;


// ======================================
// SHOW PAYMENT HISTORY ONLY IF AVAILABLE
// ======================================

if (paymentHistory.length > 0) {

    // Check whether enough space is available
    if (y + 45 > pageHeight - 20) {

        doc.addPage();

        drawPageBorder();

        y = 20;
    }


    // ======================================
    // PAYMENT HISTORY HEADING
    // ======================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    doc.text(
        "PAYMENT HISTORY",
        14,
        y
    );

    y += 5;


    // ======================================
    // PREPARE PAYMENT ROWS
    // ======================================

    const paymentRows = paymentHistory.map((payment, index) => {

        const amount =
            Number(
                payment.amount ??
                payment.payment ??
                0
            );


        const totalPaid =
            Number(
                payment.totalPaid ??
                payment.runningTotal ??
                0
            );


        const balanceDue =
            Number(
                payment.balanceDue ??
                payment.balance ??
                0
            );


        const paymentMode =
            payment.paymentMode ||
            payment.mode ||
            "-";


        const remarks =
            payment.remarks ||
            "-";


        let paymentDate =
            payment.date ||
            payment.paymentDate ||
            "";


        // ======================================
        // FORMAT DATE
        // ======================================

        if (paymentDate) {

            const dateObject = new Date(paymentDate);

            if (!isNaN(dateObject.getTime())) {

                paymentDate =
                    String(dateObject.getDate()).padStart(2, "0") +
                    "-" +
                    String(dateObject.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    dateObject.getFullYear();

            }

        }


        return [

            index + 1,

            paymentDate || "-",

            amount.toFixed(2),

            totalPaid.toFixed(2),

            balanceDue.toFixed(2),

            paymentMode,

            remarks

        ];

    });


    // ======================================
    // PAYMENT HISTORY TABLE
    // ======================================

    doc.autoTable({

        startY: y,

        head: [[
            "S.No",
            "Date",
            "Payment",
            "Total Paid",
            "Balance Due",
            "Payment Mode",
            "Remarks"
        ]],

        body: paymentRows,

        margin: {
            left: 14,
            right: 14
        },

        theme: "grid",

        styles: {

            font: "helvetica",

            fontSize: 8,

            textColor: [40, 40, 40],

            cellPadding: 2.5,

            valign: "middle"

        },

        headStyles: {

            fillColor: [54, 105, 230],

            textColor: [255, 255, 255],

            fontStyle: "bold",

            halign: "center"

        },

        bodyStyles: {

            minCellHeight: 8

        },

        alternateRowStyles: {

            fillColor: [248, 248, 248]

        },

        columnStyles: {

            0: {
                cellWidth: 12,
                halign: "center"
            },

            1: {
                cellWidth: 25,
                halign: "center"
            },

            2: {
                cellWidth: 27,
                halign: "right"
            },

            3: {
                cellWidth: 27,
                halign: "right"
            },

            4: {
                cellWidth: 28,
                halign: "right"
            },

            5: {
                cellWidth: 27,
                halign: "center"
            },

            6: {
                cellWidth: 36
            }

        },

        didDrawPage: function () {

            drawPageBorder();

        }

    });


    // Move next section below payment table
    y = doc.lastAutoTable.finalY + 12;

}


// ======================================
// ACCOUNT SUMMARY
// ======================================

// Check page space
const requiredHeight = 65;

if (y + requiredHeight > pageHeight - 15) {

    doc.addPage();

    drawPageBorder();

    y = 20;

}

const summaryX = 110;
const summaryW = 82;

let sy = y + 6;

function summaryRow(label, value, bold = false) {

    if (bold) {

        doc.setFillColor(255,248,225);

        doc.rect(summaryX, sy - 5, summaryW, 9, "F");

    }

    doc.setFont("helvetica", "bold");

    doc.setFontSize(10);

    doc.text(label, summaryX + 2, sy);

    doc.text(":", summaryX + 40, sy);

    doc.setFont(
        "helvetica",
        bold ? "bold" : "normal"
    );

    doc.text(

        "Rs. " + value,

        summaryX + summaryW - 2,

        sy,

        { align: "right" }

    );

    sy += 10;

}

// Summary Heading

doc.setFont("helvetica","bold");

doc.setFontSize(12);

doc.text(

    "ACCOUNT SUMMARY",

    summaryX,

    y

);

sy += 2;

// Rows

summaryRow(

    "Total Purchase",

    customer.totalPurchase.toFixed(2)

);

summaryRow(

    "Total Paid",

    customer.totalPaid.toFixed(2)

);

// Gold Divider

doc.setDrawColor(255,193,7);

doc.setLineWidth(0.4);

doc.line(

    summaryX,

    sy-3,

    summaryX+summaryW,

    sy-3

);

sy += 3;

summaryRow(

    "Balance Due",

    customer.totalBalance.toFixed(2),

    true

);
    
// ======================================
// SIGNATURE
// ======================================

const signY =
Math.max(
sy + 10,
pageHeight - 38
);

doc.setDrawColor(255,193,7);
doc.setLineWidth(0.5);

doc.line(
    pageWidth - 62,
    signY,
    pageWidth - 12,
    signY
);

doc.setFont("helvetica","bold");
doc.setFontSize(10);

doc.text(
    "Authorized Signature",
    pageWidth - 37,
    signY + 6,
    { align: "center" }
);

// ======================================
// FOOTER
// ======================================

function drawFooter() {

    const footerLineY = pageHeight - 16;

    doc.setDrawColor(255,193,7);
    doc.setLineWidth(0.4);

    doc.line(
        12,
        footerLineY,
        pageWidth - 12,
        footerLineY
    );

    doc.setFont("helvetica","bold");
    doc.setFontSize(11);

    doc.text(
        "Thank You For Shopping With Us!",
        pageWidth / 2,
        footerLineY + 5,
        { align: "center" }
    );

    doc.setFont("helvetica","normal");
    doc.setFontSize(8);

    doc.text(
        "Computer Generated Statement",
        pageWidth / 2,
        footerLineY + 10,
        { align: "center" }
    );

}


// Draw Footer
drawFooter();

// Page Number

doc.setFontSize(8);

doc.text(
    "Page " + doc.getCurrentPageInfo().pageNumber,
    pageWidth - 12,
    pageHeight - 6,
    { align:"right" }
);

// ======================================
// SAVE PDF
// ======================================

doc.save(
    customer.name + "_Statement.pdf"
);

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