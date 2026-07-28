// ======================================
// SVSS Toast Notification
// ======================================

function showToast(message, type = "success") {

    const oldToast = document.getElementById("svssToast");

    if (oldToast) {

        oldToast.remove();

    }

    const toast = document.createElement("div");

    toast.id = "svssToast";

    let icon = "";
    let bg = "";

    switch (type) {

        case "success":
            icon = "bi-check-circle-fill";
            bg = "#198754";
            break;

        case "error":
            icon = "bi-x-circle-fill";
            bg = "#dc3545";
            break;

        case "warning":
            icon = "bi-exclamation-triangle-fill";
            bg = "#e3b119";
            break;

        case "info":
            icon = "bi-info-circle-fill";
            bg = "#0d6efd";
            break;

        default:
            icon = "bi-bell-fill";
            bg = "#6c757d";

    }

    toast.innerHTML = `

        <i class="bi ${icon}"></i>

        <span>${message}</span>

    `;

    toast.style.background = bg;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    }, 50);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 400);

    }, 3000);

}