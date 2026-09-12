const { app } = require("electron");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const fs = require("fs");
const path = require("path");

// ======================================
// DATABASE LOCATION
// ======================================

const userDataPath = app.getPath("userData");

const databaseFolder = path.join(userDataPath, "database");

if (!fs.existsSync(databaseFolder)) {

    fs.mkdirSync(databaseFolder, { recursive: true });

}

const file = path.join(databaseFolder, "database.json");

// ======================================
// LOWDB
// ======================================

const adapter = new JSONFile(file);

const db = new Low(adapter, {

    products: [],

    customers: [],

    bills: [],

    // Product Master
    categories: [],

    masterProducts: [],


    settings: {

        shopName: "Sri Venkata Siva Sai Cloth & Matching Center",

        ownerName: "",

        shopMobile: "",

        shopGST: "",

        shopAddress: "",

        username: "admin",

        password: "admin123",

        loggedIn: false,

        loggedUser: "",

        themeColor: "blue",

        fontSize: "medium",

        darkMode: false,

        currency: "₹",

        dateFormat: "dd-mm-yyyy",

        invoicePrefix: "SVSS",

        nextBillNo: 1

    }

});

// ======================================
// INITIALIZE DATABASE
// ======================================

async function initDB() {

    await db.read();
    if (!db.data) {

    db.data = {

        products: [],

        customers: [],

        bills: [],

        categories: [],

        masterProducts: [],
        syncMeta: {

    businessSettings: {
        lastCloudUpdatedAt: null,
        localUpdatedAt: null,
        pendingSync: false
    },

    categories: {
        lastCloudUpdatedAt: null,
        localUpdatedAt: null,
        pendingSync: false
    },

    masterProducts: {
        lastCloudUpdatedAt: null,
        localUpdatedAt: null,
        pendingSync: false
    },

    products: {
        lastCloudUpdatedAt: null,
        localUpdatedAt: null,
        pendingSync: false
    },

    customers: {
        lastCloudUpdatedAt: null,
        localUpdatedAt: null,
        pendingSync: false
    },

    bills: {
        lastCloudUpdatedAt: null,
        localUpdatedAt: null,
        pendingSync: false
    }

},
        settings: {

            shopName: "Sri Venkata Siva Sai Cloth & Matching Center",

            ownerName: "",

            shopMobile: "",

            shopGST: "",

            shopAddress: "",

            username: "admin",

            password: "admin123",

            rememberMe: false,

            savedUsername: "",

            savedPassword: "",

            loggedIn: false,

            loggedUser: "",

            themeColor: "blue",

            fontSize: "medium",

            darkMode: false,

            currency: "₹",

            dateFormat: "dd-mm-yyyy",

            invoicePrefix: "SVSS",

            nextBillNo: 1,

            nextBillBookNo: 1

        }

    };
// ======================================
// MIGRATE PRODUCTS TO MASTER PRODUCTS
// ======================================

if (
    (!db.data.masterProducts || db.data.masterProducts.length === 0) &&
    db.data.products &&
    db.data.products.length > 0
) {

    db.data.masterProducts = [];

    db.data.products.forEach(product => {

        db.data.masterProducts.push({

            id: Date.now().toString() + Math.random(),

            category: product.category || "",

            name: product.productName || product.name || "",

            unit: product.unit || "Piece",

            hsnCode: product.hsnCode || "",

            cgst: Number(product.cgst || 0),

            sgst: Number(product.sgst || 0)

        });

    });

    console.log(
        "Migrated",
        db.data.masterProducts.length,
        "products to Product Master."
    );

}

    await db.write();

}
if (!db.data.products)
    db.data.products = [];

if (!db.data.customers)
    db.data.customers = [];

if (!db.data.bills)
    db.data.bills = [];

if (!db.data.categories)
    db.data.categories = [];

if (!db.data.masterProducts)
    db.data.masterProducts = [];
// ======================================
// CLOUD SYNC METADATA
// ======================================

if (!db.data.syncMeta) {

    db.data.syncMeta = {};

}

const syncCollections = [
    "businessSettings",
    "categories",
    "masterProducts",
    "products",
    "customers",
    "bills"
];

syncCollections.forEach(collection => {

    if (!db.data.syncMeta[collection]) {

        db.data.syncMeta[collection] = {
            lastCloudUpdatedAt: null,
            localUpdatedAt: null,
            pendingSync: false
        };

    } else {

        // --------------------------------------
        // MIGRATE EXISTING SYNC METADATA
        // --------------------------------------

        if (!Object.prototype.hasOwnProperty.call(
            db.data.syncMeta[collection],
            "lastCloudUpdatedAt"
        )) {

            db.data.syncMeta[collection].lastCloudUpdatedAt = null;

        }

        if (!Object.prototype.hasOwnProperty.call(
            db.data.syncMeta[collection],
            "localUpdatedAt"
        )) {

            db.data.syncMeta[collection].localUpdatedAt = null;

        }

        if (!Object.prototype.hasOwnProperty.call(
            db.data.syncMeta[collection],
            "pendingSync"
        )) {

            db.data.syncMeta[collection].pendingSync = false;

        }

    }

});
// ======================================
// CUSTOMER PAYMENT HISTORY
// ======================================

if (!db.data.customers) {
    db.data.customers = [];
}

// Make sure every customer has a payments array
db.data.customers.forEach(customer => {

    if (!Array.isArray(customer.payments)) {
        customer.payments = [];
    }

});
// Save database after migration
await db.write();
// ======================================
// PRODUCT MASTER TABLES
// ======================================

if (!db.data.categories) {

    db.data.categories = [];

}

if (!db.data.masterProducts) {

    db.data.masterProducts = [];

}
// ======================================
// MIGRATE EXISTING PRODUCTS TO PRODUCT MASTER
// ======================================

const existingProducts = db.data.products || [];

// ---------- Categories ----------

existingProducts.forEach(product => {

    const category = (product.category || "").trim();

    if (!category) return;

    const exists = db.data.categories.find(c =>

        c.name.toLowerCase() === category.toLowerCase()

    );

    if (!exists) {

        db.data.categories.push({

            id: Date.now().toString() + Math.random(),

            name: category

        });

    }

});

// ---------- Master Products ----------

existingProducts.forEach(product => {

    const productName = (product.productName || "").trim();

    if (!productName) return;

    const exists = db.data.masterProducts.find(p =>

        p.name.toLowerCase() === productName.toLowerCase()

    );

    if (!exists) {

        db.data.masterProducts.push({

            id: Date.now().toString() + Math.random(),

            category: product.category || "",

            name: product.productName || ""

        });

    }

});

await db.write();
    // ======================================
// FIX OLD GST / MOBILE DATA
// ======================================

const gstRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;

(db.data.bills || []).forEach(bill => {

    const value = (bill.mobile || "").trim();

    if (gstRegex.test(value)) {

        bill.gst = value;

        bill.mobile = "";

    }

});

(db.data.customers || []).forEach(customer => {

    const value = (customer.mobile || "").trim();

    if (gstRegex.test(value)) {

        customer.gst = value;

        customer.mobile = "";

    }

});

await db.write();
// ======================================
// UPDATE OLD BILLS (OPTIONAL)
// ======================================

db.data.bills = (db.data.bills || []).map(bill => ({

    cgstTotal: bill.cgstTotal || "₹0.00",

    sgstTotal: bill.sgstTotal || "₹0.00",

    amountWords: bill.amountWords || "",

    billBookNo: bill.billBookNo || "",

    amountPaid: bill.amountPaid || 0,

    balanceDue: bill.balanceDue || 0,

    paymentStatus: bill.paymentStatus || "Paid",

    ...bill

}));

}
// ======================================
// MARK LOCAL DATA AS MODIFIED
// ======================================

async function markLocalModified(collection) {

    await db.read();

    if (!db.data.syncMeta) {
        db.data.syncMeta = {};
    }

    if (!db.data.syncMeta[collection]) {

        db.data.syncMeta[collection] = {
            lastCloudUpdatedAt: null,
            localUpdatedAt: null,
            pendingSync: false
        };

    }

    db.data.syncMeta[collection].localUpdatedAt =
        new Date().toISOString();

    db.data.syncMeta[collection].pendingSync = true;

    await db.write();

}
module.exports = {

    db,

    initDB,

    markLocalModified

};