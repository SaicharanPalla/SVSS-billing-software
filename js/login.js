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

    // ==========================
    // LOAD SAVED LOGIN
    // ==========================

    const savedRemember = localStorage.getItem("rememberMe");

    if (savedRemember === "true") {

        usernameInput.value =
            localStorage.getItem("savedUsername") || "";

        passwordInput.value =
            localStorage.getItem("savedPassword") || "";

        rememberMe.checked = true;

    }

    setTimeout(() => {

        usernameInput.focus();

    }, 300);

    // ==========================
   // APP VERSION
   // ==========================
   
   const versionElement = document.getElementById("appVersion");
   
   if (versionElement) {
       const version = await window.api.getAppVersion();
       versionElement.textContent = `Version ${version}`;
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

    const icon = togglePassword.querySelector("i");

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");

    } else {

        passwordInput.type = "password";

        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");

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

        if (username === savedUser &&
            password === savedPass) {

            db.settings.loggedIn = true;
            db.settings.loggedUser = username;

            await window.api.saveDatabase(db);

            // ==========================
            // REMEMBER ME
            // ==========================

            if (rememberMe.checked) {

                localStorage.setItem(
                    "rememberMe",
                    "true"
                );

                localStorage.setItem(
                    "savedUsername",
                    username
                );

                localStorage.setItem(
                    "savedPassword",
                    password
                );

            } else {

                localStorage.removeItem(
                    "rememberMe"
                );

                localStorage.removeItem(
                    "savedUsername"
                );

                localStorage.removeItem(
                    "savedPassword"
                );

            }

            // Disable Button

            loginBtn.disabled = true;

            // Fade Login Card

            loginCard.classList.add("hide");

            // Show Loading

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

                document.body.classList.add(
                    "fade-out"
                );

            }, 1700);

            // Dashboard

            setTimeout(() => {

                clearInterval(dotAnimation);

                window.location.href =
                    "dashboard.html";

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