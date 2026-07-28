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

        };

        await db.write();

    }

}

module.exports = {

    db,

    initDB

};