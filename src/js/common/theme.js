// ======================================
// SVSS Global Theme
// theme.js
// ======================================

let appSettings = {};

// ======================================
// Load Settings
// ======================================

async function loadThemeSettings() {

    const db = await window.api.getDatabase();

    appSettings = db.settings || {};

}

// ======================================
// Apply Theme
// ======================================

async function applyTheme() {

    await loadThemeSettings();

    // ===========================
    // Theme Color
    // ===========================

    document.body.setAttribute(
        "data-theme",
        appSettings.themeColor || "blue"
    );
    // ======================================
    // APPLY SIDEBAR GRADIENT
    // ======================================
    
    const sidebar = document.getElementById("sidebar");
    
    if (sidebar) {
    
        const theme = appSettings.themeColor || "blue";
    
        const sidebarGradients = {
    
            blue: "linear-gradient(180deg, #0b172a 10%, #1e3a8a 50%, #2563eb 100%)",
    
            green: "linear-gradient(180deg, #0b172a 10%, #166534 50%, #16a34a 100%)",
    
            purple: "linear-gradient(180deg, #0b172a 10%, #6b21a8 50%, #9333ea 100%)",
    
            orange: "linear-gradient(180deg, #0b172a 10%, #ae4b2a 60%, #f97316 100%)"
    
        };
    
        sidebar.style.setProperty(
            "background",
            sidebarGradients[theme] || sidebarGradients.blue,
            "important"
        );
    
    }

    // ===========================
    // Dark Mode
    // ===========================

    if (appSettings.darkMode) {

        document.body.classList.add("dark-mode");

    } else {

        document.body.classList.remove("dark-mode");

    }

    // ===========================
    // Font Size
    // ===========================

    document.body.classList.remove(
        "font-small",
        "font-medium",
        "font-large"
    );

    document.body.classList.add(
        "font-" + (appSettings.fontSize || "medium")
    );

}

// ======================================
// Apply Theme on Page Load
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    await applyTheme();

});

// ======================================
// Format Date
// ======================================

function formatDate(dateString) {

    const format =
        appSettings.dateFormat || "dd-mm-yyyy";

    const date = new Date(dateString);

    const dd = String(date.getDate()).padStart(2, "0");

    const mm = String(date.getMonth() + 1).padStart(2, "0");

    const yyyy = date.getFullYear();

    switch (format) {

        case "yyyy-mm-dd":

            return `${yyyy}-${mm}-${dd}`;

        case "dd-mm-yyyy":

        default:

            return `${dd}-${mm}-${yyyy}`;

    }

}