// ==========================================
// SVSS Billing Software
// Customers Module
// Part 3 - Database + Load + Display
// ==========================================
// ==========================================
// CUSTOMER CONTACT DISPLAY
// GST HAS PRIORITY OVER MOBILE
// ==========================================

function getCustomerContact(customer) {

    const gst =
        String(customer?.gst || "")
            .trim();

    const mobile =
        String(customer?.mobile || "")
            .trim();

    // GST gets first priority
    if (gst && gst !== "-") {
        return gst;
    }

    // Mobile gets second priority
    if (mobile && mobile !== "-") {
        return mobile;
    }

    return "-";
}
// ==========================================
// CUSTOMER CURRENCY FORMAT
// ==========================================
function formatCurrency(value) {

    const amount = Number(value) || 0;

    return "Rs. " + Number(value || 0).toLocaleString("en-IN", {

        minimumFractionDigits: 2,
        maximumFractionDigits: 2

    });

}
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
function parseAmountInput(value) {
    return Number(String(value || "").replace(/,/g, "")) || 0;
}

function formatAmountInput(input) {
    const value = String(input.value || "").replace(/,/g, "");
    if (!value) return;

    const [wholePart, decimalPart] = value.split(".");
    const wholeDigits = (wholePart || "0").replace(/\D/g, "");

    const lastThree = wholeDigits.slice(-3);
    const leadingDigits = wholeDigits.slice(0, -3);
    const groupedLeading =
        leadingDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

    input.value =
        (groupedLeading ? `${groupedLeading},` : "") +
        lastThree +
        (decimalPart === undefined ? "" : `.${decimalPart}`);
}

["openingBalance", "payAmount"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.type = "text";
    input.inputMode = "decimal";

    // Add commas as the amount is typed.
    input.addEventListener("input", () => {
        formatAmountInput(input);
    });

    // Keep the final amount formatted when leaving the field.
    input.addEventListener("blur", () => {
        formatAmountInput(input);
    });
});
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

    // Repair old/inconsistent bill balances
    await repairLegacyBillTotals();

    const customers = {};
    // ==========================================
// REPAIR OLD BILL TOTALS / BALANCES
// ==========================================

async function repairLegacyBillTotals() {

    let changed = false;

    bills.forEach(bill => {

        // ------------------------------------------
        // READ EXISTING VALUES
        // ------------------------------------------

        let grandTotal =
            Number(
                String(bill.grandTotal || "")
                    .replace(/[^\d.]/g, "")
            ) || 0;

        const paid =
            Number(bill.amountPaid) || 0;

        const oldBalance =
            Number(bill.balanceDue) || 0;


        // ------------------------------------------
        // REPAIR OLD BILLS WHERE GRAND TOTAL IS 0
        // ------------------------------------------
        // If Grand Total is missing/0 but Paid or Balance
        // exists, the original bill total can be recovered:
        //
        // Purchase = Paid + Balance
        // ------------------------------------------

        if (
            grandTotal <= 0 &&
            (paid > 0 || oldBalance > 0)
        ) {

            grandTotal =
                Number(
                    (paid + oldBalance).toFixed(2)
                );

            bill.grandTotal =
                "Rs. " + grandTotal.toFixed(2);

            changed = true;

            console.log(
                "SVSS: Recovered old bill total:",
                bill.billNo,
                "Purchase:",
                grandTotal
            );
        }


        // ------------------------------------------
        // NOTHING TO REPAIR
        // ------------------------------------------

        if (grandTotal <= 0) {
            return;
        }


        // ------------------------------------------
        // ALWAYS CALCULATE BALANCE FROM:
        //
        // Purchase - Paid
        // ------------------------------------------

        const correctBalance =
            Math.max(
                Number(
                    (grandTotal - paid).toFixed(2)
                ),
                0
            );


        // ------------------------------------------
        // REPAIR WRONG BALANCE
        // ------------------------------------------

        if (
            Math.abs(
                oldBalance - correctBalance
            ) > 0.01
        ) {

            console.log(
                "SVSS: Repairing old bill balance:",
                bill.billNo,
                "Old Balance:",
                oldBalance,
                "Correct Balance:",
                correctBalance
            );

            bill.balanceDue =
                correctBalance;

            bill.paymentStatus =
                correctBalance <= 0
                    ? "Paid"
                    : "Pending";

            changed = true;
        }

    });


    // Recover bill payments when the payment history saved but the bill
    // collection did not. New history records carry an explicit bill target.
    // Legacy records are only unambiguous when there is no opening balance.
    db.customers.forEach(customer => {
        const history = Array.isArray(customer.paymentHistory)
            ? customer.paymentHistory
            : [];
        const customerBills = getCustomerBillsForPaymentHistory(customer);
        const openingBalance = Number(customer.openingBalance) || 0;

        for (const bill of customerBills) {
            const explicitlyAllocated = history.reduce((sum, payment) => {
                const sameBill = payment.allocationType === "bill" &&
                    String(payment.allocationBillNo || "") === String(bill.billNo || "") &&
                    (!payment.allocationBillDate ||
                        String(payment.allocationBillDate) === String(bill.date || ""));
                return sum + (sameBill ? paymentHistoryAmount(payment.amount) : 0);
            }, 0);
            const currentPaid = paymentHistoryAmount(bill.amountPaid);
            const missingExplicit = Math.max(explicitlyAllocated - currentPaid, 0);
            if (missingExplicit <= 0) continue;

            const grandTotal = paymentHistoryAmount(bill.grandTotal) ||
                currentPaid + paymentHistoryAmount(bill.balanceDue);
            const balance = Math.max(Number((grandTotal - currentPaid).toFixed(2)), 0);
            const applied = Math.min(balance, missingExplicit);
            if (applied <= 0) continue;

            bill.amountPaid = Number((currentPaid + applied).toFixed(2));
            bill.balanceDue = Number((balance - applied).toFixed(2));
            bill.paymentStatus = bill.balanceDue <= 0 ? "Paid" : "Pending";
            changed = true;
        }

        if (openingBalance > 0) return;

        const received = history.reduce(
            (sum, payment) => sum + paymentHistoryAmount(payment.amount),
            0
        );
        let unassigned = Number(Math.max(
            received - customerBills.reduce(
                (sum, bill) => sum + paymentHistoryAmount(bill.amountPaid),
                0
            ),
            0
        ).toFixed(2));

        for (const bill of customerBills) {
            if (unassigned <= 0) break;

            const paid = paymentHistoryAmount(bill.amountPaid);
            const grandTotal = paymentHistoryAmount(bill.grandTotal) ||
                paid + paymentHistoryAmount(bill.balanceDue);
            const balance = Math.max(Number((grandTotal - paid).toFixed(2)), 0);
            const applied = Math.min(balance, unassigned);
            if (applied <= 0) continue;

            bill.amountPaid = Number((paid + applied).toFixed(2));
            bill.balanceDue = Number((balance - applied).toFixed(2));
            bill.paymentStatus = bill.balanceDue <= 0 ? "Paid" : "Pending";
            unassigned = Number((unassigned - applied).toFixed(2));
            changed = true;
        }
    });

    // ------------------------------------------
    // SAVE REPAIRED BILLS
    // ------------------------------------------

    if (changed) {

        db.bills = bills;

        await window.api.saveDatabase(db);

        try {

            await window.api.saveBills(bills);

            console.log(
                "SVSS: Old bill purchase/paid/balance values repaired and synchronized."
            );

        } catch (cloudError) {

            console.warn(
                "SVSS: Cloud sync after legacy bill repair failed.",
                cloudError
            );

        }
    }
}

// --------------------------
// Manual Customers
// --------------------------

db.customers.forEach((customer, dbIndex) => {
    

    const mobile =
    (customer.mobile || "")
    .trim();
    
    const key =
    customer.name.trim().toLowerCase() + "_" + mobile;

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

        openingBalanceDate:
            customer.openingBalanceDate || "",
        
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

// Try to find existing customer by customerId
// OR by matching customer name and mobile number
const existingKey = Object.keys(customers).find(k => {
    const existingCustomer = customers[k];

    const sameCustomerId =
        existingCustomer.customerId &&
        bill.customerId &&
        String(existingCustomer.customerId).trim() ===
        String(bill.customerId).trim();

    const sameName =
        String(existingCustomer.name || "")
            .trim()
            .toLowerCase() ===
        String(name || "")
            .trim()
            .toLowerCase();

    const existingMobile =
        String(existingCustomer.mobile || "")
            .trim();

    const billMobile =
        String(mobile || "")
            .trim();

    const sameMobile =
        existingMobile !== "" &&
        billMobile !== "" &&
        existingMobile === billMobile;

    /*
     * Match in this order:
     * 1. Same customer ID
     * 2. Same name and same mobile
     * 3. Same name when mobile/customer ID is missing
     *
     * This combines old bills whose customer details
     * were saved with different or missing mobile values.
     */
    return (
        sameCustomerId ||
        (sameName && sameMobile) ||
        (
            sameName &&
            (
                !existingCustomer.customerId ||
                !bill.customerId ||
                existingMobile === "" ||
                billMobile === ""
            )
        )
    );
});

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
           
    // ==========================================
// BILL TOTAL CALCULATION
// ==========================================

// Read stored Grand Total
let grandTotal =
    Number(
        String(bill.grandTotal || "")
            .replace(/[^\d.]/g, "")
    ) || 0;

// Read paid amount
const paid =
    Number(bill.amountPaid) || 0;

// Read balance amount
const balance =
    Number(bill.balanceDue) || 0;


// ==========================================
// IMPORTANT
// ==========================================
// Every bill MUST have a Purchase amount.
//
// If old bill has Grand Total = 0,
// recover Purchase from:
//
// Purchase = Paid + Balance
//
// Examples:
//
// ₹39,060 bill
// Paid ₹0
// Balance ₹39,060
// Purchase = ₹39,060
//
// ₹37,866.15 bill
// Paid ₹37,866.15
// Balance ₹0
// Purchase = ₹37,866.15
// ==========================================

if (grandTotal <= 0 && (paid > 0 || balance > 0)) {

    grandTotal =
        Number(
            (paid + balance).toFixed(2)
        );

}


// ==========================================
// ADD BILL
// ==========================================

customers[key].bills.push(bill);


// ==========================================
// CUSTOMER TOTALS
// ==========================================

customers[key].totalPurchase += grandTotal;

customers[key].totalPaid += paid;

customers[key].totalBalance += balance;


            });

        }
        // ==========================================
// RECALCULATE CUSTOMER TOTALS
// USING PAYMENT HISTORY
// ==========================================

Object.values(customers).forEach(customer => {

    // ------------------------------------------
    // TOTAL BILL BALANCE
    // ------------------------------------------

    const billBalance =
        (customer.bills || []).reduce(
            (total, bill) =>
                total +
                (Number(bill.balanceDue) || 0),
            0
        );


    // ------------------------------------------
    // TOTAL PAID AGAINST BILLS
    // ------------------------------------------

    const totalBillPaid =
        (customer.bills || []).reduce(
            (total, bill) =>
                total +
                (Number(bill.amountPaid) || 0),
            0
        );


    // ------------------------------------------
    // TOTAL PAYMENTS RECEIVED
    // ------------------------------------------

    const paymentHistoryTotal =
        Array.isArray(customer.paymentHistory)
            ? customer.paymentHistory.reduce(
                (total, payment) =>
                    total +
                    (Number(payment.amount) || 0),
                0
            )
            : 0;


    // ------------------------------------------
    // PAYMENT USED FOR OPENING BALANCE
    // ------------------------------------------

    const openingPaid =
        Math.max(
            paymentHistoryTotal -
            totalBillPaid,
            0
        );


    // ------------------------------------------
    // REMAINING OPENING BALANCE
    // ------------------------------------------

    const remainingOpeningBalance =
        Math.max(
            (Number(customer.openingBalance) || 0) -
            openingPaid,
            0
        );


    // ------------------------------------------
    // FINAL CUSTOMER TOTALS
    // ------------------------------------------

    customer.totalPaid =
    Number(Math.max(totalBillPaid, paymentHistoryTotal).toFixed(2));


    customer.totalBalance =
        Number(
            (
                billBalance +
                remainingOpeningBalance
            ).toFixed(2)
        );

});
 
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

                    ${getCustomerContact(customer)}


                </td>

                <td>

                    ${customer.address}

                </td>

                <td>

                    ${customer.bills.length}

                </td>

                <td class="purchase">

                    ${formatCurrency(customer.totalPurchase)}

                </td>

                <td class="paid">

                    Rs. ${Number(customer.totalPaid || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}

                </td>

                <td class="balance">

                    ${formatCurrency(customer.totalBalance)}

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
        parseAmountInput(document.getElementById("openingBalance").value)

    const openingBalanceDate =
        document.getElementById("openingBalanceDate").value || "";

    if (!name) {
        showToast("Please enter Customer Name.", "info");
        return;
    }

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

    const normalizedName = name.trim().toLowerCase();

    const normalizeContact = value =>
        String(value || "")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "");

    const enteredContacts = [
        normalizeContact(mobile),
        normalizeContact(gst)
    ].filter(value => value && value !== "-");

    const matchesCustomer = customer => {
        const existingName =
            String(customer.name || "").trim().toLowerCase();

        const existingContacts = [
            normalizeContact(customer.mobile),
            normalizeContact(customer.gst)
        ].filter(value => value && value !== "-");

        const sameContact = enteredContacts.some(value =>
            existingContacts.includes(value)
        );

        const sameNameWithoutReliableContact =
            existingName === normalizedName &&
            (enteredContacts.length === 0 ||
                existingContacts.length === 0);

        return sameContact || sameNameWithoutReliableContact;
    };

    if (editIndex >= 0) {
        const oldCustomer = customerData[editIndex];
        let dbIndex = oldCustomer.dbIndex;
        const isBillHistoryOnly = dbIndex === -1;

        const billIdentityKey = bill =>
            `${String(bill.billNo || "").trim()}|${String(bill.date || "").trim()}`;

        const linkedBillKeys = new Set(
            (oldCustomer.bills || [])
                .filter(bill => bill.billNo)
                .map(billIdentityKey)
        );

        if (dbIndex === undefined) {
            showToast("Could not identify this customer record.", "error");
            return;
        }

        if (isBillHistoryOnly && linkedBillKeys.size === 0) {
            showToast(
                "Could not safely identify this customer's bills.",
                "error"
            );
            return;
        }

        // If this bill-history-only customer already matches a saved
        // customer, update that saved record instead of creating another.
        if (isBillHistoryOnly) {
            const matchingIndex =
                db.customers.findIndex(matchesCustomer);

            if (matchingIndex >= 0) {
                dbIndex = matchingIndex;
            }
        }

        const editingCustomerId =
    String(oldCustomer.customerId || "").trim();

const duplicateIndex = db.customers.findIndex((customer, index) => {
    const sameCustomerId =
        editingCustomerId &&
        String(customer.customerId || "").trim() === editingCustomerId;

    // Ignore the record being edited.
    if (index === dbIndex || sameCustomerId) {
        return false;
    }

    const existingContacts = [
        normalizeContact(customer.mobile),
        normalizeContact(customer.gst)
    ].filter(value => value && value !== "-");

    // A blank phone number is not a shared contact.
    // Only treat another record as a duplicate when a real,
    // nonblank phone number or GST number matches.
    return enteredContacts.some(value =>
        existingContacts.includes(value)
    );
});

        if (duplicateIndex >= 0) {
            showToast(
                "Another saved customer has this mobile number or GST number.",
                "error"
            );
            return;
        }

        // Promote a customer that exists only in Bill History into the
        // customer list, then link their existing bills to this record.
        if (isBillHistoryOnly && dbIndex === -1) {
            const newCustomerId =
                "CUS_" +
                Date.now() +
                "_" +
                Math.random().toString(36).substring(2, 8);

            db.customers.push({
                customerId: newCustomerId,
                name,
                mobile,
                address,
                gst,
                email,
                notes,
                openingBalance,
                openingBalanceDate,
                paymentHistory: Array.isArray(oldCustomer.paymentHistory)
                    ? oldCustomer.paymentHistory
                    : [],
                createdDate: new Date().toISOString()
            });

            dbIndex = db.customers.length - 1;
        }

        const oldName = oldCustomer.name;
        const oldMobile = oldCustomer.mobile;

        db.customers[dbIndex] = {
            ...db.customers[dbIndex],
            name,
            mobile,
            address,
            gst,
            email,
            notes,
            openingBalance,
            openingBalanceDate
        };

        const billMobile = /^\d{10}$/.test(mobile.trim())
            ? mobile.trim()
            : "";

        const gstPattern =
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;

        const enteredGst = gst.trim().toUpperCase();
        const gstFromMobile = mobile.trim().toUpperCase();

        const billGst = gstPattern.test(enteredGst)
            ? enteredGst
            : gstPattern.test(gstFromMobile)
                ? gstFromMobile
                : "";

        bills.forEach(bill => {
            const matchesBillHistoryRecord =
                isBillHistoryOnly &&
                linkedBillKeys.has(billIdentityKey(bill));

            const matchesSavedCustomer =
                !isBillHistoryOnly &&
                (bill.customer || "").trim() === oldName &&
                (
                    (bill.mobile || "").trim() === oldMobile ||
                    !oldMobile ||
                    oldMobile === "-"
                );

            if (matchesBillHistoryRecord || matchesSavedCustomer) {
                bill.customerId = db.customers[dbIndex].customerId;
                bill.customer = name;
                bill.address = address;

                if (isBillHistoryOnly) {
                    bill.mobile = billMobile;
                    bill.gst = billGst;
                } else {
                    bill.mobile = mobile;
                }
            }
        });

        db.bills = bills;
        await window.api.saveDatabase(db);
try {
    await Promise.all([
        window.api.saveCustomers(db.customers),
        window.api.saveBills(bills)
    ]);

    console.log(
        "SVSS Cloud: Customer and bill details synchronized successfully."
    );
} catch (cloudError) {
    console.warn(
        "SVSS Cloud: Customer or bill synchronization failed.",
        cloudError
    );
}

        showToast(
            isBillHistoryOnly
                ? "Customer details saved and linked to existing bills."
                : "Customer Updated Successfully.",
            "success"
        );
    } else {
        const existingCustomer =
            db.customers.find(matchesCustomer);

        if (existingCustomer) {
            // Keep the existing customer row and update its opening balance.
            existingCustomer.openingBalance = openingBalance;
            existingCustomer.openingBalanceDate = openingBalanceDate;

            db.bills = bills;
            await saveDatabase();

            try {
                await window.api.saveCustomers(db.customers);
                console.log(
                    "SVSS Cloud: Customers synchronized successfully."
                );
            } catch (cloudError) {
                console.warn(
                    "SVSS Cloud: Customer synchronization failed.",
                    cloudError
                );
            }

            showToast(
                "Opening balance updated on the existing customer.",
                "success"
            );
        } else {
            db.customers.push({
                customerId:
                    "CUS_" +
                    Date.now() +
                    "_" +
                    Math.random().toString(36).substring(2, 8),

                name,
                mobile,
                address,
                gst,
                email,
                notes,
                openingBalance,
                openingBalanceDate,
                createdDate: new Date().toISOString()
            });

            db.bills = bills;
            await saveDatabase();

            try {
                await window.api.saveCustomers(db.customers);
                console.log(
                    "SVSS Cloud: Customers synchronized successfully."
                );
            } catch (cloudError) {
                console.warn(
                    "SVSS Cloud: Customer synchronization failed.",
                    cloudError
                );
            }

            showToast("Customer Added Successfully.", "success");
        }
    }

    editIndex = -1;

    document.getElementById("customerName").value = "";
    document.getElementById("customerMobile").value = "";
    document.getElementById("customerAddress").value = "";
    document.getElementById("customerGST").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerNotes").value = "";
    document.getElementById("openingBalance").value = "0";
    document.getElementById("openingBalanceDate").value = "";

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
// SHOW CUSTOMER DETAILS
// MODERN CUSTOMER DETAILS DESIGN
// ==========================================

function showCustomer(customer) {

    // ==========================================
    // CUSTOMER DATA
    // ==========================================

    const customerName =
        customer.name || "-";

    const customerMobile =
        customer.mobile || "-";

    const customerGST =
        customer.gst || "-";

    const customerAddress =
        customer.address || "-";

    const openingBalance =
        Number(customer.openingBalance) || 0;


    // ==========================================
    // KEEP OLD IDS UPDATED
    // ==========================================

    const nameElement =
        document.getElementById("viewCustomerName");

    const mobileElement =
        document.getElementById("viewCustomerMobile");

    const gstElement =
        document.getElementById("viewCustomerGST");

    const addressElement =
        document.getElementById("viewCustomerAddress");


    if (nameElement) {

        nameElement.textContent =
            customerName;

        nameElement.style.display =
            "none";

    }


    if (mobileElement) {

        mobileElement.textContent =
            customerMobile;

        mobileElement.style.display =
            "none";

    }


    if (gstElement) {

        gstElement.textContent =
            customerGST;

        gstElement.style.display =
            "none";

    }


    if (addressElement) {

        addressElement.textContent =
            customerAddress;

        addressElement.style.display =
            "none";

    }


    // ==========================================
    // CUSTOMER MODERN HEADER
    // ==========================================

    let modernHeader =
        document.getElementById(
            "customerModernHeader"
        );


    if (!modernHeader) {

        modernHeader =
            document.createElement("div");

        modernHeader.id =
            "customerModernHeader";

        modernHeader.className =
            "customer-modern-header";


        const modalBody =
            document.querySelector(
                "#customerModal .modal-body"
            );


        if (modalBody) {

            modalBody.insertBefore(
                modernHeader,
                modalBody.firstElementChild
            );

        }

    }


    // ==========================================
    // HEADER CONTENT
    // EMAIL REMOVED
    // ADDRESS ADDED
    // ==========================================

    modernHeader.innerHTML = `

        <!-- CUSTOMER -->

        <div class="customer-modern-main">

            <div class="customer-modern-avatar">

                <i class="bi bi-person-fill"></i>

            </div>


            <div class="customer-modern-main-text">

                <div class="customer-modern-name">

                    ${customerName}

                </div>

            </div>

        </div>


        <!-- MOBILE -->

        <div class="customer-modern-contact">

            <div class="customer-modern-label">

                Mobile Number

            </div>


            <div class="customer-modern-value">

                <i class="bi bi-telephone-fill"></i>

                ${customerMobile}

            </div>

        </div>


        <!-- GST -->

        <div class="customer-modern-contact">

            <div class="customer-modern-label">

                GST Number

            </div>


            <div class="customer-modern-value">

                <i class="bi bi-file-earmark-text"></i>

                ${customerGST}

            </div>

        </div>


        <!-- ADDRESS -->

        <div class="customer-modern-contact">

            <div class="customer-modern-label">

                Address

            </div>


            <div class="customer-modern-value">

                <i class="bi bi-geo-alt-fill"></i>

                ${customerAddress}

            </div>

        </div>

    `;


    // ==========================================
    // CALCULATE ACTUAL BILL TOTALS
    // ==========================================

    const customerBills =
        Array.isArray(customer.bills)
            ? customer.bills
            : [];


    let totalPurchase = 0;

    let totalPaid = 0;

    let totalBalance = 0;


    customerBills.forEach(bill => {

        let grandTotal =
            Number(
                String(
                    bill.grandTotal || ""
                )
                .replace(/[^\d.]/g, "")
            ) || 0;


        const paid =
            Number(
                bill.amountPaid
            ) || 0;


        const balance =
            Number(
                bill.balanceDue
            ) || 0;


        // Recover old bill total
        if (
            grandTotal <= 0 &&
            (paid > 0 || balance > 0)
        ) {

            grandTotal =
                Number(
                    (
                        paid +
                        balance
                    ).toFixed(2)
                );

        }


        totalPurchase +=
            grandTotal;

        totalPaid +=
            paid;

        totalBalance +=
            balance;

    });
    // ==========================================
// CALCULATE FINAL BALANCE DUE
// ==========================================

// Total payments received from payment history
const paymentHistoryTotal =
    Array.isArray(customer.paymentHistory)
        ? customer.paymentHistory.reduce(
            (total, payment) =>
                total +
                (Number(payment.amount) || 0),
            0
        )
        : 0;


// Total amount already paid against bills
const totalBillPaid =
    customerBills.reduce(
        (total, bill) =>
            total +
            (Number(bill.amountPaid) || 0),
        0
    );


// Payment remaining after clearing bills
const openingBalancePaid =
    Math.max(
        paymentHistoryTotal -
        totalBillPaid,
        0
    );


// Remaining original opening balance
const remainingOpeningBalance =
    Math.max(
        openingBalance -
        openingBalancePaid,
        0
    );


// Final customer balance
totalBalance =
    Number(
        (
            totalBalance +
            remainingOpeningBalance
        ).toFixed(2)
    );


    totalPurchase =
        Number(
            totalPurchase.toFixed(2)
        );
    
     totalPaid =
    Number(Math.max(totalBillPaid, paymentHistoryTotal).toFixed(2));


    // ==========================================
    // UPDATE SUMMARY VALUES
    // ==========================================

    const purchaseElement =
        document.getElementById(
            "customerPurchase"
        );

    const paidElement =
        document.getElementById(
            "customerPaid"
        );

    const balanceElement =
        document.getElementById(
            "customerBalance"
        );


    if (purchaseElement) {

        purchaseElement.textContent =
            formatCurrency(
                totalPurchase
            );

    }


    if (paidElement) {

        paidElement.textContent =
            formatCurrency(
                totalPaid
            );

    }


    if (balanceElement) {

        balanceElement.textContent =
            formatCurrency(
                totalBalance
            );

    }


    // ==========================================
    // CREATE OPENING BALANCE BOX
    // SEPARATE FROM BOOTSTRAP SUMMARY ROW
    // ==========================================

    let openingCard =
        document.getElementById(
            "customerOpeningSummary"
        );


    if (!openingCard) {

        openingCard =
            document.createElement("div");

        openingCard.id =
            "customerOpeningSummary";

        openingCard.className =
            "customer-summary-card customer-summary-opening";


        openingCard.innerHTML = `

            <div class="customer-summary-icon">

                <i class="bi bi-coin"></i>

            </div>


            <div>

                <div class="customer-summary-title">

                    Opening Balance

                </div>


                <div
                    id="customerOpeningBalance"
                    class="customer-summary-value"
                >

                    Rs. 0.00

                </div>

            </div>

        `;


        // ======================================
        // IMPORTANT
        // Put opening balance BELOW
        // the 3 existing summary cards
        // ======================================

        const summaryRow =
            purchaseElement
                ?.closest(".row");


        if (summaryRow) {

            summaryRow.insertAdjacentElement(
                "afterend",
                openingCard
            );

        }

    }


    // ==========================================
    // UPDATE OPENING BALANCE VALUE
    // ==========================================

    const openingElement =
        document.getElementById(
            "customerOpeningBalance"
        );


    if (openingElement) {

        openingElement.textContent =
            formatCurrency(
                openingBalance
            );

    }


    // ==========================================
    // LOAD BILL HISTORY
    // ==========================================

    loadBillHistory(
        customer
    );


    // ==========================================
    // LOAD PAYMENT HISTORY
    // ==========================================

    loadPaymentHistory(
        customer
    );


    // ==========================================
    // SHOW MODAL
    // ==========================================

    customerModal.show();

}
function formatDate(dateString) {
    if (!dateString) return "-";

    const value = String(dateString).trim();
    let year, month, day;

    // YYYY-MM-DD, with an optional time
    let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T)/);

    if (match) {
        [, year, month, day] = match;
    } else {
        // DD-MM-YYYY or DD/MM/YYYY
        match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

        if (match) {
            [, day, month, year] = match;
        } else {
            // YYYY/MM/DD
            match = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
            if (!match) return value;
            [, year, month, day] = match;
        }
    }

    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const parsed = new Date(y, m - 1, d);

    if (
        parsed.getFullYear() !== y ||
        parsed.getMonth() !== m - 1 ||
        parsed.getDate() !== d
    ) {
        return value;
    }

    return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
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
    customer.mobile || "";

    document.getElementById("customerAddress").value =
        customer.address;

    document.getElementById("customerGST").value =
        customer.gst || "";

    document.getElementById("customerEmail").value =
        customer.email || "";

    document.getElementById("openingBalance").value =
    customer.openingBalance || 0;

    document.getElementById("openingBalanceDate").value =
        customer.openingBalanceDate || "";
    
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
    getCustomerContact(customer);


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
// BILL HISTORY
// ==========================================

function loadBillHistory(customer) {

    const tbody =
        document.getElementById(
            "customerBills"
        );


    if (!tbody) return;


    tbody.innerHTML = "";


    // ==========================================
    // OPENING BALANCE
    // ==========================================

    const openingBalance =
        Number(
            customer.openingBalance
        ) || 0;


    // Show opening balance only when it exists

    if (openingBalance > 0) {

        const openingRow =
            document.createElement("tr");


        openingRow.className =
            "customer-opening-row";


        openingRow.innerHTML = `

            <td>

                <strong>
                    OPENING BALANCE
                </strong>

            </td>


           <td>
                ${
                    customer.openingBalanceDate
                        ? formatDate(customer.openingBalanceDate)
                        : "-"
                }
            </td>


            <td>
                Rs.${openingBalance.toFixed(2)}
            </td>


            <td>
                Rs.0.00
            </td>


            <td>
                Rs.${openingBalance.toFixed(2)}
            </td>


            <td>

                <span class="badge bg-warning text-dark">

                    Opening

                </span>

            </td>

        `;


        tbody.appendChild(
            openingRow
        );

    }


    // ==========================================
    // NO BILLS
    // ==========================================

    if (
        !Array.isArray(customer.bills) ||
        customer.bills.length === 0
    ) {

        if (openingBalance <= 0) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="text-center text-muted"
                    >

                        No Bills Found

                    </td>

                </tr>

            `;

        }

        return;
    }


    // ==========================================
    // BILL ROWS
    // ==========================================

    customer.bills.forEach(
        bill => {

            const row =
                document.createElement(
                    "tr"
                );


            let total =
                Number(
                    String(
                        bill.grandTotal || ""
                    )
                    .replace(/[^\d.]/g, "")
                ) || 0;


            const paid =
                Number(
                    bill.amountPaid
                ) || 0;


            const balance =
                Number(
                    bill.balanceDue
                ) || 0;


            // Recover total if missing

            if (
                total <= 0 &&
                (
                    paid > 0 ||
                    balance > 0
                )
            ) {

                total =
                    Number(
                        (
                            paid +
                            balance
                        ).toFixed(2)
                    );

            }


            const status =
                balance > 0
                    ? "Pending"
                    : "Paid";


            row.innerHTML = `

                <td>

                    <strong>

                        ${bill.billNo || "-"}

                    </strong>

                    <br>

                    <small
                        class="text-primary fw-semibold"
                    >

                        Book :
                        ${bill.billBookNo || "-"}

                    </small>

                </td>


                <td>

                    ${formatDate(
                        bill.date
                    )}

                </td>


                <td>

                    Rs.${total.toFixed(2)}

                </td>


                <td>

                    Rs.${paid.toFixed(2)}

                </td>


                <td>

                    Rs.${balance.toFixed(2)}

                </td>


                <td>

                    <span
                        class="badge ${
                            balance > 0
                                ? "bg-danger"
                                : "bg-success"
                        }"
                    >

                        ${status}

                    </span>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}
// ==========================================
// PAYMENT HISTORY HEADER
// ==========================================

function addPaymentHistoryHeader() {

    const tbody =
        document.getElementById(
            "paymentHistoryBody"
        );


    if (!tbody) return;


    const table =
        tbody.closest("table");


    if (!table) return;


    let heading =
        document.getElementById(
            "customerPaymentHeading"
        );


    if (!heading) {

        heading =
            document.createElement(
                "div"
            );


        heading.id =
            "customerPaymentHeading";


        heading.className =
            "customer-payment-heading";


        heading.innerHTML = `

            <div
                class="customer-payment-heading-title"
            >

                <i class="bi bi-clock-history"></i>

                <span>
                    Payment History
                </span>

            </div>

        `;


        table.parentNode.insertBefore(
            heading,
            table
        );

    }

}
// ==========================================
// PAYMENT HISTORY
// ==========================================

function loadPaymentHistory(customer) {

    const tbody =
        document.getElementById("paymentHistoryBody");

    const countBadge =
        document.getElementById("paymentHistoryCount");

    if (!tbody) return;

    tbody.innerHTML = "";

    // Get payment history
    const payments =
        Array.isArray(customer.paymentHistory)
            ? [...customer.paymentHistory]
            : [];

    // Update payment count
    if (countBadge) {
        countBadge.textContent =
            `${payments.length} ${
                payments.length === 1
                    ? "Payment"
                    : "Payments"
            }`;
    }

    // No payments
    if (payments.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8"
                    class="text-center text-muted py-3">
                    <i class="bi bi-cash-stack"></i>
                    No Payments Found
                </td>
            </tr>
        `;

        return;
    }

 // ==========================================
// SORT PAYMENTS CHRONOLOGICALLY
// ==========================================

const chronologicalPayments =
    [...payments].sort((a, b) => {

        const dateA =
            new Date(
                a.createdAt ||
                a.date ||
                0
            ).getTime();

        const dateB =
            new Date(
                b.createdAt ||
                b.date ||
                0
            ).getTime();

        return dateA - dateB;

    });


// ==========================================
// ORIGINAL OPENING BALANCE
// ==========================================

const openingBalance =
    Number(
        customer.openingBalance
    ) || 0;


// ==========================================
// CUSTOMER BILLS
// ==========================================

const customerBills =
    Array.isArray(customer.bills)
        ? customer.bills
        : [];


// ==========================================
// TOTAL BILL PURCHASE
// ==========================================

const totalBillPurchase =
    customerBills.reduce(
        (total, bill) => {

            let grandTotal =
                Number(
                    String(
                        bill.grandTotal || ""
                    )
                    .replace(/[^\d.]/g, "")
                ) || 0;

            const paid =
                Number(
                    bill.amountPaid
                ) || 0;

            const balance =
                Number(
                    bill.balanceDue
                ) || 0;

            if (
                grandTotal <= 0 &&
                (
                    paid > 0 ||
                    balance > 0
                )
            ) {

                grandTotal =
                    Number(
                        (
                            paid +
                            balance
                        ).toFixed(2)
                    );

            }

            return total + grandTotal;

        },
        0
    );


// ==========================================
// TOTAL BILL PAID
// ==========================================

const totalBillPaid =
    customerBills.reduce(
        (total, bill) =>
            total +
            (
                Number(
                    bill.amountPaid
                ) || 0
            ),
        0
    );


// ==========================================
// CALCULATE PAYMENT HISTORY
// ==========================================

let runningPaid = 0;

const calculatedPayments =
    chronologicalPayments.map(
        payment => {

            const amount =
                Number(
                    payment.amount
                ) || 0;


            runningPaid =
                Number(
                    (
                        runningPaid +
                        amount
                    ).toFixed(2)
                );


            // ==========================================
            // PAYMENT USED AGAINST OPENING BALANCE
            // ==========================================

            const openingPaid =
                Math.max(
                    runningPaid -
                    totalBillPaid,
                    0
                );


            // ==========================================
            // REMAINING OPENING BALANCE
            // ==========================================

            const remainingOpeningBalance =
                Math.max(
                    openingBalance -
                    openingPaid,
                    0
                );


            // ==========================================
            // REMAINING BILL BALANCE
            // ==========================================

            const remainingBillBalance =
                Math.max(
                    totalBillPurchase -
                    Math.min(
                        runningPaid,
                        totalBillPaid
                    ),
                    0
                );


            // ==========================================
            // FINAL BALANCE AFTER THIS PAYMENT
            // ==========================================

            const balanceDue =
                Number(
                    (
                        remainingBillBalance +
                        remainingOpeningBalance
                    ).toFixed(2)
                );


            return {
                ...payment,
                amount,
                totalPaid: runningPaid,
                balanceDue,
                historyIndex: customer.paymentHistory.indexOf(payment)
            };

        }
    );


// ==========================================
// SHOW NEWEST PAYMENT FIRST
// ==========================================

calculatedPayments.reverse();

    // Display payment history
    calculatedPayments.forEach(
        (payment, index) => {

            const row =
                document.createElement("tr");

            const amount =
                Number(payment.amount) || 0;

            const totalPaid =
                Number(payment.totalPaid) || 0;

            const balanceDue =
                Number(payment.balanceDue) || 0;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatDate(payment.date || payment.createdAt?.split("T")[0])}</td>
                <td class="payment-amount">Rs.${amount.toFixed(2)}</td>
                <td>Rs.${totalPaid.toFixed(2)}</td>
                <td class="payment-balance">Rs.${balanceDue.toFixed(2)}</td>
                <td>
                    <span class="badge bg-secondary">
                        ${payment.paymentMode || "Cash"}
                    </span>
                </td>
                <td>${payment.remarks || "-"}</td>
                <td class="payment-history-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary editPaymentHistoryBtn" data-payment-index="${payment.historyIndex}">Edit</button>
                    <button type="button" class="btn btn-sm btn-outline-danger deletePaymentHistoryBtn" data-payment-index="${payment.historyIndex}">Delete</button>
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}
// ==========================================
// ==========================================
// EDIT / DELETE PAYMENT HISTORY
// ==========================================

function normalizePaymentHistoryDate(value) {
    const text = String(value || "").trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
        const dmy = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        if (dmy) match = [text, dmy[3], dmy[2], dmy[1]];
    }
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
        return null;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getPaymentHistoryTimestamp(record) {
    const created = new Date(record.createdAt || "");
    if (!isNaN(created.getTime())) return created.getTime();
    const normalized = normalizePaymentHistoryDate(record.date);
    return normalized ? new Date(`${normalized}T00:00:00`).getTime() : 0;
}

function paymentHistoryAmount(value) {
    return Number(String(value ?? "0").replace(/[^0-9.-]/g, "")) || 0;
}

function getCustomerBillsForPaymentHistory(customer) {
    const customerId = String(customer.customerId || "").trim();
    const customerName = String(customer.name || "").trim().toLowerCase();
    const customerMobile = String(customer.mobile || "").trim();

    return bills.filter(bill => {
        const sameId = customerId && bill.customerId &&
            String(bill.customerId).trim() === customerId;
        const sameName = String(bill.customer || "").trim().toLowerCase() === customerName;
        const billMobile = String(bill.mobile || "").trim();
        const sameMobile = billMobile === customerMobile || !billMobile || billMobile === "-" ||
            !customerMobile || customerMobile === "-";
        return sameId || (sameName && sameMobile);
    }).sort((a, b) => getPaymentHistoryTimestamp({ date: a.date }) - getPaymentHistoryTimestamp({ date: b.date }));
}

function recalculateBillsForPaymentHistory(
    customerBills,
    oldHistory,
    newHistory
) {
    const roundMoney = value =>
        Number((Number(value) || 0).toFixed(2));

    const getBillTotal = bill =>
        paymentHistoryAmount(bill.grandTotal) ||
        paymentHistoryAmount(bill.amountPaid) +
            paymentHistoryAmount(bill.balanceDue);

    const findAllocatedBill = payment =>
        customerBills.find(bill =>
            String(bill.billNo || "") ===
                String(payment.allocationBillNo || "") &&
            (
                !payment.allocationBillDate ||
                String(bill.date || "") ===
                    String(payment.allocationBillDate)
            )
        );

    let amountToReverse = roundMoney(
        customerBills.reduce(
            (total, bill) =>
                total + paymentHistoryAmount(bill.amountPaid),
            0
        )
    );

    const reverseFromBill = (bill, amount) => {
        if (!bill || amount <= 0 || amountToReverse <= 0) return;

        const paid = paymentHistoryAmount(bill.amountPaid);
        const reversed = Math.min(paid, amount, amountToReverse);

        bill.amountPaid = roundMoney(paid - reversed);
        amountToReverse = roundMoney(amountToReverse - reversed);
    };

    // Reverse old bill allocations. Opening-balance payments never
    // changed bill balances, so they must not be reversed from bills.
    [...oldHistory]
        .sort((a, b) =>
            getPaymentHistoryTimestamp(b) -
            getPaymentHistoryTimestamp(a)
        )
        .forEach(payment => {
            if (payment.allocationType === "openingBalance") return;

            const amount = paymentHistoryAmount(payment.amount);

            if (payment.allocationType === "bill") {
                reverseFromBill(findAllocatedBill(payment), amount);
                return;
            }

            // Older payment records have no allocation fields.
            // Preserve their previous oldest-bill-first behavior.
            for (
                let i = customerBills.length - 1;
                i >= 0 && amountToReverse > 0;
                i--
            ) {
                reverseFromBill(customerBills[i], amount);
            }
        });

    const applyToBill = (bill, amount) => {
        if (!bill || amount <= 0) return;

        const total = getBillTotal(bill);
        const paid = paymentHistoryAmount(bill.amountPaid);
        const applied = Math.min(
            Math.max(0, total - paid),
            amount
        );

        bill.amountPaid = roundMoney(paid + applied);
    };

    // Replay payments in date order, respecting the saved target.
    [...newHistory]
        .sort((a, b) =>
            getPaymentHistoryTimestamp(a) -
            getPaymentHistoryTimestamp(b)
        )
        .forEach(payment => {
            if (payment.allocationType === "openingBalance") return;

            const amount = paymentHistoryAmount(payment.amount);

            if (payment.allocationType === "bill") {
                applyToBill(findAllocatedBill(payment), amount);
                return;
            }

            // Legacy records continue using the original allocation rule.
            let remaining = amount;

            for (const bill of customerBills) {
                if (remaining <= 0) break;

                const before = paymentHistoryAmount(bill.amountPaid);
                applyToBill(bill, remaining);

                const applied = roundMoney(
                    paymentHistoryAmount(bill.amountPaid) - before
                );

                remaining = roundMoney(remaining - applied);
            }
        });

    customerBills.forEach(bill => {
        const total = getBillTotal(bill);
        const paid = Math.min(
            total,
            paymentHistoryAmount(bill.amountPaid)
        );

        bill.amountPaid = roundMoney(paid);
        bill.balanceDue = roundMoney(Math.max(0, total - paid));
        bill.paymentStatus =
            bill.balanceDue <= 0 ? "Paid" : "Pending";
    });
}

async function savePaymentHistoryChanges(nextHistory) {
    const identity = {
        customerId: currentCustomer?.customerId,
        name: currentCustomer?.name,
        mobile: currentCustomer?.mobile
    };

    await refreshDatabase();

    const sameIdentity = customer =>
        identity.customerId &&
        String(customer.customerId || "").trim() ===
            String(identity.customerId).trim();

    const dbCustomer =
        db.customers.find(sameIdentity) ||
        db.customers.find(customer =>
            String(customer.name || "").trim().toLowerCase() ===
                String(identity.name || "").trim().toLowerCase() &&
            String(customer.mobile || "").trim() ===
                String(identity.mobile || "").trim()
        );

    if (!dbCustomer) {
        throw new Error("Customer record was not found.");
    }

    const oldHistory = Array.isArray(dbCustomer.paymentHistory)
        ? [...dbCustomer.paymentHistory]
        : [];

    recalculateBillsForPaymentHistory(
        getCustomerBillsForPaymentHistory(dbCustomer),
        oldHistory,
        nextHistory
    );

    dbCustomer.paymentHistory = nextHistory;
    db.bills = bills;

    // Save customer payment history and updated bill balances together.
    await window.api.saveDatabase(db);

    await loadCustomers();

    currentCustomer =
        customerData.find(sameIdentity) ||
        customerData.find(customer =>
            String(customer.name || "").trim().toLowerCase() ===
                String(identity.name || "").trim().toLowerCase() &&
            String(customer.mobile || "").trim() ===
                String(identity.mobile || "").trim()
        );

    if (currentCustomer) {
        document.getElementById("customerPurchase").textContent =
            formatCurrency(currentCustomer.totalPurchase);

        document.getElementById("customerPaid").textContent =
            formatCurrency(currentCustomer.totalPaid);

        document.getElementById("customerBalance").textContent =
            formatCurrency(currentCustomer.totalBalance);

        loadBillHistory(currentCustomer);
        loadPaymentHistory(currentCustomer);
    }
}

let editingPaymentIndex = -1;

const paymentHistoryBody =
    document.getElementById("paymentHistoryBody");

const paymentHistoryEditForm =
    document.getElementById("paymentHistoryEditForm");

const paymentEditDate =
    document.getElementById("paymentEditDate");

const paymentEditAmount =
    document.getElementById("paymentEditAmount");

const paymentEditMode =
    document.getElementById("paymentEditMode");

const paymentEditRemarks =
    document.getElementById("paymentEditRemarks");

paymentHistoryBody?.addEventListener("click", async event => {
    const button = event.target.closest(
        ".editPaymentHistoryBtn, .deletePaymentHistoryBtn"
    );

    if (!button || !currentCustomer) return;

    const index = Number(button.dataset.paymentIndex);
    const history = Array.isArray(currentCustomer.paymentHistory)
        ? currentCustomer.paymentHistory
        : [];
    const payment = history[index];

    if (!payment) return;

    if (button.classList.contains("editPaymentHistoryBtn")) {
        editingPaymentIndex = index;

        paymentEditDate.value =
            normalizePaymentHistoryDate(payment.date) || "";

        paymentEditAmount.value =
            Number(payment.amount || 0).toFixed(2);

        paymentEditMode.value =
            payment.paymentMode || "Cash";

        paymentEditRemarks.value =
            payment.remarks || "";

        paymentHistoryEditForm.style.display = "block";
        paymentHistoryEditForm.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

        paymentEditDate.focus();
        return;
    }

    try {
        if (!window.confirm(
            `Delete this payment of ${formatCurrency(payment.amount)}? Bill balances will be recalculated.`
        )) {
            return;
        }

        await savePaymentHistoryChanges(
            history.filter((_, paymentIndex) => paymentIndex !== index)
        );

        showToast("Payment deleted successfully.", "success");
    } catch (error) {
        console.error("Payment history update failed:", error);
        showToast(
            `Payment update failed: ${error?.message || String(error)}`,
            "error"
        );
    }
});

document
    .getElementById("cancelPaymentEdit")
    ?.addEventListener("click", () => {
        editingPaymentIndex = -1;
        paymentHistoryEditForm.style.display = "none";
    });

document
    .getElementById("savePaymentEdit")
    ?.addEventListener("click", async () => {
        if (!currentCustomer || editingPaymentIndex < 0) return;

        const history = Array.isArray(currentCustomer.paymentHistory)
            ? [...currentCustomer.paymentHistory]
            : [];

        const payment = history[editingPaymentIndex];

        if (!payment) {
            showToast("Payment record was not found.", "error");
            return;
        }

        const date =
            normalizePaymentHistoryDate(paymentEditDate.value);

        const amount =
            parseAmountInput(paymentEditAmount.value);

        if (!date || !Number.isFinite(amount) || amount <= 0) {
            showToast(
                "Enter a valid payment date and an amount greater than zero.",
                "error"
            );
            return;
        }

        history[editingPaymentIndex] = {
            ...payment,
            date,
            amount: Number(amount.toFixed(2)),
            paymentMode: paymentEditMode.value || "Cash",
            remarks: paymentEditRemarks.value.trim()
        };

        const saveButton =
            document.getElementById("savePaymentEdit");

        saveButton.disabled = true;

        try {
            await savePaymentHistoryChanges(history);

            editingPaymentIndex = -1;
            paymentHistoryEditForm.style.display = "none";

            showToast("Payment updated successfully.", "success");
        } catch (error) {
            console.error("Payment history update failed:", error);
            showToast(
                `Payment update failed: ${error?.message || String(error)}`,
                "error"
            );
        } finally {
            saveButton.disabled = false;
        }
    });
function getOpeningBalanceRemaining(customer, customerBills) {
    const history = Array.isArray(customer?.paymentHistory)
        ? customer.paymentHistory
        : [];

    const paymentHistoryTotal = history.reduce(
        (total, payment) => total + (Number(payment.amount) || 0),
        0
    );

    const totalBillPaid = customerBills.reduce(
        (total, bill) => total + (Number(bill.amountPaid) || 0),
        0
    );

    const openingBalancePaid = Math.max(
        paymentHistoryTotal - totalBillPaid,
        0
    );

    return Math.max(
        (Number(customer?.openingBalance) || 0) - openingBalancePaid,
        0
    );
}

function updatePaymentAllocationLimit() {
    const amountInput = document.getElementById("payAmount");
    const openingRadio = document.getElementById("payToOpeningBalance");
    const billRadio = document.getElementById("payToBill");
    const billSelect = document.getElementById("payBillSelect");
    const openingAmount = Number(
        document.getElementById("payOpeningRemaining")?.dataset.balance
    ) || 0;
    const selectedBillOption = billSelect?.selectedOptions?.[0];
    const billAmount = Number(selectedBillOption?.dataset.balance) || 0;

    const selectedRadio = document.querySelector(
        'input[name="paymentAllocation"]:checked'
    );

    let selectedBalance = 0;

    if (selectedRadio?.value === "openingBalance") {
        selectedBalance = openingAmount;
    } else if (selectedRadio?.value === "bill") {
        selectedBalance = billAmount;
    }

    amountInput.max = selectedBalance.toFixed(2);

    document.getElementById("payOpeningCard")
        ?.classList.toggle("is-selected", openingRadio.checked);

    document.getElementById("payBillCard")
        ?.classList.toggle("is-selected", billRadio.checked);

    const billRemaining = document.getElementById("payBillRemaining");

    if (selectedBillOption && selectedBillOption.value) {
        billRemaining.textContent =
            `${formatCurrency(billAmount)} remaining`;
    } else {
        billRemaining.textContent = "Select an unpaid bill";
    }
}

document
    .querySelectorAll('input[name="paymentAllocation"]')
    .forEach(radio => {
        radio.addEventListener("change", updatePaymentAllocationLimit);
    });

document
    .getElementById("payBillSelect")
    .addEventListener("change", () => {
        document.getElementById("payToBill").checked = true;
        updatePaymentAllocationLimit();
    });
// RECEIVE PAYMENT BUTTON
// ==========================================

document
    .getElementById("receivePayment")
    .addEventListener("click", function () {
        if (!currentCustomer) {
            showToast("Customer not selected.", "warning");
            return;
        }

        document.getElementById("payCustomer").textContent =
            currentCustomer.name || "-";

        const customerBills =
            getCustomerBillsForPaymentHistory(currentCustomer);

        const unpaidBills = customerBills.filter(
            bill => (Number(bill.balanceDue) || 0) > 0
        );

        const openingRemaining =
            getOpeningBalanceRemaining(currentCustomer, customerBills);

        const billBalance = customerBills.reduce(
            (total, bill) => total + (Number(bill.balanceDue) || 0),
            0
        );

        const outstandingBalance = Number(
            (openingRemaining + billBalance).toFixed(2)
        );

        document.getElementById("payBalance").textContent =
            formatCurrency(outstandingBalance);

        const payAmount = document.getElementById("payAmount");
        payAmount.value = "";

        const openingRemainingLabel =
            document.getElementById("payOpeningRemaining");

        openingRemainingLabel.dataset.balance =
            openingRemaining.toFixed(2);

        openingRemainingLabel.textContent =
            `${formatCurrency(openingRemaining)} remaining`;

        const billSelect = document.getElementById("payBillSelect");
        billSelect.innerHTML = "";

        unpaidBills.forEach(bill => {
            const balance = Number(bill.balanceDue) || 0;
            const option = document.createElement("option");

            option.value = String(bill.billNo || "");
            option.dataset.billNo = String(bill.billNo || "");
            option.dataset.billDate = String(bill.date || "");
            option.dataset.balance = balance.toFixed(2);
            option.textContent =
                `${bill.billNo || "Bill"} · ${formatDate(bill.date)} · ` +
                `${formatCurrency(balance)} remaining`;

            billSelect.appendChild(option);
        });

        if (unpaidBills.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No unpaid bills";
            option.disabled = true;
            option.selected = true;
            option.dataset.balance = "0";
            billSelect.appendChild(option);
        }

        const openingRadio =
            document.getElementById("payToOpeningBalance");

        const billRadio =
            document.getElementById("payToBill");

        openingRadio.disabled = openingRemaining <= 0;
        billRadio.disabled = unpaidBills.length === 0;
        billSelect.disabled = unpaidBills.length === 0;

        if (openingRemaining > 0) {
            openingRadio.checked = true;
            billRadio.checked = false;
        } else if (unpaidBills.length > 0) {
            openingRadio.checked = false;
            billRadio.checked = true;
        } else {
            openingRadio.checked = false;
            billRadio.checked = false;
        }

        updatePaymentAllocationLimit();

        document.getElementById("payDate").value =
            new Date().toISOString().split("T")[0];

        document.getElementById("payMode").value = "Cash";
        document.getElementById("payRemarks").value = "";

        const customerModalElement =
            document.getElementById("customerModal");

        const paymentModalElement =
            document.getElementById("paymentModal");

        const customerModalInstance =
            bootstrap.Modal.getOrCreateInstance(customerModalElement);

        const paymentModalInstance =
            bootstrap.Modal.getOrCreateInstance(paymentModalElement);

        customerModalInstance.hide();

        setTimeout(() => paymentModalInstance.show(), 350);
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

let paymentCloudSyncPending = false;
let paymentSaveInProgress = false;
let pendingPaymentConfirmation = "";

async function syncPaymentCollections() {
    const results = await Promise.allSettled([
        window.api.saveCustomers(db.customers),
        window.api.saveBills(db.bills)
    ]);
    const failedSave = results.find(result => result.status === "rejected");
    if (failedSave) throw failedSave.reason;
}

document
    .getElementById("savePayment")
    .addEventListener("click", async function () {

        if (!currentCustomer || paymentSaveInProgress) return;

        // Retry only the existing saved records, never add the receipt twice.
        if (paymentCloudSyncPending) {
            paymentSaveInProgress = true;
            try {
                await syncPaymentCollections();
                paymentCloudSyncPending = false;
                sessionStorage.setItem("svssPendingPaymentNotice", pendingPaymentConfirmation);
                window.location.reload();
            } catch (syncError) {
                console.error("Payment cloud sync retry failed.", syncError);
                showToast(
                    "Cloud sync failed again. The payment is saved locally; click Retry Cloud Sync when connected. Do not enter it again.",
                    "error"
                );
            } finally {
                paymentSaveInProgress = false;
            }
            return;
        }

        paymentSaveInProgress = true;

        try {

        const paymentInput =
            document.getElementById("payAmount");

        const paymentMode =
            document.getElementById("payMode").value || "Cash";

        const remarks =
            document.getElementById("payRemarks").value.trim();

        const requestedAmount =
            parseAmountInput(paymentInput.value)
        
        const paymentDate =
            document.getElementById("payDate").value;    

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
        if (!paymentDate) {

            showToast(
                "Please select the payment date.",
                "error"
            );
        
            return;
        }


        // ==========================================
        // REFRESH DATABASE
        // ==========================================

        await refreshDatabase();


      // ==========================================
// CHECK CUSTOMER BALANCE AND PAYMENT TARGET
// ==========================================
let paymentCustomer =
    db.customers.find(customer =>
        currentCustomer.customerId &&
        String(customer.customerId || "").trim() ===
            String(currentCustomer.customerId || "").trim()
    ) ||
    db.customers.find(customer => {
        const sameName =
            String(customer.name || "").trim().toLowerCase() ===
            String(currentCustomer.name || "").trim().toLowerCase();

        const customerMobile =
            String(customer.mobile || "").trim();

        const selectedMobile =
            String(currentCustomer.mobile || "").trim();

        return sameName && (
            customerMobile === selectedMobile ||
            !customerMobile ||
            customerMobile === "-" ||
            !selectedMobile ||
            selectedMobile === "-"
        );
    });

if (!paymentCustomer) {
    paymentCustomer = {
        customerId:
            currentCustomer.customerId ||
            (
                "AUTO_" +
                Date.now() +
                "_" +
                Math.random().toString(36).substring(2, 8)
            ),
        name: String(currentCustomer.name || "").trim(),
        mobile: String(currentCustomer.mobile || "").trim(),
        address: currentCustomer.address || "-",
        gst: currentCustomer.gst || "",
        email: currentCustomer.email || "",
        notes: currentCustomer.notes || "",
        openingBalance: Number(currentCustomer.openingBalance) || 0,
        openingBalanceDate: currentCustomer.openingBalanceDate || "",
        paymentHistory: Array.isArray(currentCustomer.paymentHistory)
            ? [...currentCustomer.paymentHistory]
            : []
    };

    db.customers.push(paymentCustomer);
}

const customerBills =
    getCustomerBillsForPaymentHistory(paymentCustomer);

const openingRemaining =
    getOpeningBalanceRemaining(paymentCustomer, customerBills);

const billBalance = customerBills.reduce(
    (total, bill) => total + (Number(bill.balanceDue) || 0),
    0
);

const currentBalance = Number(
    (openingRemaining + billBalance).toFixed(2)
);

const allocationType =
    document.querySelector('input[name="paymentAllocation"]:checked')?.value;

if (!allocationType) {
    showToast("Select Opening Balance or a bill for this payment.", "error");
    return;
}

let selectedBill = null;
let targetBalance = 0;

if (allocationType === "openingBalance") {
    targetBalance = openingRemaining;
} else if (allocationType === "bill") {
    const selectedOption =
        document.getElementById("payBillSelect").selectedOptions[0];

    const selectedBillNo =
        String(selectedOption?.dataset.billNo || "");

    const selectedBillDate =
        String(selectedOption?.dataset.billDate || "");

    selectedBill = customerBills.find(bill =>
        String(bill.billNo || "") === selectedBillNo &&
        String(bill.date || "") === selectedBillDate
    );

    if (!selectedBill) {
        showToast("Select an unpaid bill for this payment.", "error");
        return;
    }

    targetBalance = Number(selectedBill.balanceDue) || 0;
} else {
    showToast("Select a valid payment target.", "error");
    return;
}

if (requestedAmount > currentBalance + 0.009) {
    showToast(
        `Payment cannot be greater than the total balance due. ${formatCurrency(currentBalance)}`,
        "error"
    );
    return;
}

if (requestedAmount > targetBalance + 0.009) {
    showToast(
        `Payment cannot be greater than the selected balance. ${formatCurrency(targetBalance)}`,
        "error"
    );
    return;
}

// Apply this payment only to the selected bill.
// Opening balance payments are recorded in paymentHistory and do not
// change any bill's amountPaid or balanceDue.
if (allocationType === "bill") {
    selectedBill.amountPaid = Number(
        ((Number(selectedBill.amountPaid) || 0) + requestedAmount).toFixed(2)
    );

    selectedBill.balanceDue = Number(
        (targetBalance - requestedAmount).toFixed(2)
    );

    selectedBill.paymentStatus =
        selectedBill.balanceDue <= 0 ? "Paid" : "Pending";
}
// The payment is applied only to the selected target.
// Opening-balance payments are calculated from paymentHistory.

// ==========================================
// PAYMENT HISTORY
// ==========================================

let dbCustomer =
    db.customers.find(c =>
        currentCustomer.customerId &&
        String(c.customerId || "").trim() ===
            String(currentCustomer.customerId || "").trim()
    ) ||
    db.customers.find(c => {

        const customerName =
            String(c.name || "")
                .trim()
                .toLowerCase();

        const selectedName =
            String(currentCustomer.name || "")
                .trim()
                .toLowerCase();

        const customerMobile =
            String(c.mobile || "")
                .trim();

        const selectedMobile =
            String(currentCustomer.mobile || "")
                .trim();

        const normalizedCustomerMobile =
            customerMobile === "-" ? "" : customerMobile;

        const normalizedSelectedMobile =
            selectedMobile === "-" ? "" : selectedMobile;

        return (
            customerName === selectedName &&
            normalizedCustomerMobile ===
                normalizedSelectedMobile
        );

    });

// ==========================================
// FIND CUSTOMER BY CUSTOMER ID FIRST
// ==========================================

if (currentCustomer.customerId) {
    dbCustomer = db.customers.find(customer =>
        String(customer.customerId || "").trim() ===
        String(currentCustomer.customerId || "").trim()
    );
}

// ==========================================
// FIND CUSTOMER BY NAME AND MOBILE
// ==========================================

if (!dbCustomer) {

    const currentName =
        String(currentCustomer.name || "")
            .trim()
            .toLowerCase();

    const currentMobile =
        String(currentCustomer.mobile || "")
            .trim();

    dbCustomer = db.customers.find(customer => {

        const customerName =
            String(customer.name || "")
                .trim()
                .toLowerCase();

        const customerMobile =
            String(customer.mobile || "")
                .trim();

        const sameName =
            customerName === currentName;

        const sameMobile =
            customerMobile === currentMobile ||
            customerMobile === "" ||
            customerMobile === "-" ||
            currentMobile === "" ||
            currentMobile === "-";

        return sameName && sameMobile;

    });

}
// ==========================================
// CREATE CUSTOMER IF BILL-HISTORY CUSTOMER
// ==========================================

if (!dbCustomer) {
    console.warn(
        "Customer not found in customer database. Creating customer from bill history:",
        currentCustomer
    );

    dbCustomer = {
        customerId:
            currentCustomer.customerId ||
            (
                "AUTO_" +
                Date.now() +
                "_" +
                Math.random().toString(36).substring(2, 8)
            ),

        name:
            String(currentCustomer.name || "").trim(),

        mobile:
            String(currentCustomer.mobile || "").trim(),

        address:
            currentCustomer.address || "-",

        gst:
            currentCustomer.gst || "",

        email:
            currentCustomer.email || "",

        notes:
            currentCustomer.notes || "",

        openingBalance: 0,

        paymentHistory: []
    };

    db.customers.push(dbCustomer);
}

// ==========================================
// ENSURE PAYMENT HISTORY ARRAY
// ==========================================

if (!Array.isArray(dbCustomer.paymentHistory)) {

    dbCustomer.paymentHistory = [];

}


// ==========================================
// CALCULATE TOTAL PAID
// ==========================================

const previousPaid =
    dbCustomer.paymentHistory.reduce(
        (total, payment) =>
            total + (Number(payment.amount) || 0),
        0
    );

const newTotalPaid =
    Number(
        (
            previousPaid +
            Number(requestedAmount)
        ).toFixed(2)
    );


// ==========================================
// CALCULATE BALANCE AFTER PAYMENT
// ==========================================

const currentBalanceAfterPayment =
    Number(
        (
            Number(currentBalance || 0) -
            Number(requestedAmount)
        ).toFixed(2)
    );

// ==========================================
// CREATE PAYMENT RECORD
// ==========================================

const paymentRecord = {

    paymentId:
        "PAY-" + Date.now(),

    date:
        paymentDate,

    createdAt:
        new Date().toISOString(),

    amount:
        Number(
            Number(requestedAmount).toFixed(2)
        ),

    totalPaid:
        newTotalPaid,

    balanceDue:
        Math.max(
            0,
            currentBalanceAfterPayment
        ),

    paymentMode:
        paymentMode || "Cash",

    allocationType,

    allocationBillNo:
        allocationType === "bill" ? selectedBill.billNo : "",

    allocationBillDate:
        allocationType === "bill" ? selectedBill.date : "",

    remarks:
        remarks || ""

};


// ==========================================
// SAVE PAYMENT HISTORY
// ==========================================

dbCustomer.paymentHistory.push(
    paymentRecord
);
        // ==========================================
        // SAVE DATABASE + CLOUD SYNC
        // ==========================================
        
        db.bills = bills;
        
        // Save to local storage / Electron database
        // Save locally first
         try {
             await window.api.saveDatabase(db);
         } catch (saveError) {
             console.error("Could not save received payment.", saveError);
             showToast("Payment could not be saved. Please try again.", "error");
             return;
         }
         
         paymentCloudSyncPending = true;
         const receivedAmount = Number(requestedAmount).toLocaleString("en-IN", {
             minimumFractionDigits: 2,
             maximumFractionDigits: 2
         });
         pendingPaymentConfirmation = `Amount credited: Rs. ${receivedAmount}`;

         // Wait until both records have finished syncing before reloading.
         await syncPaymentCollections();
         paymentCloudSyncPending = false;

        // Preserve a confirmation across the page reload.
        sessionStorage.setItem(
            "svssPendingPaymentNotice",
            pendingPaymentConfirmation
        );

        // Reload from the saved database so the Paid and Balance columns
        // show the latest figures and the payment dialog closes.
        window.location.reload();
        return;

        } catch (paymentError) {
            console.error("Receive Payment failed.", paymentError);
            if (paymentCloudSyncPending) {
                const saveButton = document.getElementById("savePayment");
                if (saveButton) saveButton.textContent = "Retry Cloud Sync";
                showToast(
                    "Payment saved locally, but cloud sync failed. Click Retry Cloud Sync; do not enter it again.",
                    "error"
                );
            } else {
                showToast(
                    "Payment process failed. Refresh and check payment history before trying again.",
                    "error"
                );
            }
        } finally {
            paymentSaveInProgress = false;
        }

    });
    // ==========================================
    // Print Customer Statement
    // ==========================================
    // ==========================================
    // Print Customer Statement
    // ==========================================

    async function printCustomerStatement(customer) {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    await refreshDatabase();
    
    // ======================================
    // GET LATEST CUSTOMER DATA
    // ======================================
    
    const latestCustomer =
        db.customers.find(c =>
            String(c.customerId || "").trim() ===
            String(customer.customerId || "").trim()
        ) ||
        db.customers.find(c =>
            String(c.name || "").trim().toLowerCase() ===
            String(customer.name || "").trim().toLowerCase()
        ) ||
        customer;
    
    // ======================================
    // OPENING BALANCE
    // ======================================
    
    const openingBalance =
        Number(latestCustomer.openingBalance) || 0;
    
    const openingBalanceDate =
        latestCustomer.openingBalanceDate || "";
    const statementBills = getCustomerBillsForPaymentHistory(latestCustomer);
    const statementPayments = Array.isArray(latestCustomer.paymentHistory)
        ? latestCustomer.paymentHistory
        : [];

    // ======================================
    // CALCULATE LATEST STATEMENT TOTALS
    // ======================================
    
    let statementTotalPurchase = 0;
    
   let statementTotalPaid = 0;

let statementBillPaid = 0;

let statementBillBalance = 0;


// ======================================
// CALCULATE FROM CUSTOMER BILLS
// ======================================

statementBills.forEach(
    bill => {

        let grandTotal =
            Number(
                String(
                    bill.grandTotal || ""
                )
                .replace(/[^\d.]/g, "")
            ) || 0;


        const paid =
            Number(
                bill.amountPaid
            ) || 0;


        const balance =
            Number(
                bill.balanceDue
            ) || 0;


        // Recover old bill total
        if (
            grandTotal <= 0 &&
            (
                paid > 0 ||
                balance > 0
            )
        ) {

            grandTotal =
                Number(
                    (
                        paid +
                        balance
                    ).toFixed(2)
                );

        }


        statementTotalPurchase +=
            grandTotal;


        statementBillPaid +=
            paid;


        statementBillBalance +=
            balance;

    }
);


// ======================================
// TOTAL PAYMENTS FROM PAYMENT HISTORY
// ======================================

if (statementPayments.length > 0) {

    statementTotalPaid =
        statementPayments.reduce(
            (total, payment) =>
                total +
                (
                    Number(
                        payment.amount
                    ) || 0
                ),
            0
        );

}

statementTotalPaid = Math.max(
    statementBillPaid,
    statementTotalPaid
);
// ======================================
// PAYMENT USED AGAINST OPENING BALANCE
// ======================================

const statementOpeningPaid = openingBalance > 0
    ? Math.min(
        openingBalance,
        Math.max(statementTotalPaid - statementBillPaid, 0)
    )
    : 0;


// ======================================
// REMAINING OPENING BALANCE
// ==========================================

const statementRemainingOpening = Math.max(
    openingBalance - statementOpeningPaid,
    0
);


// ======================================
// FINAL BALANCE DUE
// ======================================

const statementBalanceDue =
    Number(
        (
            statementBillBalance +
            statementRemainingOpening
        ).toFixed(2)
    );


// ======================================
// CLEAN DECIMAL VALUES
// ======================================

statementTotalPurchase =
    Number(
        statementTotalPurchase.toFixed(2)
    );

statementTotalPaid =
    Number(
        statementTotalPaid.toFixed(2)
    );
    // ======================================
    // CLEAN DECIMAL VALUES
    // ======================================
    
    statementTotalPurchase =
        Number(
            statementTotalPurchase.toFixed(2)
        );
    
    statementTotalPaid =
        Number(
            statementTotalPaid.toFixed(2)
        );    
    // ======================================
    // STATEMENT MONEY FORMAT
    // Indian comma formatting
    // ======================================
    
    function formatStatementMoney(value) {
    
        const amount = Number(
            String(value ?? 0)
                .replace(/[^\d.-]/g, "")
        ) || 0;
    
        return "Rs. " + amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

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

   const customerContact =
        getCustomerContact(customer);
    
    doc.text(
        customerContact,
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

        formatDate(
        new Date().getFullYear() + "-" +
            String(new Date().getMonth() + 1).padStart(2, "0") + "-" +
            String(new Date().getDate()).padStart(2, "0")
        ),

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
// STATEMENT TABLE ROWS
// INCLUDING OPENING BALANCE
// ======================================

const rows = [];

// ======================================
// OPENING BALANCE ROW
// ======================================

if (openingBalance > 0) {

    rows.push([

        "—",

        "OPENING BALANCE",

        "—",

        openingBalanceDate
            ? formatDate(openingBalanceDate)
            : "-",

        openingBalance.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }),

        statementOpeningPaid.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }),

        statementRemainingOpening.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }),

        "Opening"

    ]);

}


// ======================================
// NORMAL BILL ROWS
// ======================================

statementBills.forEach((bill, index) => {

    const total =
        Number(
            String(bill.grandTotal || "")
                .replace(/[^\d.]/g, "")
        ) || 0;

    const paid =
        Number(bill.amountPaid) || 0;

    const balance =
        Number(bill.balanceDue) || 0;

    rows.push([

        index + 1,

        bill.billNo || "-",

        bill.billBookNo || "-",

        formatDate(bill.date),

        total.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }),

        paid.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }),

        balance.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }),

        balance > 0
            ? "Pending"
            : "Paid"

    ]);

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

    didParseCell: function(data) {

    if (
        data.section === "body" &&
        data.column.index === 7
    ) {

        if (data.cell.raw === "Opening") {

            data.cell.styles.textColor = [120, 90, 0];

            data.cell.styles.fontStyle = "bold";

        }

        else if (data.cell.raw === "Paid") {

            data.cell.styles.textColor = [0, 140, 0];

            data.cell.styles.fontStyle = "bold";

        }

        else {

            data.cell.styles.textColor = [220, 53, 69];

            data.cell.styles.fontStyle = "bold";

        }

    }


    // ======================================
    // OPENING BALANCE ROW
    // ======================================

    if (
        data.section === "body" &&
        data.row.index === 0 &&
        openingBalance > 0
    ) {

        data.cell.styles.fillColor = [255, 248, 225];

        data.cell.styles.fontStyle = "bold";

    }

  }

});

// ======================================
// PAYMENT HISTORY
// ======================================

const paymentHistory = statementPayments;

// Keep the detailed movement and allocation tables only when there are
// payment records to explain. Without payment history, the bill table and
// account summary already show the customer's outstanding balance clearly.
let y = doc.lastAutoTable.finalY + 10;

if (paymentHistory.length > 0) {
// ======================================
// BUILD CHRONOLOGICAL ACCOUNT MOVEMENT
// ======================================

const movementItems = [];
let movementOrder = 0;

function statementDateTimestamp(value) {
    const displayDate = formatDate(String(value || "").split("T")[0]);
    const parts = displayDate.split("-");
    if (parts.length !== 3) return 0;

    return Date.UTC(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0])
    );
}

function statementNumber(value) {
    return Number(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0;
}

if (openingBalance > 0) {
    movementItems.push({
        date: openingBalanceDate,
        description: "Opening balance",
        charge: openingBalance,
        payment: 0,
        order: movementOrder++
    });
}

statementBills.forEach(bill => {
    const total = statementNumber(bill.grandTotal) ||
        statementNumber(bill.amountPaid) + statementNumber(bill.balanceDue);

    movementItems.push({
        date: bill.date || "",
        description: "Bill " + (bill.billNo || "-") +
            (bill.billBookNo ? " (Book " + bill.billBookNo + ")" : ""),
        charge: total,
        payment: 0,
        order: movementOrder++
    });
});

paymentHistory.forEach(payment => {
    movementItems.push({
        date: payment.date || payment.paymentDate || payment.createdAt || "",
        description: "Payment received (" +
            (payment.paymentMode || payment.mode || "Cash") + ")",
        charge: 0,
        payment: statementNumber(payment.amount ?? payment.payment),
        order: movementOrder++
    });
});

movementItems.sort((a, b) =>
    statementDateTimestamp(a.date) - statementDateTimestamp(b.date) ||
    a.order - b.order
);

let runningBalance = 0;
const movementRows = movementItems.map(item => {
    runningBalance = Number(
        (runningBalance + item.charge - item.payment).toFixed(2)
    );

    return [
        formatDate(item.date),
        item.description,
        item.charge > 0 ? formatStatementMoney(item.charge) : "-",
        item.payment > 0 ? formatStatementMoney(item.payment) : "-",
        formatStatementMoney(Math.max(0, runningBalance))
    ];
});

if (y + 35 > pageHeight - 18) {
    doc.addPage();
    drawPageBorder();
    y = 20;
}

doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.text("ACCOUNT MOVEMENT", 14, y);

doc.autoTable({
    startY: y + 4,
    head: [["Date", "Description", "Charge", "Payment", "Balance"]],
    body: movementRows.length
        ? movementRows
        : [["-", "No transactions", "-", "-", "-"]],
    margin: { left: 14, right: 14 },
    theme: "grid",
    styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2,
        textColor: [40, 40, 40],
        valign: "middle"
    },
    headStyles: {
        fillColor: [244, 180, 0],
        textColor: [31, 41, 55],
        fontStyle: "bold",
        halign: "center"
    },
    columnStyles: {
        0: { cellWidth: 25, halign: "center" },
        1: { cellWidth: 69 },
        2: { cellWidth: 29, halign: "right" },
        3: { cellWidth: 29, halign: "right" },
        4: { cellWidth: 30, halign: "right", fontStyle: "bold" }
    },
    didDrawPage: drawPageBorder
});

y = doc.lastAutoTable.finalY + 8;

if (y + 55 > pageHeight - 18) {
    doc.addPage();
    drawPageBorder();
    y = 20;
}

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("PAYMENT ALLOCATION", 14, y);

const allocationY = y + 4;
const allocationGap = 4;
const allocationWidth = (pageWidth - 28 - allocationGap) / 2;
const allocationHeight = 36;
const allocationLeftX = 14;
const allocationRightX = allocationLeftX + allocationWidth + allocationGap;

function drawAllocationCard(x, title, rows, remainingAmount) {
    doc.setDrawColor(227, 169, 0);
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, allocationY, allocationWidth, allocationHeight, 2, 2, "FD");

    doc.setFillColor(255, 243, 204);
    doc.roundedRect(x, allocationY, allocationWidth, 8, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(title, x + 3, allocationY + 5.5);

    doc.setDrawColor(230, 230, 230);
    doc.line(x + 3, allocationY + 9, x + allocationWidth - 3, allocationY + 9);

    const remainingBalanceColor = Number(Number(remainingAmount || 0).toFixed(2)) > 0
        ? [220, 53, 69]
        : [22, 131, 75];

    rows.forEach((row, index) => {
        const rowY = allocationY + 16 + (index * 8);
        const isBalance = index === rows.length - 1;

        doc.setFont("helvetica", isBalance ? "bold" : "normal");
        doc.setFontSize(7);
        doc.setTextColor(70, 70, 70);
        doc.text(row[0], x + 3, rowY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        if (isBalance) {
            doc.setTextColor(...remainingBalanceColor);
        } else {
            doc.setTextColor(40, 40, 40);
        }
        doc.text(row[1], x + allocationWidth - 3, rowY, { align: "right" });
    });
}

drawAllocationCard(allocationLeftX, "BILL PAYMENT", [
    ["Bill total", formatStatementMoney(statementBillPaid + statementBillBalance)],
    ["Paid against bills", formatStatementMoney(statementBillPaid)],
    ["Remaining bill balance", formatStatementMoney(statementBillBalance)]
], statementBillBalance);

drawAllocationCard(allocationRightX, "OPENING BALANCE", [
    ["Original balance", formatStatementMoney(openingBalance)],
    ["Paid against opening balance", formatStatementMoney(statementOpeningPaid)],
    ["Remaining balance", formatStatementMoney(statementRemainingOpening)]
], statementRemainingOpening);

const totalBalanceY = allocationY + allocationHeight + 3;
doc.setFillColor(255, 247, 223);
doc.setDrawColor(244, 180, 0);
doc.roundedRect(14, totalBalanceY, pageWidth - 28, 8, 1.5, 1.5, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(50, 50, 50);
doc.text("TOTAL BALANCE DUE", 17, totalBalanceY + 5.3);
if (statementBalanceDue > 0) {
    doc.setTextColor(255, 0, 0);
} else {
    doc.setTextColor(22, 131, 75);
}
doc.text(formatStatementMoney(statementBalanceDue), pageWidth - 17, totalBalanceY + 5.3, { align: "right" });

y = totalBalanceY + 18;

}


// ======================================
// ACCOUNT SUMMARY
// ======================================

// Check page space

const requiredHeight = 65;

if (
    y + requiredHeight >
    pageHeight - 15
) {

    doc.addPage();

    drawPageBorder();

    y = 20;

}


const summaryX = 110;

const summaryW = 82;

let sy = y + 6;


// ======================================
// SUMMARY ROW
// ======================================

function summaryRow(
    label,
    value,
    bold = false
) {

    doc.setTextColor(40, 40, 40);

    // Highlight Balance Due

    if (bold) {

        doc.setFillColor(
            255,
            248,
            225
        );

        doc.rect(
            summaryX,
            sy - 5,
            summaryW,
            9,
            "F"
        );

    }


    // Label

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(10);

    doc.text(
        label,
        summaryX + 2,
        sy
    );


    // Colon

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.text(
        ":",
        summaryX + 40,
        sy
    );


    // Amount

    doc.setFont(
        "helvetica",
        bold
            ? "bold"
            : "normal"
    );

    if (bold && statementBalanceDue > 0) {
        doc.setTextColor(255, 0, 0);
    } else if (bold) {
        doc.setTextColor(22, 131, 75);
    } else {
        doc.setTextColor(40, 40, 40);
    }

    doc.text(
        value,
        summaryX + summaryW - 2,
        sy,
        {
            align: "right"
        }
    );


    sy += 10;

}


// ======================================
// ACCOUNT SUMMARY HEADING
// ======================================

doc.setFont(
    "helvetica",
    "bold"
);

doc.setFontSize(12);
doc.setTextColor(40, 40, 40);

doc.text(
    "ACCOUNT SUMMARY",
    summaryX,
    y
);

sy += 2;


// ======================================
// TOTAL PURCHASE
// ======================================

summaryRow(
    "Total Purchase",
    formatStatementMoney(
        statementTotalPurchase
    )
);


// ======================================
// OPENING BALANCE
// ======================================

summaryRow(
    "Opening Balance",
    formatStatementMoney(
        openingBalance
    )
);


// ======================================
// TOTAL PAID
// ======================================

summaryRow(
    "Total Paid",
    formatStatementMoney(
        statementTotalPaid
    )
);


// ======================================
// GOLD DIVIDER
// ======================================

doc.setDrawColor(
    255,
    193,
    7
);

doc.setLineWidth(0.4);

doc.line(
    summaryX,
    sy - 3,
    summaryX + summaryW,
    sy - 3
);

sy += 3;


// ======================================
// FINAL BALANCE DUE
// ======================================

const finalBalanceDue =
    Math.max(
        0,
        Number(
            statementBalanceDue || 0
        )
    );


summaryRow(
    "Balance Due",
    formatStatementMoney(
        finalBalanceDue
    ),
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

doc.setTextColor(0, 0, 0);
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

    doc.setTextColor(0, 0, 0);
    doc.text(
        "Thank You For Shopping With Us!",
        pageWidth / 2,
        footerLineY + 5,
        { align: "center" }
    );

    doc.setFont("helvetica","normal");
    doc.setFontSize(8);

    doc.setTextColor(0, 0, 0);
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

    const pendingPaymentNotice =
        sessionStorage.getItem("svssPendingPaymentNotice");

    if (pendingPaymentNotice) {
        sessionStorage.removeItem("svssPendingPaymentNotice");
        setTimeout(() => {
            try {
                showToast(pendingPaymentNotice, "success");
            } catch (toastError) {
                console.error("Could not show payment confirmation toast.", toastError);
                window.alert(pendingPaymentNotice);
            }
        }, 300);
    }
});

