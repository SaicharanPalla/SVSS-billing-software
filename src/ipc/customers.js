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
function getCustomerPaymentTotals(customer) {

    const money = value =>
        Number(
            String(value ?? 0).replace(/[^0-9.-]/g, "")
        ) || 0;

    const bills = Array.isArray(customer.bills)
        ? customer.bills
        : [];

    const history = Array.isArray(customer.paymentHistory)
        ? customer.paymentHistory
        : [];

    const billPaid = bills.reduce(
        (sum, bill) => sum + money(bill.amountPaid),
        0
    );

    const billDue = bills.reduce(
        (sum, bill) => sum + Math.max(0, money(bill.balanceDue)),
        0
    );

    const openingBalance = Math.max(
        0,
        money(customer.openingBalance)
    );

    const openingPaid = Math.min(
        openingBalance,
        history
            .filter(payment =>
                payment.allocationType === "openingBalance"
            )
            .reduce(
                (sum, payment) => sum + money(payment.amount),
                0
            )
    );

    const openingDue = Math.max(
        0,
        openingBalance - openingPaid
    );

    return {
        billPaid,
        billDue,
        openingPaid,
        openingDue,
        totalPaid: billPaid + openingPaid,
        totalDue: billDue + openingDue
    };
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
    // Show Opening Balance when adding a new customer
const addCustomerButton = document.getElementById("addCustomerBtn");
const openingBalanceFields = document.getElementById("openingBalanceFields");

if (addCustomerButton && openingBalanceFields) {
    addCustomerButton.addEventListener("click", function () {
        openingBalanceFields.style.display = "";
    });
}
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

    

// ==========================================
// EDIT CUSTOMER OPENING BALANCE
// ==========================================

const openingBalanceModalElement =
    document.getElementById("editOpeningBalanceModal");

const openingBalanceModal =
    new bootstrap.Modal(openingBalanceModalElement);

const openingBalanceAmountInput =
    document.getElementById("editOpeningBalanceAmount");

const openingBalanceDateInput =
    document.getElementById("editOpeningBalanceDate");


// Indian currency formatting
function formatOpeningBalanceInput() {

    const rawValue = openingBalanceAmountInput.value
        .replace(/,/g, "")
        .replace(/[^\d.]/g, "");

    const parts = rawValue.split(".");

    const wholePart = parts[0] || "";

    const decimalPart = parts.length > 1
        ? "." + parts.slice(1).join("").slice(0, 2)
        : "";

    const formattedWhole = wholePart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
    );

    openingBalanceAmountInput.value =
        formattedWhole + decimalPart;
}


// Format while typing
openingBalanceAmountInput.addEventListener(
    "input",
    formatOpeningBalanceInput
);


// Open popup
document.addEventListener("click", function (event) {

    const button = event.target.closest("#editOpeningBalance");

    if (!button) return;

    if (!currentCustomer) {
        showToast("Please select a customer first.", "warning");
        return;
    }

    const amount = Number(currentCustomer.openingBalance || 0);

    openingBalanceAmountInput.value =
        amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    openingBalanceDateInput.value =
        currentCustomer.openingBalanceDate || "";

    openingBalanceModal.show();

});


// Save opening balance and optional date
document.getElementById("saveOpeningBalance")
    .addEventListener("click", async function () {

        if (!currentCustomer) return;

        const rawAmount =
            openingBalanceAmountInput.value
                .replace(/,/g, "")
                .trim();

        const newAmount = Number(rawAmount);

        const newDate =
            openingBalanceDateInput.value || "";

        if (
            rawAmount === "" ||
            !Number.isFinite(newAmount) ||
            newAmount < 0
        ) {
            showToast("Enter a valid opening balance.", "warning");
            return;
        }

        const saveButton =
            document.getElementById("saveOpeningBalance");

        saveButton.disabled = true;

        try {

            await refreshDatabase();

            const customerId =
                String(currentCustomer.customerId || "").trim();

            const customerIndex = (db.customers || []).findIndex(
                customer =>
                    String(customer.customerId || "").trim() === customerId
            );

            if (customerIndex === -1) {
                showToast("Customer record not found.", "error");
                return;
            }

            const amount = Number(newAmount.toFixed(2));

            // Update database
            db.customers[customerIndex].openingBalance = amount;

            db.customers[customerIndex].openingBalanceDate = newDate;

            await window.api.saveDatabase(db);

            // Cloud synchronization
            try {
                await window.api.saveCustomers(db.customers);
            } catch (cloudError) {
                console.warn(
                    "Opening balance cloud sync failed:",
                    cloudError
                );
            }

            // Update selected customer
            currentCustomer.openingBalance = amount;
            currentCustomer.openingBalanceDate = newDate;

            // Update main customer list data
            const listCustomer = customerData.find(
                customer =>
                    String(customer.customerId || "").trim() === customerId
            );

            if (listCustomer) {

                listCustomer.openingBalance = amount;
                listCustomer.openingBalanceDate = newDate;

                const customerBills = Array.isArray(listCustomer.bills)
                    ? listCustomer.bills
                    : [];

                const totals = getCustomerPaymentTotals(listCustomer);

                listCustomer.totalBalance = Number(
                    totals.totalDue.toFixed(2)
                );
                
                listCustomer.totalPaid = Number(
                    totals.totalPaid.toFixed(2)
                );
            }

            // Refresh displayed information
            openingBalanceModal.hide();

            showCustomer(currentCustomer);

            displayCustomers(customerData);

            showToast(
                "Opening Balance Updated Successfully.",
                "success"
            );

        } catch (error) {

            console.error("Opening Balance Save Error:", error);

            showToast(
                "Failed to save opening balance.",
                "error"
            );

        } finally {

            saveButton.disabled = false;

        }

    });

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

    // Keep existing saved bill amounts unchanged.
// Do not automatically repair or reallocate payments.

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
        
        advanceReceipts: getAdvanceReceipts(customer),
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

    const totals = getCustomerPaymentTotals(customer);

    customer.totalPaid = totals.totalPaid;
    customer.totalBalance = totals.totalDue;

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

// Preserve opening balance while editing customer details.
const preservedOpeningBalance =
    Number(oldCustomer.openingBalance) || 0;

const preservedOpeningBalanceDate =
    oldCustomer.openingBalanceDate || "";
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

// Always resolve the current database position using customerId.
if (editingCustomerId && !isBillHistoryOnly) {
    const currentDbIndex = db.customers.findIndex(customer =>
        String(customer.customerId || "").trim() === editingCustomerId
    );

    if (currentDbIndex >= 0) {
        dbIndex = currentDbIndex;
    }
}

// Fallback for older records without a customerId.
if (!editingCustomerId && !isBillHistoryOnly) {
    const oldName = String(oldCustomer.name || "").trim().toLowerCase();
    const oldMobile = normalizeContact(oldCustomer.mobile);
    const oldGST = normalizeContact(oldCustomer.gst);

    const matchingIndexes = db.customers
        .map((customer, index) => ({ customer, index }))
        .filter(({ customer }) =>
            String(customer.name || "").trim().toLowerCase() === oldName &&
            normalizeContact(customer.mobile) === oldMobile &&
            normalizeContact(customer.gst) === oldGST
        )
        .map(item => item.index);

    if (matchingIndexes.length === 1) {
        dbIndex = matchingIndexes[0];
    }
}

// Check for another customer with the same contact details.
const duplicateIndex = db.customers.findIndex((customer, index) => {

    const sameCustomerId =
        editingCustomerId &&
        String(customer.customerId || "").trim() === editingCustomerId;

    // Never compare the customer against their own record.
    if (index === dbIndex || sameCustomerId) {
        return false;
    }

    const existingContacts = [
        normalizeContact(customer.mobile),
        normalizeContact(customer.gst)
    ].filter(value => value && value !== "-");

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
                openingBalance: preservedOpeningBalance,
                openingBalanceDate: preservedOpeningBalanceDate,
                advanceReceipts: getAdvanceReceipts(oldCustomer),
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
    openingBalance: preservedOpeningBalance,
    openingBalanceDate: preservedOpeningBalanceDate
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

function getBillAndAdvanceSplit(received, balance) {
    const receivedPaise = Math.round(received * 100);
    const billPaise = Math.round(balance * 100);
    if (!Number.isSafeInteger(receivedPaise) || !Number.isSafeInteger(billPaise) ||
        billPaise <= 0 || receivedPaise <= billPaise) return null;
    return { billAmount: billPaise / 100, advancePaise: receivedPaise - billPaise };
}

function getLocalPaymentDate() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
}

function getAdvanceReceipts(customer) {
    return Array.isArray(customer.advanceReceipts) ? customer.advanceReceipts : [];
}

function getAdvanceApplications(customer) {
    const history = Array.isArray(customer.paymentHistory) ? customer.paymentHistory : [];
    return history.filter(payment => payment.paymentSource === "advance");
}

function getAvailableAdvancePaise(customer, throughDate = null) {
    const included = record => !throughDate || record.date <= throughDate;
    const received = getAdvanceReceipts(customer).filter(included)
        .reduce((total, receipt) => total + receipt.amountPaise, 0);
    const used = getAdvanceApplications(customer).filter(included)
        .reduce((total, payment) => total + Math.round(payment.amount * 100), 0);
    return received - used;
}

function planAdvanceEdit(customer, customerBills, target, changes) {
    const history = [...(customer.paymentHistory || [])];
    const receipts = [...getAdvanceReceipts(customer)];
    const paymentIndex = target.kind === "payment"
        ? history.findIndex(payment => payment.paymentId === target.id &&
            (payment.paymentSource === "advance" || payment.advanceReceiptId))
        : -1;
    const payment = history[paymentIndex];
    const receiptId = target.kind === "receipt" ? target.id : payment?.advanceReceiptId;
    const receiptIndex = receiptId ? receipts.findIndex(receipt => receipt.receiptId === receiptId) : -1;
    const receipt = receipts[receiptIndex];

    if ((target.kind === "payment" && !payment) ||
        (receiptId && !receipt) || (!payment && (!receipt || receipt.paymentId)) ||
        (payment?.advanceReceiptId && receipt?.paymentId !== payment.paymentId)) {
        throw new Error("The linked advance record could not be found. Reopen Customer Details and try again.");
    }

    const originalAmount = payment ? Math.round(paymentHistoryAmount(payment.amount) * 100) : 0;
    const amountPaise = changes ? Math.round(changes.amount * 100) : 0;
    const date = changes && normalizePaymentHistoryDate(changes.date);
    if (changes && (!date || date > getLocalPaymentDate() ||
        !Number.isSafeInteger(amountPaise) || amountPaise <= 0)) {
        throw new Error("Enter a valid date and an amount greater than zero.");
    }

    let updatedBill = null;
    let bill = null;

    if (payment) {
        const allocations = payment.allocations;
        if (!Array.isArray(allocations) || allocations.length !== 1 ||
            Math.round(paymentHistoryAmount(allocations[0].amount) * 100) !== originalAmount) {
            throw new Error("This entry does not have a single verified bill allocation.");
        }
        const allocation = allocations[0];
        const matches = customerBills.filter(item =>
            String(item.billNo) === String(allocation.billNo) &&
            String(item.date) === String(allocation.date)
        );
        if (matches.length !== 1) throw new Error("The linked bill could not be identified.");
        bill = matches[0];
        if (changes && (!normalizePaymentHistoryDate(bill.date) ||
            date < normalizePaymentHistoryDate(bill.date))) {
            throw new Error("The date cannot be earlier than the bill date.");
        }

        const newBillAmount = changes ? (receipt ? originalAmount : amountPaise) : 0;
        const delta = newBillAmount - originalAmount;
        const paid = Math.round(paymentHistoryAmount(bill.amountPaid) * 100) + delta;
        const due = Math.round(paymentHistoryAmount(bill.balanceDue) * 100) - delta;
        if (paid < 0 || due < 0) throw new Error("The new amount exceeds what can be applied to the linked bill.");
        if (delta) {
            updatedBill = { ...bill, amountPaid: paid / 100, balanceDue: due / 100,
                paymentStatus: due === 0 ? "Paid" : "Pending" };
        }

        if (changes) {
            history[paymentIndex] = {
                ...payment, date, amount: newBillAmount / 100,
                paymentMode: receipt ? changes.mode : "Advance",
                remarks: changes.remarks,
                allocations: [{ ...allocation, amount: newBillAmount / 100 }]
            };
        } else {
            history.splice(paymentIndex, 1);
        }
    }

    if (receipt) {
        if (changes) {
            const newAdvance = amountPaise - originalAmount;
            if (newAdvance <= 0) throw new Error("The full receipt must exceed the linked bill portion.");
            receipts[receiptIndex] = {
                ...receipt, date, amountPaise: newAdvance,
                paymentMode: changes.mode, remarks: changes.remarks
            };
        } else {
            receipts.splice(receiptIndex, 1);
        }
    }

    const nextCustomer = { ...customer, paymentHistory: history, advanceReceipts: receipts };
    const dates = new Set([...receipts, ...getAdvanceApplications(nextCustomer)].map(entry => entry.date));
    for (const date of dates) {
        const available = getAvailableAdvancePaise(nextCustomer, date);
        if (!Number.isSafeInteger(available) || available < 0) {
            throw new Error("This change would leave an advance application without enough funds. Edit or delete that application first.");
        }
    }
    return { customer: nextCustomer, bill, updatedBill };
}

function renderAdvanceHistory(customer) {
    const entries = [
        ...getAdvanceReceipts(customer).map(receipt => ({
            ...receipt,
            activity: receipt.paymentId ? "Advance received with bill payment" : "Advance received"
        })),
        ...getAdvanceApplications(customer).map(payment => ({
            ...payment,
            activity: "Applied to " + getPaymentAppliedTo(payment, customer.bills || []),
            amountPaise: -Math.round(payment.amount * 100)
        }))
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
        String(b.createdAt).localeCompare(String(a.createdAt)));

    document.getElementById("customerAvailableAdvance").textContent =
        formatCurrency(getAvailableAdvancePaise(customer) / 100);

    const body = document.getElementById("advanceHistoryBody");
    body.replaceChildren();

    if (!entries.length) {
        const cell = body.insertRow().insertCell();
        cell.colSpan = 6;
        cell.className = "text-center";
        cell.textContent = "No advance receipts recorded";
        return;
    }

    for (const receipt of entries) {
        const row = body.insertRow();
        for (const value of [
            formatDate(receipt.date),
            receipt.activity,
            formatCurrency(receipt.amountPaise / 100),
            receipt.paymentMode,
            receipt.remarks || "—"
        ]) {
            row.insertCell().textContent = value;
        }

        const actions = row.insertCell();
        const isReceipt = Boolean(receipt.receiptId);
        const id = isReceipt && !receipt.paymentId ? receipt.receiptId : receipt.paymentId;
        if (!id) continue;
        const target = { kind: isReceipt && !receipt.paymentId ? "receipt" : "payment", id };

        for (const [label, color, handler] of [
            ["Edit", "primary", () => openAdvanceEdit(target)],
            ["Delete", "danger", () => deleteAdvanceEntry(target)]
        ]) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "btn btn-sm btn-outline-" + color + " me-1";
            button.textContent = label;
            button.addEventListener("click", handler);
            actions.append(button);
        }
    }
}

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
const paymentTotals = getCustomerPaymentTotals(customer);

totalPaid = Number(
    paymentTotals.totalPaid.toFixed(2)
);

totalBalance = Number(
    paymentTotals.totalDue.toFixed(2)
);

totalPurchase = Number(
    totalPurchase.toFixed(2)
);


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

            const balanceSummaryRow =
    document.createElement("div");

balanceSummaryRow.id =
    "customerBalanceSummaryRow";

balanceSummaryRow.style.display = "grid";

balanceSummaryRow.style.gridTemplateColumns =
    "minmax(0, 3fr) minmax(0, 1fr)";

balanceSummaryRow.style.gap = "16px";

balanceSummaryRow.style.alignItems = "stretch";

summaryRow.insertAdjacentElement(
    "afterend",
    balanceSummaryRow
);

balanceSummaryRow.appendChild(openingCard);

openingCard.style.margin = "0";
openingCard.style.gridColumn = "auto";

const advanceCard = document.createElement("div");

advanceCard.id = "customerAdvanceSummary";

advanceCard.className =
    "customer-summary-card customer-summary-advance";

advanceCard.innerHTML = `
    <div class="customer-summary-icon">
        <i class="bi bi-wallet2"></i>
    </div>

    <div>
        <div class="customer-summary-title">
            Available Advance
        </div>

        <div
            id="customerAvailableAdvance"
            class="customer-summary-value"
        >
            —
        </div>
    </div>
`;

balanceSummaryRow.appendChild(advanceCard);

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

    renderAdvanceHistory(customer);
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
    document.getElementById("openingBalanceFields").style.display = "none";
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
        Number(customer.openingBalance) || 0;

    if (openingBalance > 0) {

        const customerBills =
            Array.isArray(customer.bills)
                ? customer.bills
                : [];

        // Total amount already paid against bills
        const paymentTotals = getCustomerPaymentTotals(customer);

const openingBalancePaid = paymentTotals.openingPaid;

const remainingOpeningBalance = paymentTotals.openingDue;

        const openingRow =
            document.createElement("tr");

        openingRow.className =
            "customer-opening-row";

        openingRow.innerHTML = `

            <td>
                <strong>OPENING BALANCE</strong>
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
                Rs.${openingBalancePaid.toFixed(2)}
            </td>

            <td>
                Rs.${remainingOpeningBalance.toFixed(2)}
            </td>

            <td>
                <span class="badge bg-warning text-dark">
                    Opening
                </span>
            </td>

        `;

        tbody.appendChild(openingRow);
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

    const sortedCustomerBills = [...customer.bills].sort((a, b) => {
    const getBookNo = bill =>
        parseInt(
            String(bill.billBookNo || "").match(/\d+/)?.[0] || "0",
            10
        );

    return getBookNo(a) - getBookNo(b);
});

sortedCustomerBills.forEach(
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
// ==========================================
// AUTOMATIC PAYMENT ALLOCATION LABEL
// ==========================================

function getPaymentAllocationRows(payment, customerBills) {
    if (payment.allocationType === "openingBalance") {
        return [{ label: "Opening Balance", amount: payment.amount }];
    }

    function billLabel(billNo, date) {
        const number = String(billNo ?? "").trim();
        if (!number) return "";

        const matches = customerBills.filter(bill =>
            String(bill.billNo ?? "").trim() === number &&
            (!date || String(bill.date ?? "") === String(date))
        );

        if (matches.length === 1) {
            const bookNo = String(matches[0].billBookNo ?? "").trim();
            if (bookNo && bookNo !== "-") return bookNo;
        }

        return `Bill ${number}`;
    }

    if (payment.allocations == null && payment.allocationType === "bill") {
        const label = billLabel(
            payment.allocationBillNo,
            payment.allocationBillDate
        );
        return [{ label: label || "Not recorded" }];
    }

    if (!Array.isArray(payment.allocations) || !payment.allocations.length) {
        return [{ label: "Not recorded" }];
    }

    const rows = [];
    let allocatedPaise = 0;

    for (const allocation of payment.allocations) {
        const label = billLabel(allocation?.billNo, allocation?.date);
        const paise = Math.round(Number(allocation?.amount) * 100);

        if (!label || !Number.isSafeInteger(paise) || paise <= 0) continue;

        rows.push({ label, amount: paise / 100 });
        allocatedPaise += paise;
    }

    if (!rows.length) return [{ label: "Not recorded" }];

    if (
        rows.length !== payment.allocations.length ||
        allocatedPaise !== Math.round(payment.amount * 100)
    ) {
        rows.push({ label: "Allocation incomplete" });
    }

    return rows;
}

function getPaymentAppliedTo(payment, customerBills) {
    const rows = getPaymentAllocationRows(payment, customerBills);
    if (rows.length === 1) return rows[0].label;

    return rows.map(({ label, amount }) =>
        amount == null
            ? label
            : `${label}: ₹${amount.toLocaleString("en-IN")}`
    ).join(" + ");
}
function togglePaymentDetails(button, payment, customerBills, paymentHistoryBody) {
    const row = button.closest("tr");
    const index = button.dataset.paymentIndex;
    const wasExpanded = button.getAttribute("aria-expanded") === "true";
    const openButton = paymentHistoryBody.querySelector(
        '.viewPaymentHistoryBtn[aria-expanded="true"]'
    );

    if (openButton) {
        openButton.setAttribute("aria-expanded", "false");
        openButton.removeAttribute("aria-controls");
        openButton.textContent = "View";
        openButton.closest("tr").classList.remove("payment-row-expanded");
    }

    paymentHistoryBody.querySelector(".payment-detail-row")?.remove();
    if (wasExpanded) return;

    const detailRow = document.createElement("tr");
    detailRow.className = "payment-detail-row";
    detailRow.id = `payment-detail-${index}`;

    const cell = detailRow.insertCell();
    cell.colSpan = row.cells.length;
    cell.innerHTML = `
        <section class="payment-inline-panel" aria-label="Payment Details">
            <h6>Payment Details</h6>
            <div class="payment-inline-grid">
                <div>
                    <div class="payment-inline-amount"></div>
                    <div class="payment-inline-date"></div>
                    <span class="badge bg-secondary payment-inline-mode"></span>
                </div>
                <div>
                    <strong>Applied To</strong>
                    <ul class="payment-inline-allocations"></ul>
                </div>
                <div>
                    <strong>Remarks</strong>
                    <div class="payment-inline-remarks"></div>
                </div>
            </div>
        </section>
    `;

    const money = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    });
    const amount = paymentHistoryAmount(payment.amount);
    const date = payment.date || payment.createdAt?.split("T")[0];

    cell.querySelector(".payment-inline-amount").textContent =
        money.format(amount);
    cell.querySelector(".payment-inline-date").textContent =
        date ? formatDate(date) : "—";
    cell.querySelector(".payment-inline-mode").textContent =
        payment.paymentMode || "Cash";
    cell.querySelector(".payment-inline-remarks").textContent =
        payment.remarks || "—";

    const list = cell.querySelector(".payment-inline-allocations");
    for (const { label, amount: allocatedAmount } of getPaymentAllocationRows(
        { ...payment, amount },
        customerBills
    )) {
        const item = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = label;
        item.append(name);

        if (allocatedAmount != null) {
            const value = document.createElement("strong");
            value.textContent = money.format(allocatedAmount);
            item.append(value);
        }

        list.append(item);
    }

    row.after(detailRow);
    row.classList.add("payment-row-expanded");
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-controls", detailRow.id);
    button.textContent = "Hide";
    detailRow.scrollIntoView({ block: "nearest" });
}

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
// ==========================================
// PAYMENT HISTORY - RUNNING BALANCE
// ==========================================

const money = value =>
    Number(
        String(value ?? 0).replace(/[^0-9.-]/g, "")
    ) || 0;

// Original purchases and opening balance
const totalStartingAmount =
    totalBillPurchase + openingBalance;

// Bill payments already recorded in amountPaid
const savedBillPaid = totalBillPaid;

// Explicit later bill payments are already included
// in amountPaid, so exclude them from starting paid.
const allocatedBillPayments = chronologicalPayments
    .filter(payment => payment.allocationType === "bill")
    .reduce(
        (sum, payment) => sum + money(payment.amount),
        0
    );

const paidAtPurchase = Math.max(
    0,
    savedBillPaid - allocatedBillPayments
);

// Starting balance before the listed payments
let runningBalance = Math.max(
    0,
    totalStartingAmount - paidAtPurchase
);

let runningPaid = paidAtPurchase;

const calculatedPayments = chronologicalPayments.map(payment => {

    const amount = money(payment.amount);

    runningPaid = Number(
        (runningPaid + amount).toFixed(2)
    );

    runningBalance = Number(
        Math.max(0, runningBalance - amount).toFixed(2)
    );

    return {
        ...payment,
        amount,
        totalPaid: runningPaid,
        balanceDue: runningBalance,
        historyIndex: customer.paymentHistory.indexOf(payment)
    };

});


// ==========================================
// SHOW NEWEST PAYMENT FIRST
// ==========================================

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
                <td class="payment-applied-to"></td>
                <td>${payment.remarks || "-"}</td>
                <td class="payment-history-actions">
                    <div class="d-inline-flex flex-nowrap align-items-center gap-1">
                                               <button type="button"
                                class="btn btn-sm btn-outline-info viewPaymentHistoryBtn"
                                data-payment-index="${payment.historyIndex}"
                                aria-expanded="false">View</button>
                        <button type="button"
                                class="btn btn-sm btn-outline-primary editPaymentHistoryBtn"
                                data-payment-index="${payment.historyIndex}">Edit</button>
                        <button type="button"
                                class="btn btn-sm btn-outline-danger deletePaymentHistoryBtn"
                                data-payment-index="${payment.historyIndex}">Delete</button>
                    </div>
                </td>
            `;

            row.querySelector(".payment-applied-to").textContent =
                getPaymentAppliedTo(payment, customerBills);

            const viewButton = row.querySelector(".viewPaymentHistoryBtn");
            viewButton.addEventListener("click", () => {
                togglePaymentDetails(viewButton, payment, customerBills, tbody);
            });

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

            if (Array.isArray(payment.allocations)) {
    payment.allocations.forEach(allocation => {
        const bill = customerBills.find(item =>
            String(item.billNo || "") === String(allocation.billNo || "") &&
            String(item.date || "") === String(allocation.date || "")
        );

        reverseFromBill(
            bill,
            paymentHistoryAmount(allocation.amount)
        );
    });
    return;
}

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

            if (Array.isArray(payment.allocations)) {
    payment.allocations.forEach(allocation => {
        const bill = customerBills.find(item =>
            String(item.billNo || "") === String(allocation.billNo || "") &&
            String(item.date || "") === String(allocation.date || "")
        );

        applyToBill(
            bill,
            paymentHistoryAmount(allocation.amount)
        );
    });
    return;
}

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
let editingAdvanceTarget = null;

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

function openAdvanceEdit(target) {
    const history = currentCustomer?.paymentHistory || [];
    const payment = target.kind === "payment" && history.find(item => item.paymentId === target.id);
    const receipt = getAdvanceReceipts(currentCustomer || {}).find(item =>
        item.receiptId === (target.kind === "receipt" ? target.id : payment?.advanceReceiptId)
    );
    const entry = payment || receipt;
    if (!entry) return;

    editingPaymentIndex = -1;
    editingAdvanceTarget = target;
    paymentEditDate.value = normalizePaymentHistoryDate(entry.date) || "";
    paymentEditAmount.value = (
        (payment ? paymentHistoryAmount(payment.amount) : 0) +
        (receipt ? receipt.amountPaise / 100 : 0)
    ).toFixed(2);
    paymentEditMode.disabled = Boolean(payment?.paymentSource === "advance");
    paymentEditMode.value = receipt?.paymentMode || payment?.paymentMode || "Cash";
    paymentEditRemarks.value = entry.remarks || "";
    document.getElementById("advanceEditHint").textContent = payment && receipt
        ? "Enter the full receipt. The amount paid to the bill stays the same."
        : payment ? "Changes update this bill and available advance." : "Changes update the cash receipt and available advance.";
    paymentHistoryEditForm.style.display = "block";
    paymentHistoryEditForm.scrollIntoView({ block: "nearest" });
    paymentEditAmount.focus();
}

async function saveAdvanceChange(target, changes) {
    if (!currentCustomer || paymentSaveInProgress) return;
    paymentSaveInProgress = true;
    const identity = currentCustomer;
    try {
        if (!paymentCloudSyncPending) {
            await refreshDatabase();
            const customer = db.customers.find(item => identity.customerId
                ? String(item.customerId) === String(identity.customerId)
                : item.name === identity.name && item.mobile === identity.mobile);
            if (!customer) throw new Error("Customer record was not found.");
            const plan = planAdvanceEdit(customer, getCustomerBillsForPaymentHistory(customer), target, changes);
            const next = {
                ...db,
                customers: db.customers.map(item => item === customer ? plan.customer : item),
                bills: plan.updatedBill ? bills.map(bill => bill === plan.bill ? plan.updatedBill : bill) : bills
            };
            await window.api.saveDatabase(next);
            db = next;
            bills = next.bills;
            paymentCloudSyncPending = true;
            pendingPaymentConfirmation = changes ? "Advance entry updated." : "Advance entry deleted.";
        }

        await syncPaymentCollections();
        paymentCloudSyncPending = false;
        sessionStorage.setItem("svssPendingPaymentNotice", pendingPaymentConfirmation);
        window.location.reload();
    } catch (error) {
        showToast(paymentCloudSyncPending
            ? "Saved locally. Repeat the action to retry cloud sync without saving it twice."
            : error.message, "error");
    } finally {
        paymentSaveInProgress = false;
    }
}

async function deleteAdvanceEntry(target) {
    if (!paymentCloudSyncPending && !window.confirm(
        "Delete this advance entry and update any linked bill balance?"
    )) return;
    await saveAdvanceChange(target, null);
}

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
    if (payment.paymentSource === "advance" || payment.advanceReceiptId) {
        const target = { kind: "payment", id: payment.paymentId };
        if (button.classList.contains("editPaymentHistoryBtn")) {
            openAdvanceEdit(target);
        } else {
            await deleteAdvanceEntry(target);
        }
        return;
    }

    if (button.classList.contains("editPaymentHistoryBtn")) {
        editingAdvanceTarget = null;
        document.getElementById("advanceEditHint").textContent = "";
        paymentEditMode.disabled = false;
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
        editingAdvanceTarget = null;
        paymentHistoryEditForm.style.display = "none";
    });

document
    .getElementById("savePaymentEdit")
    ?.addEventListener("click", async () => {
        if (editingAdvanceTarget) {
            await saveAdvanceChange(editingAdvanceTarget, {
                date: paymentEditDate.value,
                amount: parseAmountInput(paymentEditAmount.value),
                mode: paymentEditMode.value || "Cash",
                remarks: paymentEditRemarks.value.trim()
            });
            return;
        }

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

    const paymentTotals = getCustomerPaymentTotals({
        ...customer,
        bills: customerBills
    });

    return paymentTotals.openingDue;
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

    const splitsToAdvance = selectedRadio?.value === "billAndAdvance";
    if (selectedRadio?.value === "advance" || splitsToAdvance) {
        amountInput.removeAttribute("max");
    } else {
        amountInput.max = selectedRadio?.value === "useAdvance"
            ? (Math.min(billAmount, Math.max(0, getAvailableAdvancePaise(currentCustomer) / 100))).toFixed(2)
            : selectedBalance.toFixed(2);
    }

    document.getElementById("payAdvanceCard")
        .classList.toggle("is-selected", selectedRadio?.value === "advance");


    document.getElementById("payOpeningCard")
        ?.classList.toggle("is-selected", openingRadio.checked);

    document.getElementById("payBillCard")
        ?.classList.toggle("is-selected", billRadio.checked || splitsToAdvance);
    document.getElementById("payBillAndAdvanceCard")
        .classList.toggle("is-selected", splitsToAdvance);

    document.getElementById("payMode").disabled = selectedRadio?.value === "useAdvance";

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
        if (!document.getElementById("payFromAdvance").checked &&
            !document.getElementById("payBillAndAdvance").checked) {
            document.getElementById("payToBill").checked = true;
        }
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
               `Book No: ${bill.billBookNo || "-"} · ` +
               `${formatDate(bill.date)} · ` +
               `${formatCurrency(balance)} remaining` +
               ` · ${bill.billNo || "Bill"}`;

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

        document.getElementById("payToAdvance").checked = false;
        const splitRadio = document.getElementById("payBillAndAdvance");
        splitRadio.checked = false;
        splitRadio.disabled = unpaidBills.length === 0;
        const useAdvance = document.getElementById("payFromAdvance");
        useAdvance.checked = false;
        useAdvance.disabled = unpaidBills.length === 0 ||
            getAvailableAdvancePaise(currentCustomer) <= 0;
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
            getLocalPaymentDate();

        document.getElementById("payMode").selectedIndex = 0;
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

async function completeReceivedPayment(confirmation, button) {
    const result = await window.api.saveDatabase(db);
    if (result?.success === false || result?.localSaved === false) {
        throw new Error(result.error || "The payment could not be saved locally.");
    }

    if (window.api.isBrowser) {
        paymentCloudSyncPending = true;
        pendingPaymentConfirmation = confirmation;
        button.textContent = "Saved locally. Syncing…";
        await syncPaymentCollections();
        paymentCloudSyncPending = false;
    } else if (result?.cloudPending) {
        confirmation += " Cloud sync continues in the background.";
    }

    sessionStorage.setItem("svssPendingPaymentNotice", confirmation);
    window.location.reload();
}

document
    .getElementById("savePayment")
    .addEventListener("click", async function () {

        if (!currentCustomer || paymentSaveInProgress) return;

        const originalLabel = this.innerHTML;
        let completed = false;
        paymentSaveInProgress = true;
        this.disabled = true;
        this.setAttribute("aria-busy", "true");
        this.textContent = paymentCloudSyncPending ? "Retrying cloud sync…" : "Saving payment…";

        // Retry only the existing saved records, never add the receipt twice.
        if (paymentCloudSyncPending) {
            try {
                await syncPaymentCollections();
                paymentCloudSyncPending = false;
                sessionStorage.setItem("svssPendingPaymentNotice", pendingPaymentConfirmation);
                completed = true;
                window.location.reload();
            } catch (syncError) {
                console.error("Payment cloud sync retry failed.", syncError);
                showToast(
                    "Cloud sync failed again. The payment is saved locally; click Retry Cloud Sync when connected. Do not enter it again.",
                    "error"
                );
            } finally {
                if (!completed) {
                    paymentSaveInProgress = false;
                    this.disabled = false;
                    this.removeAttribute("aria-busy");
                    this.textContent = "Retry Cloud Sync";
                }
            }
            return;
        }

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
        advanceReceipts: getAdvanceReceipts(currentCustomer),
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

const paymentTarget =
    document.querySelector('input[name="paymentAllocation"]:checked')?.value;
const usesAdvance = paymentTarget === "useAdvance";
const splitsToAdvance = paymentTarget === "billAndAdvance";
const allocationType = usesAdvance || splitsToAdvance ? "bill" : paymentTarget;

if (allocationType === "advance") {
    const amountPaise = Math.round(requestedAmount * 100);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        showToast("Enter a valid advance amount.", "error");
        return;
    }

    const receipts = getAdvanceReceipts(paymentCustomer);
    const balancePaise = receipts.reduce((total, receipt) =>
        total + receipt.amountPaise, 0
    );
    if (!Number.isSafeInteger(balancePaise + amountPaise)) {
        showToast("The advance balance exceeds the supported amount.", "error");
        return;
    }

    paymentCustomer.advanceReceipts = [...receipts, {
        receiptId: "ADV-" + globalThis.crypto.randomUUID(),
        date: paymentDate,
        createdAt: new Date().toISOString(),
        amountPaise,
        paymentMode,
        remarks
    }];

    await completeReceivedPayment(
        "Advance received: " + formatCurrency(amountPaise / 100),
        this
    );
    completed = true;
    return;
}

if (!allocationType) {
    showToast("Select a target for this payment.", "error");
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

const split = splitsToAdvance
    ? getBillAndAdvanceSplit(requestedAmount, targetBalance)
    : null;
if (splitsToAdvance) {
    if (!split) {
        showToast("Enter more than the selected bill balance for a bill and advance split.", "error");
        return;
    }
    const billDate = normalizePaymentHistoryDate(selectedBill.date);
    if (!billDate || paymentDate < billDate || paymentDate > getLocalPaymentDate()) {
        showToast("Choose a payment date from the bill date through today.", "error");
        return;
    }
    if (!Number.isSafeInteger(getAvailableAdvancePaise(paymentCustomer) + split.advancePaise)) {
        showToast("The resulting advance exceeds the supported amount.", "error");
        return;
    }
}
const appliedPaymentAmount = split?.billAmount ?? requestedAmount;

if (usesAdvance) {
    const amountPaise = Math.round(requestedAmount * 100);
    const billPaise = Math.round(targetBalance * 100);
    const advancePaise = Math.min(
        getAvailableAdvancePaise(paymentCustomer),
        getAvailableAdvancePaise(paymentCustomer, paymentDate)
    );

    const billDate = normalizePaymentHistoryDate(selectedBill.date);
    const localDate = getLocalPaymentDate();

    if (paymentDate !== localDate || !billDate || paymentDate < billDate) {
        showToast("Use today's date on a bill dated today or earlier.", "error");
        return;
    }
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0 ||
        amountPaise > billPaise || amountPaise > advancePaise) {
        showToast("Advance applied cannot exceed the bill balance or available advance.", "error");
        return;
    }
}

if (appliedPaymentAmount > currentBalance + 0.009) {
    showToast(
        `Payment cannot be greater than the total balance due. ${formatCurrency(currentBalance)}`,
        "error"
    );
    return;
}

const availableForAllocation =
    allocationType === "bill"
        ? billBalance
        : openingRemaining;

if (appliedPaymentAmount > availableForAllocation + 0.009) {
    showToast(
        `Payment cannot be greater than the available balance. ${formatCurrency(availableForAllocation)}`,
        "error"
    );
    return;
}

// Apply this payment only to the selected bill.
// Opening balance payments are recorded in paymentHistory and do not
// change any bill's amountPaid or balanceDue.
// ==========================================
// ALLOCATE PAYMENT ACROSS UNPAID BILLS
// ==========================================

let paymentAllocations = [];

if (allocationType === "bill") {

    let remaining = Number(appliedPaymentAmount.toFixed(2));

    // Selected bill gets priority.
    const allocationOrder = usesAdvance || splitsToAdvance
        ? [selectedBill]
        : [selectedBill, ...customerBills.filter(bill => bill !== selectedBill)];

    for (const bill of allocationOrder) {

        if (remaining <= 0.009) break;

        const due = Number(bill.balanceDue) || 0;

        if (due <= 0) continue;

        const applied = Math.min(due, remaining);

        bill.amountPaid = Number(
            ((Number(bill.amountPaid) || 0) + applied).toFixed(2)
        );

        bill.balanceDue = Number(
            (due - applied).toFixed(2)
        );

        bill.paymentStatus =
            bill.balanceDue <= 0.009 ? "Paid" : "Pending";

        paymentAllocations.push({
            billNo: bill.billNo,
            date: bill.date,
            amount: Number(applied.toFixed(2))
        });

        remaining = Number(
            (remaining - applied).toFixed(2)
        );
    }

    if (remaining > 0.009) {
        throw new Error(
            "Payment could not be fully allocated to unpaid bills."
        );
    }
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

if (split) dbCustomer = paymentCustomer;

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
            appliedPaymentAmount
        ).toFixed(2)
    );


// ==========================================
// CALCULATE BALANCE AFTER PAYMENT
// ==========================================

const currentBalanceAfterPayment =
    Number(
        (
            Number(currentBalance || 0) -
            appliedPaymentAmount
        ).toFixed(2)
    );

// ==========================================
// CREATE PAYMENT RECORD
// ==========================================

const splitReceiptId = split ? "ADV-" + globalThis.crypto.randomUUID() : null;
const paymentRecord = {

    paymentId:
        "PAY-" + Date.now(),

    date:
        paymentDate,

    createdAt:
        new Date().toISOString(),

    amount:
        Number(
            appliedPaymentAmount.toFixed(2)
        ),

    totalPaid:
        newTotalPaid,

    balanceDue:
        Math.max(
            0,
            currentBalanceAfterPayment
        ),

    paymentMode:
        usesAdvance ? "Advance" : (paymentMode || "Cash"),
    ...(usesAdvance ? { paymentSource: "advance" } : {}),
    ...(split ? { advanceReceiptId: splitReceiptId } : {}),

    allocationType,
    allocations:
    allocationType === "bill" ? paymentAllocations : [],
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

if (split) {
    dbCustomer.advanceReceipts = [...getAdvanceReceipts(dbCustomer), {
        receiptId: splitReceiptId,
        paymentId: paymentRecord.paymentId,
        date: paymentDate,
        createdAt: paymentRecord.createdAt,
        amountPaise: split.advancePaise,
        paymentMode,
        remarks
    }];
}
dbCustomer.paymentHistory.push(paymentRecord);
        // ==========================================
        // SAVE DATABASE + CLOUD SYNC
        // ==========================================
        
        db.bills = bills;
        
        const receivedAmount = formatCurrency(requestedAmount);
        const confirmation = split
            ? "Bill paid: " + formatCurrency(split.billAmount) + " · Advance received: " + formatCurrency(split.advancePaise / 100)
            : usesAdvance ? "Advance applied: " + receivedAmount : "Amount credited: " + receivedAmount;

        await completeReceivedPayment(confirmation, this);
        completed = true;
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
            if (!completed) {
                paymentSaveInProgress = false;
                this.disabled = false;
                this.removeAttribute("aria-busy");
                if (!paymentCloudSyncPending) this.innerHTML = originalLabel;
            }
        }

    });
    // ==========================================
    // Print Customer Statement
    // ==========================================
    // ==========================================
    // Print Customer Statement
    // ==========================================

function getStatementAdvanceEntries(customer, customerBills) {
    const history = Array.isArray(customer.paymentHistory) ? customer.paymentHistory : [];
    const linkedPayments = new Map(history.filter(payment => payment.advanceReceiptId)
        .map(payment => [payment.advanceReceiptId, payment]));
    const entries = getAdvanceReceipts(customer).map(receipt => {
        const billPayment = linkedPayments.get(receipt.receiptId);
        return {
            date: receipt.date,
            createdAt: receipt.createdAt,
            description: billPayment
                ? "Advance portion of split receipt"
                : "Advance received (" + (receipt.paymentMode || "Cash") + ")",
            receivedPaise: receipt.amountPaise,
            appliedPaise: 0,
            receiptTotalPaise: billPayment
                ? receipt.amountPaise + Math.round(paymentHistoryAmount(billPayment.amount) * 100)
                : receipt.amountPaise
        };
    });

    for (const payment of getAdvanceApplications(customer)) {
        entries.push({
            date: payment.date,
            createdAt: payment.createdAt,
            description: "Applied to " + getPaymentAppliedTo(payment, customerBills),
            receivedPaise: 0,
            appliedPaise: Math.round(paymentHistoryAmount(payment.amount) * 100),
            receiptTotalPaise: 0
        });
    }

    let balancePaise = 0;
    return entries.sort((a, b) =>
        getPaymentHistoryTimestamp(a) - getPaymentHistoryTimestamp(b) ||
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
    ).map(entry => {
        balancePaise += entry.receivedPaise - entry.appliedPaise;
        return { ...entry, balancePaise };
    });
}

function getStatementPaymentDescription(payment, customerBills, formatMoney) {
    const mode = payment.paymentMode || payment.mode || "Cash";
    const heading = payment.paymentSource === "advance"
        ? "Advance applied"
        : payment.advanceReceiptId
            ? "Bill portion of split receipt (" + mode + ")"
            : "Payment received (" + mode + ")";

    if (payment.allocationType === "openingBalance") {
        return heading + "\nApplied to Opening Balance";
    }
    if (payment.allocationType !== "bill" && !Array.isArray(payment.allocations)) {
        return heading;
    }

    const allocations = getPaymentAllocationRows(payment, customerBills);
    const details = allocations.map(({ label, amount }) => amount == null
        ? label
        : label + ": " + formatMoney(amount));
    return [heading, ...details].join("\n");
}

function getStatementDeferredAllocations(payments, customerBills) {
    const byPayment = new Map();
    const byBill = new Map();

    for (const payment of payments) {
        if (payment.allocationType !== "bill" || !Array.isArray(payment.allocations)) continue;
        const paidDate = normalizePaymentHistoryDate(
            payment.date || payment.paymentDate || payment.createdAt?.split("T")[0]
        );
        if (!paidDate) continue;

        const amounts = new Map();
        let allocatedPaise = 0;
        for (const allocation of payment.allocations) {
            const paise = Math.round(paymentHistoryAmount(allocation?.amount) * 100);
            allocatedPaise += paise;
            if (paise <= 0 || !allocation?.billNo || !allocation.date) continue;

            const matches = customerBills.filter(bill =>
                String(bill.billNo) === String(allocation.billNo) &&
                String(bill.date) === String(allocation.date)
            );
            if (matches.length !== 1) continue;
            const bill = matches[0];
            const billDate = normalizePaymentHistoryDate(bill.date);
            if (billDate && billDate > paidDate) {
                amounts.set(bill, (amounts.get(bill) || 0) + paise);
            }
        }
        const receiptPaise = Math.round(paymentHistoryAmount(payment.amount) * 100);
        if (!amounts.size || !Number.isSafeInteger(receiptPaise) ||
            allocatedPaise !== receiptPaise) continue;

        let deferredPaise = 0;
        for (const [bill, amountPaise] of amounts) {
            byBill.set(bill, (byBill.get(bill) || 0) + amountPaise);
            deferredPaise += amountPaise;
        }
        byPayment.set(payment, deferredPaise);
    }
    return { byPayment, byBill };
}

function getStatementBillAllocation(payment, bill) {
    if (payment.allocationType !== "bill") return 0;
    const sameBill = (number, date) =>
        String(number ?? "") === String(bill.billNo ?? "") &&
        (!date || String(date) === String(bill.date ?? ""));
    if (Array.isArray(payment.allocations)) {
        return payment.allocations.reduce((sum, allocation) =>
            sum + (sameBill(allocation.billNo, allocation.date)
                ? paymentHistoryAmount(allocation.amount) : 0), 0);
    }
    return sameBill(payment.allocationBillNo, payment.allocationBillDate)
        ? paymentHistoryAmount(payment.amount) : 0;
}

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
// Payments already stored in bills must not be counted twice.
const statementOpeningPaid = Math.min(
    openingBalance,
    statementPayments
        .filter(payment =>
            payment.allocationType === "openingBalance"
        )
        .reduce(
            (total, payment) =>
                total + (Number(payment.amount) || 0),
            0
        )
);

const statementRemainingOpening = Math.max(
    openingBalance - statementOpeningPaid,
    0
);

statementTotalPaid = Number(
    (statementBillPaid + statementOpeningPaid).toFixed(2)
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

const sortedStatementBills = [...statementBills].sort((a, b) => {
    const getBookNo = bill =>
        parseInt(
            String(bill.billBookNo || "").match(/\d+/)?.[0] || "0",
            10
        );

    return getBookNo(a) - getBookNo(b);
});

sortedStatementBills.forEach((bill, index) => {

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
const deferredAllocations = getStatementDeferredAllocations(paymentHistory, statementBills);

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

    const laterBillPayments = paymentHistory.reduce(
        (sum, payment) => sum + getStatementBillAllocation(payment, bill), 0
    );

const paidAtPurchase = Math.max(
    0,
    statementNumber(bill.amountPaid) - laterBillPayments
);

const fromEarlierReceipts = (deferredAllocations.byBill.get(bill) || 0) / 100;
movementItems.push({
    date: bill.date || "",
    description: "Bill " + (bill.billNo || "-") +
        (bill.billBookNo ? " (Book " + bill.billBookNo + ")" : "") +
        (fromEarlierReceipts
            ? "\nFrom earlier receipt: " + formatStatementMoney(fromEarlierReceipts)
            : ""),
    charge: total,
    payment: paidAtPurchase + fromEarlierReceipts,
    order: movementOrder++
});
});

paymentHistory.forEach(payment => {

    const allocatedPayment =
        payment.allocationType === "openingBalance" ||
        payment.allocationType === "bill";

    const receivedAmount = statementNumber(payment.amount ?? payment.payment);
    const deferredAmount = (deferredAllocations.byPayment.get(payment) || 0) / 100;
    const description = getStatementPaymentDescription(payment, statementBills, formatStatementMoney);
    movementItems.push({
        date: payment.date || payment.paymentDate || payment.createdAt || "",
        description: deferredAmount
            ? description + "\nFull receipt: " + formatStatementMoney(receivedAmount) +
                "\nLater allocation shown on bill row."
            : description,
        charge: 0,
        payment: allocatedPayment ? receivedAmount - deferredAmount : 0,
        remarks: String(payment.remarks || "").trim() || "-",
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
        item.remarks || "-",
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
    head: [[
    "Date",
    "Description",
    "Charge",
    "Payment",
    "Remarks",
    "Balance"
]],
body: movementRows.length
    ? movementRows
    : [["-", "No transactions", "-", "-", "-", "-"]],
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
    0: { cellWidth: 22, halign: "center" },
    1: { cellWidth: 54 },
    2: { cellWidth: 26, halign: "right" },
    3: { cellWidth: 26, halign: "right" },
    4: { cellWidth: 24, halign: "center" },
    5: { cellWidth: 30, halign: "right", fontStyle: "bold" }
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


const advanceEntries = getStatementAdvanceEntries(latestCustomer, statementBills);
if (advanceEntries.length) {
    if (y + 40 > pageHeight - 18) {
        doc.addPage();
        drawPageBorder();
        y = 20;
    }

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("ADVANCE ACTIVITY", 14, y);

    const advanceMoney = paise => paise
        ? formatStatementMoney(paise / 100)
        : "-";

    doc.autoTable({
        startY: y + 4,
        head: [["Date", "Activity", "Full Receipt", "Added to Advance", "Applied to Bills", "Available Advance"]],
        body: advanceEntries.map(entry => [
            formatDate(entry.date),
            entry.description,
            advanceMoney(entry.receiptTotalPaise),
            advanceMoney(entry.receivedPaise),
            advanceMoney(entry.appliedPaise),
            formatStatementMoney(entry.balancePaise / 100)
        ]),
        margin: { left: 14, right: 14, bottom: 18 },
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2, valign: "middle" },
        headStyles: { fillColor: [244, 180, 0], textColor: [31, 41, 55] },
        columnStyles: {
            0: { cellWidth: 22 }, 1: { cellWidth: 43 },
            2: { cellWidth: 27, halign: "right" },
            3: { cellWidth: 30, halign: "right" },
            4: { cellWidth: 28, halign: "right" },
            5: { cellWidth: 32, halign: "right", fontStyle: "bold" }
        },
        didDrawPage: drawPageBorder
    });
    y = doc.lastAutoTable.finalY + 10;
}

// ======================================
// ACCOUNT SUMMARY
// ======================================

// Check page space

const requiredHeight = 81;

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

summaryRow(
    "Available Advance",
    formatStatementMoney(getAvailableAdvancePaise(latestCustomer) / 100)
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

