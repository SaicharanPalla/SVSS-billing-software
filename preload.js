const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

    // ==========================
    // COMPLETE DATABASE
    // ==========================

    getDatabase: () => ipcRenderer.invoke("get-database"),

    saveDatabase: (database) =>
        ipcRenderer.invoke("save-database", database),

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
        ipcRenderer.invoke("get-app-version")

});