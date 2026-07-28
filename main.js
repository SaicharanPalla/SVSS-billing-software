const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

app.on("activate", () => {

    if (BrowserWindow.getAllWindows().length === 0) {

        createWindow();

    }

});

// ======================================
// APP VERSION
// ======================================

ipcMain.handle("get-app-version", () => {
    return app.getVersion();
});

const { db, initDB } = require("./database");

let win;

// ======================================
// CREATE WINDOW
// ======================================

async function createWindow() {

    await initDB();

    win = new BrowserWindow({

        width: 1400,
        height: 900,

        show: false,

        webPreferences: {

            preload: path.join(__dirname, "preload.js"),

            contextIsolation: true,

            nodeIntegration: false

        }

    });

    win.loadFile("login.html");

    win.once("ready-to-show", () => {

        win.show();

        win.focus();

    });

    // For Development Only
    // win.webContents.openDevTools();

}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {

    if (process.platform !== "darwin") {

        app.quit();

    }

});

app.on("activate", () => {

    if (BrowserWindow.getAllWindows().length === 0) {

        createWindow();

    }

});

// ======================================
// COMPLETE DATABASE
// ======================================

ipcMain.handle("get-database", async () => {

    await db.read();

    return db.data;

});

ipcMain.handle("save-database", async (event, database) => {

    db.data = database;

    await db.write();

    return true;

});

// ======================================
// PRODUCTS
// ======================================

ipcMain.handle("get-products", async () => {

    await db.read();

    return db.data.products;

});

ipcMain.handle("save-products", async (event, products) => {

    db.data.products = products;

    await db.write();

    return true;

});

// ======================================
// CUSTOMERS
// ======================================

ipcMain.handle("get-customers", async () => {

    await db.read();

    return db.data.customers;

});

ipcMain.handle("save-customers", async (event, customers) => {

    db.data.customers = customers;

    await db.write();

    return true;

});

// ======================================
// BILLS
// ======================================

ipcMain.handle("get-bills", async () => {

    await db.read();

    return db.data.bills;

});

ipcMain.handle("save-bills", async (event, bills) => {

    db.data.bills = bills;

    await db.write();

    return true;

});

// ======================================
// SETTINGS
// ======================================

ipcMain.handle("get-settings", async () => {

    await db.read();

    return db.data.settings;

});

ipcMain.handle("save-settings", async (event, settings) => {

    db.data.settings = settings;

    await db.write();

    return true;

});