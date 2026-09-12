console.log("window.api =", window.api);

// =====================================
// SVSS LOGIN
// =====================================

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const togglePassword = document.getElementById("togglePassword");
const loadingOverlay = document.getElementById("loadingOverlay");
const loginCard = document.querySelector(".login-card");
const toast = document.getElementById("toast");
const rememberMe = document.getElementById("rememberMe");

let isLoggingIn = false;

// =====================================
// PAGE LOAD
// =====================================

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const db = await window.api.getDatabase();

        if (!db.settings) {
            db.settings = {};
        }

        // ==========================
        // RESTORE REMEMBER ME
        // ==========================

        if (db.settings.rememberMe === true) {

            usernameInput.value =
                db.settings.savedUsername || "";

            passwordInput.value =
                db.settings.savedPassword || "";

            rememberMe.checked = true;

        }

        // ==========================
        // APP VERSION
        // ==========================

        const versionElement =
            document.getElementById("appVersion");

        if (versionElement) {

            const version =
                await window.api.getAppVersion();

            versionElement.textContent =
                `Version ${version}`;

        }

        setTimeout(() => {

            usernameInput.focus();

        }, 300);

    }

    catch (err) {

        console.error(err);

    }

});

// =====================================
// ENTER KEY LOGIN
// =====================================

document.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {

        loginForm.requestSubmit();

    }

});

// =====================================
// SHOW / HIDE PASSWORD
// =====================================

togglePassword.addEventListener("click", () => {

    const icon =
        togglePassword.querySelector("i");

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        icon.classList.replace(
            "fa-eye",
            "fa-eye-slash"
        );

    }

    else {

        passwordInput.type = "password";

        icon.classList.replace(
            "fa-eye-slash",
            "fa-eye"
        );

    }

});

// =====================================
// LOGIN
// =====================================
loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    if (isLoggingIn) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // ==========================
    // VALIDATION
    // ==========================

    if (username === "" || password === "") {

        showToast(
            "Please enter Username and Password",
            "warning"
        );

        return;

    }

    isLoggingIn = true;

    loginBtn.disabled = true;

    loginBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        &nbsp;Logging In...
    `;

    try {

        // ==========================
        // LOAD DATABASE
        // ==========================

        const db = await window.api.getDatabase();

        if (!db.settings) {
            db.settings = {};
        }

        const DEFAULT_USER = "admin";
        const DEFAULT_PASS = "admin123";

        const savedUser =
            db.settings.username || DEFAULT_USER;

        const savedPass =
            db.settings.password || DEFAULT_PASS;

        // ==========================
        // LOGIN SUCCESS
        // ==========================

        const loginSuccess = window.api.isBrowser
            ? true
            : (username === savedUser && password === savedPass);

        if (loginSuccess) {

            db.settings.loggedIn = true;
            db.settings.loggedUser = username;

            // ==========================
            // REMEMBER ME
            // ==========================

            if (rememberMe.checked) {

                db.settings.rememberMe = true;
                db.settings.savedUsername = username;
                db.settings.savedPassword = password;

            } else {

                db.settings.rememberMe = false;
                db.settings.savedUsername = "";
                db.settings.savedPassword = "";

            }

console.log("LOGIN SUCCESS");
console.log(db.settings);
        // ==========================
        // SUPABASE CLOUD LOGIN
        // ==========================

        try {

            const cloudResult =
                await window.api.cloudLogin(username, password);

            if (!cloudResult.success) {

                showToast(
                    cloudResult.error || "Invalid email or password.",
                    "error"
                );

                passwordInput.value = "";
                passwordInput.focus();

                return;
            }

            console.log("SVSS CLOUD LOGIN SUCCESS");
            console.log("Cloud User ID:", cloudResult.userId);
            console.log("Cloud Email:", cloudResult.email);

            // ======================================
            // CLOUD → LOCAL DATABASE SYNC
            // ======================================

            try {

                const syncResult =
                    await window.api.syncFromCloud();

                if (syncResult.success) {

                    console.log(
                        "SVSS Cloud: Cloud → Local sync successful."
                    );

                    console.log(
                        "SVSS Cloud Sync Counts:",
                        syncResult.counts
                    );

                } else {

                    console.warn(
                        "SVSS Cloud: Cloud → Local sync failed:",
                        syncResult.error
                    );

                }

            } catch (syncError) {

                console.warn(
                    "SVSS Cloud: Cloud → Local sync error:",
                    syncError
                );

            }

            // ======================================
            // RESTORE LOCAL LOGIN STATE
            // AFTER CLOUD SYNC
            // ======================================

            const latestDb =
                await window.api.getDatabase();

            if (!latestDb.settings) {
                latestDb.settings = {};
            }

            latestDb.settings.loggedIn = true;
            latestDb.settings.loggedUser = username;

            await window.api.saveDatabase(latestDb);

            console.log(
                "SVSS: Local login state restored after cloud sync."
            );

        } catch (cloudError) {

            console.error(
                "SVSS CLOUD LOGIN ERROR:",
                cloudError
            );

            showToast(
                "Cloud login failed. Please try again.",
                "error"
            );

            return;
        }
            // Disable Login Button

            loginBtn.disabled = true;

            // Fade Login Card

            loginCard.classList.add("hide");

            // Show Loading Overlay

            setTimeout(() => {

                loadingOverlay.classList.add("show");

            }, 450);

            // Loading Animation

            const loadingText =
                loadingOverlay.querySelector("p");

            let dots = 0;

            const dotAnimation = setInterval(() => {

                dots = (dots + 1) % 4;

                loadingText.textContent =
                    "Signing In" + ".".repeat(dots);

            }, 300);

            // Fade Page

            setTimeout(() => {

                document.body.classList.add("fade-out");

            }, 1700);

            // Dashboard

            setTimeout(() => {

                clearInterval(dotAnimation);

                window.location.href = "dashboard.html";

            }, 2100);

            return;

        }

        // ==========================
        // LOGIN FAILED
        // ==========================

        showToast(
            "Invalid Username or Password",
            "error"
        );

        passwordInput.value = "";
        passwordInput.focus();

    }

    catch (err) {

        console.error(err);

        showToast(
            "Login Error",
            "error"
        );

    }

    finally {

        loginBtn.disabled = false;

        loginBtn.innerHTML = `
            <i class="fa-solid fa-right-to-bracket"></i>
            LOGIN
        `;

        isLoggingIn = false;

    }

});
// =====================================
// TOAST
// =====================================

function showToast(message, type = "success") {

    if (!toast) return;

    toast.className = "toast";
    toast.classList.add(type);
    toast.innerHTML = message;

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    clearTimeout(toast.hideTimer);

    toast.hideTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


