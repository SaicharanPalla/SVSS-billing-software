console.log("PRELOAD LOADED");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

    // ==========================
    // COMPLETE DATABASE
    // ==========================

    getDatabase: () => ipcRenderer.invoke("get-database"),

    saveDatabase: (database) =>
        ipcRenderer.invoke("save-database", database),

    getCategories: () => ipcRenderer.invoke("get-categories"),

    saveCategories: (categories) =>
    ipcRenderer.invoke("save-categories", categories),

    getMasterProducts: () =>
    ipcRenderer.invoke("get-master-products"),

    saveMasterProducts: (products) =>
    ipcRenderer.invoke("save-master-products", products),

    // ==========================
    // PRODUCTS
    // ==========================

    getProducts: () =>
        ipcRenderer.invoke("get-products"),

    saveProducts: (products) =>
        ipcRenderer.invoke("save-products", products),

    // ==========================
    // CUSTOMERS
    // ==========================

    getCustomers: () =>
        ipcRenderer.invoke("get-customers"),

    saveCustomers: (customers) =>
        ipcRenderer.invoke("save-customers", customers),

    // ==========================
    // BILLS
    // ==========================

    getBills: () =>
        ipcRenderer.invoke("get-bills"),

    saveBills: (bills) =>
        ipcRenderer.invoke("save-bills", bills),

    // ==========================
    // SETTINGS
    // ==========================

    getSettings: () =>
        ipcRenderer.invoke("get-settings"),

    saveSettings: (settings) =>
    ipcRenderer.invoke("save-settings", settings),

// ==========================
// APP VERSION
// ==========================

getAppVersion: () =>
    ipcRenderer.invoke("get-app-version"),

// ==========================
// SUPABASE CLOUD AUTH
// ==========================

cloudLogin: () =>
    ipcRenderer.invoke("cloud-login"),

cloudLogout: () =>
    ipcRenderer.invoke("cloud-logout"),

getCloudSession: () =>
    ipcRenderer.invoke("cloud-session"),

// ==========================
// CLOUD → LOCAL SYNC
// ==========================

syncFromCloud: () =>
    ipcRenderer.invoke("sync-from-cloud"),

// ==========================
// LOCAL → CLOUD SYNC
// ==========================

syncToCloud: () =>
    ipcRenderer.invoke("sync-to-cloud"),

// ==========================
// COMPLETE SYNC
// ==========================

syncAll: () =>
    ipcRenderer.invoke("sync-all")

});