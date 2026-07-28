// ======================================
// SVSS Settings
// ======================================

let db = {};

// ======================================
// DATABASE FUNCTIONS
// ======================================

async function refreshDatabase() {

    db = await window.api.getDatabase();

    if (!db.settings) {

        db.settings = {};

    }

}

async function saveDatabase() {

    await window.api.saveDatabase(db);

}

// ======================================
// PAGE LOAD
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    await refreshDatabase();

    await loadSettings();

    document
        .getElementById("saveBtn")
        .addEventListener("click", saveSettings);

    document
        .getElementById("resetBtn")
        .addEventListener("click", resetSettings);

    document
        .getElementById("exportBtn")
        .addEventListener("click", exportData);

    document
        .getElementById("importBtn")
        .addEventListener("click", () => {

            document
                .getElementById("importFile")
                .click();

        });

    document
        .getElementById("importFile")
        .addEventListener("change", importData);

});

// ======================================
// PART 2 STARTS HERE
// ======================================
// ======================================
// Save Settings
// ======================================

async function saveSettings() {

    await refreshDatabase();

    // Current saved login
    const currentSavedPassword = db.settings.password || "admin123";

    // Login fields
    const newUsername = document.getElementById("newUsername").value.trim();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Save shop settings
    db.settings = {

        ...db.settings,

        shopName: document.getElementById("shopName").value.trim(),

        ownerName: document.getElementById("ownerName").value.trim(),

        shopMobile: document.getElementById("shopMobile").value.trim(),

        shopGST: document.getElementById("shopGST").value.trim(),

        shopAddress: document.getElementById("shopAddress").value.trim(),

        themeColor: document.getElementById("themeColor").value,

        fontSize: document.getElementById("fontSize").value,

        darkMode: document.getElementById("darkMode").checked,

    };

    // ==========================
    // Change Username
    // ==========================

    if (newUsername !== "") {

        db.settings.username = newUsername;

    }

    // ==========================
    // Change Password
    // ==========================

    if (
        currentPassword !== "" ||
        newPassword !== "" ||
        confirmPassword !== ""
    ) {

        if (currentPassword !== currentSavedPassword) {

            showToast("❌ Current Password is incorrect.","error");
            return;

        }

        if (newPassword !== confirmPassword) {

            showToast("❌ New Password and Confirm Password do not match.","error");
            return;

        }

        if (newPassword.length < 8) {

            showToast("❌ Password must be at least 8 characters.","error");
            return;

        }

        db.settings.password = newPassword;

    }

    await saveDatabase();
    await loadSettings();

    // Clear login fields
    document.getElementById("newUsername").value = "";
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    
    // Show success
    showToast("✅ Settings Saved Successfully.","success");
    
    }
// ======================================
// Load Settings
// ======================================

async function loadSettings() {

    const settings = db.settings || {};

    document.getElementById("shopName").value =
        settings.shopName || "";

    document.getElementById("ownerName").value =
        settings.ownerName || "";

    document.getElementById("shopMobile").value =
        settings.shopMobile || "";

    document.getElementById("shopGST").value =
        settings.shopGST || "";

    document.getElementById("shopAddress").value =
        settings.shopAddress || "";

    document.getElementById("themeColor").value =
        settings.themeColor || "blue";

    document.getElementById("fontSize").value =
        settings.fontSize || "medium";

    document.getElementById("darkMode").checked =
    settings.darkMode || false;

    // Update Current Username
    const currentUser = document.getElementById("currentUsername");
    
    if (currentUser) {
        currentUser.textContent = settings.username || "admin";
   }

   await applyTheme();

  }

// ======================================
// PART 3 STARTS HERE
// ======================================
// ======================================
// Reset Settings
// ======================================

async function resetSettings() {

    if (!confirm("Reset all settings?")) {

        return;

    }

    await refreshDatabase();

 db.settings = {

    ...db.settings,

    shopName: "",

    ownerName: "",

    shopMobile: "",

    shopGST: "",

    shopAddress: "",

    themeColor: "blue",

    fontSize: "medium",

    darkMode: false,

};

    await saveDatabase();
    await refreshDatabase();
    await loadSettings();

    showToast("✅ Settings Reset Successfully.","success");

}

// ======================================
// PART 4 STARTS HERE
// ======================================
// ======================================
// Export Data
// ======================================

async function exportData() {

    await refreshDatabase();

    const blob = new Blob(

        [JSON.stringify(db, null, 2)],

        { type: "application/json" }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "SVSS_Backup.json";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

}

// ======================================
// Import Data
// ======================================

function importData(e) {

    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function(event) {

        try {

    await saveDatabase();
    await refreshDatabase();
    await loadSettings();

    document.getElementById("newUsername").value = "";
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    showToast("✅ Settings Saved Successfully.","success");

} catch (err) {

    console.error(err);
    showToast("❌ " + err.message);

}

        e.target.value = "";

    };

    reader.readAsText(file);

}
// =============================================
// SHOW / HIDE PASSWORD
// =============================================

document.querySelectorAll(".toggle-password").forEach(button => {

    button.addEventListener("click", function () {

        const input = document.getElementById(this.dataset.target);

        const icon = this.querySelector("i");

        if (input.type === "password") {

            input.type = "text";
            icon.classList.replace("bi-eye", "bi-eye-slash");

        } else {

            input.type = "password";
            icon.classList.replace("bi-eye-slash", "bi-eye");

        }

    });

});


// =============================================
// PASSWORD STRENGTH
// =============================================

const passwordInput = document.getElementById("newPassword");
const strengthBar = document.getElementById("passwordStrength");
const strengthText = document.getElementById("strengthText");

if (passwordInput) {

    passwordInput.addEventListener("input", function () {

        const password = this.value;

        let score = 0;

        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

        switch (score) {

            case 0:
            case 1:
                strengthBar.style.width = "25%";
                strengthBar.className = "progress-bar bg-danger";
                strengthText.textContent = "Weak Password";
                break;

            case 2:
                strengthBar.style.width = "50%";
                strengthBar.className = "progress-bar bg-warning";
                strengthText.textContent = "Medium Password";
                break;

            case 3:
                strengthBar.style.width = "75%";
                strengthBar.className = "progress-bar bg-info";
                strengthText.textContent = "Good Password";
                break;

            case 4:
                strengthBar.style.width = "100%";
                strengthBar.className = "progress-bar bg-success";
                strengthText.textContent = "Strong Password";
                break;

        }

    });

}
// ======================================
// Keyboard Shortcuts - Settings
// ======================================

// Ctrl + S → Save Settings
document.addEventListener("svss:save", () => {

    saveSettings();

});

// Ctrl + F → Focus Shop Name
document.addEventListener("svss:search", () => {

    const shopName =
        document.getElementById("shopName");

    if (shopName) {

        shopName.focus();
        shopName.select();

    }

});

// Esc → Remove Focus
document.addEventListener("svss:escape", () => {

    document.activeElement.blur();

});
// ======================================
// SETTINGS.JS COMPLETED
// ======================================