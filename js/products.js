// ==========================================
// SVSS PRODUCTS
// products.js
// Part 1
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    // ======================================
    // Category Wise Products
    // ======================================

    const categoryProducts = {

        "Lining": [
            "Cotton Lining",
            "Polyester Lining"
        ],

        "Langalu": [
            "XL Langalu",
            "XXL Langalu",
            "L Langalu",
            "NK Langalu"
        ],

        "Nighty": [
            "Spl Nighty",
            "Button Spl Nighty",
            "Button Nighty",
            "Round Neck Zumbo Nighty",
            "Zumbo XXL Nighty",
            "Frack Nighty",
            "Mother Nighty"
        ],

        "Saree Fall": [
            "Small Fall",
            "Big Fall",
            "Zumbo Fall"
        ],

        "Blouse Material": [
            "Crystal Blouse",
            "Red_Rose Blouse",
            "Vidya Blouse"
        ]

    };

    // ======================================
    // Controls
    // ======================================

    const category = document.getElementById("category");
    const productName = document.getElementById("productName");
    const unit = document.getElementById("unit");

    const cgst = document.getElementById("cgst");
    const sgst = document.getElementById("sgst");
    const gst = document.getElementById("gst");

    const Rate = document.getElementById("Rate");

    const saveProduct = document.getElementById("saveProduct");

    const tableBody = document.getElementById("productTableBody");

    // ======================================
    // Variables
    // ======================================

    let products = [];

    let deleteIndex = -1;

    let editIndex = -1;

    // ======================================
    // Load Products From Database
    // ======================================

    async function loadProducts() {

        products = await getProducts();

        if (!Array.isArray(products)) {

            products = [];

        }

        displayProducts();

        updateDashboardCards();

    }

    // ======================================
    // GST Calculation
    // ======================================

    function updateGST() {

        gst.value =
            Number(cgst.value || 0) +
            Number(sgst.value || 0);

    }

    cgst.addEventListener("change", updateGST);

    sgst.addEventListener("change", updateGST);

    // ======================================
    // Category Change
    // ======================================

    category.addEventListener("change", function () {

        const selected = category.value;

        productName.innerHTML =
            `<option value="">Select Product</option>`;

        if (categoryProducts[selected]) {

            categoryProducts[selected].forEach(item => {

                const option = document.createElement("option");

                option.value = item;

                option.textContent = item;

                productName.appendChild(option);

            });

        }

        if (selected === "Lining") {

            unit.value = "Meter";

        }

        else {

            unit.value = "Piece";

        }

    });

    // ======================================
    // Display Products
    // ======================================

    function displayProducts() {

        tableBody.innerHTML = "";

        if (products.length === 0) {

            tableBody.innerHTML = `

            <tr>

                <td colspan="9" class="text-center">

                    No Products Found

                </td>

            </tr>

            `;

            return;

        }

        products.forEach((product, index) => {

            tableBody.innerHTML += `

            <tr>

                <td>${product.code}</td>

                <td>${product.productName}</td>

                <td>${product.category}</td>

                <td>${product.unit}</td>

                <td>${product.cgst}%</td>

                <td>${product.sgst}%</td>

                <td>${product.gst}%</td>

                <td>₹${Number(product.Rate).toFixed(2)}</td>

                <td>

                    <button
                        class="btn btn-warning btn-sm editBtn"
                        data-index="${index}">

                        <i class="bi bi-pencil"></i>

                    </button>

                    <button
                        class="btn btn-danger btn-sm deleteBtn"
                        data-index="${index}">

                        <i class="bi bi-trash"></i>

                    </button>

                </td>

            </tr>

            `;

        });

    }

    // ======================================
    // Dashboard Cards
    // ======================================

    function updateDashboardCards() {

        const cards =
            document.querySelectorAll(".card-box h2");

        if (!cards.length) return;

        cards[0].innerText = products.length;

        const totalCategory =
            [...new Set(products.map(p => p.category))];

        if (cards.length > 1) {

            cards[1].innerText =
                totalCategory.length;

        }

    }

    // ======================================
    // Initial Load
    // ======================================

    await loadProducts();
        // ======================================
    // Save Product
    // ======================================

    saveProduct.addEventListener("click", async function () {

        if (category.value === "") {
            showToast("Please Select Category","warning");
            return;
        }

        if (productName.value === "") {
            showToast("Please Select Product","warning");
            return;
        }

        if (unit.value === "") {
            showToast("Unit is Empty","warning");
            return;
        }

        if (Rate.value === "") {
            showToast("Enter Rate","warning");
            return;
        }

        let code = "";

        if (editIndex === -1) {

            let nextNumber = 1;

            if (products.length > 0) {

                const lastCode = products[products.length - 1].code;

                nextNumber = parseInt(lastCode.substring(1)) + 1;

            }

            code = "P" + String(nextNumber).padStart(3, "0");

        }

        else {

            code = products[editIndex].code;

        }

        const product = {

            code: code,

            productName: productName.value,

            category: category.value,

            unit: unit.value,

            cgst: Number(cgst.value),

            sgst: Number(sgst.value),

            gst: Number(gst.value),

            Rate: Number(Rate.value)

        };

        if (editIndex === -1) {

            products.push(product);

        }

        else {

            products[editIndex] = product;

            editIndex = -1;

        }

        await saveProducts(products);

        displayProducts();

        updateDashboardCards();

        resetForm();

        const modal = bootstrap.Modal.getInstance(
            document.getElementById("productModal")
        );

        if (modal) {

            modal.hide();

        }

        showToast("Product Saved Successfully","success");

    });

    // ======================================
    // Edit Product
    // ======================================

    tableBody.addEventListener("click", function (e) {

        const btn = e.target.closest(".editBtn");

        if (!btn) return;

        editIndex = Number(btn.dataset.index);

        const product = products[editIndex];

        category.value = product.category;

        category.dispatchEvent(new Event("change"));

        productName.value = product.productName;

        unit.value = product.unit;

        cgst.value = product.cgst;

        sgst.value = product.sgst;

        gst.value = product.gst;

        Rate.value = product.Rate;

        const modal = new bootstrap.Modal(

            document.getElementById("productModal")

        );

        modal.show();

    });

    // ======================================
    // Delete Product
    // ======================================

    tableBody.addEventListener("click", async function (e) {

        const btn = e.target.closest(".deleteBtn");

        if (!btn) return;

        const index = Number(btn.dataset.index);

        deleteIndex = index;

    document
    .getElementById("deleteProductModal")
    .classList.add("show");

    });

    // ======================================
    // Reset Form
    // ======================================

    function resetForm() {

        editIndex = -1;

        category.selectedIndex = 0;

        productName.innerHTML =
            `<option value="">Select Product</option>`;

        unit.selectedIndex = 0;

        cgst.selectedIndex = 0;

        sgst.selectedIndex = 0;

        gst.selectedIndex = 0;

        Rate.value = "";

    }
    // ======================================
    // Search Product
    // ======================================

    const searchBox = document.querySelector(
        'input[placeholder="Search Product"]'
    );

    if (searchBox) {

        searchBox.addEventListener("keyup", function () {

            const value = this.value.toLowerCase();

            const rows = tableBody.querySelectorAll("tr");

            rows.forEach(function (row) {

                row.style.display =
                    row.innerText.toLowerCase().includes(value)
                        ? ""
                        : "none";

            });

        });

    }

    // ======================================
    // Refresh Products
    // ======================================

    async function refreshProducts() {

        products = await getProducts();

        displayProducts();

        updateDashboardCards();

    }

    // ======================================
// Modal Events
// ======================================

const productModal =
    document.getElementById("productModal");
    const openProductModal =
    document.getElementById("openProductModal");

const modalInstance =
    new bootstrap.Modal(productModal);

openProductModal.addEventListener("click", () => {

    modalInstance.show();

    setTimeout(() => {

        Rate.focus();

    }, 300);

});

if (productModal) {

    // When modal opens
    productModal.addEventListener("shown.bs.modal", function () {

    setTimeout(() => {

        const modalElement = document.getElementById("productModal");

        modalElement.focus();

        Rate.focus();

        Rate.select();

    }, 200);

});

    // When modal closes
    productModal.addEventListener("hidden.bs.modal", function () {

        resetForm();

    });

}

    // ======================================
    // Final Load
    // ======================================
    // ======================================
// Keyboard Shortcuts - Products
// ======================================

// Ctrl + N → Open Add Product
document.addEventListener("svss:new", () => {

    resetForm();

    modalInstance.show();

    setTimeout(() => {

        category.focus();

    }, 200);

});

// Ctrl + S → Save Product
document.addEventListener("svss:save", () => {

    const modal =
        bootstrap.Modal.getInstance(productModal);

    if (modal) {

        saveProduct.click();

    }

});

// Ctrl + F → Focus Search
document.addEventListener("svss:search", () => {

    if (searchBox) {

        searchBox.focus();

        searchBox.select();

    }

});

// Esc → Close Product Modal
document.addEventListener("svss:escape", () => {

    const modal =
        bootstrap.Modal.getInstance(productModal);

    if (modal) {

        modal.hide();

    }

});

    await refreshProducts();
    // ======================================
// DELETE PRODUCT MODAL
// ======================================

const deleteModal =
    document.getElementById("deleteProductModal");

const confirmDelete =
    document.getElementById("confirmDeleteProduct");

const cancelDelete =
    document.getElementById("cancelDeleteProduct");

// Cancel

cancelDelete?.addEventListener("click", () => {

    deleteModal.classList.remove("show");

});

// Click Outside

deleteModal?.addEventListener("click", (e) => {

    if (e.target === deleteModal) {

        deleteModal.classList.remove("show");

    }

});

// ESC

document.addEventListener("keydown", (e) => {

    if (

        e.key === "Escape" &&

        deleteModal.classList.contains("show")

    ) {

        deleteModal.classList.remove("show");

    }

});

// Confirm Delete

confirmDelete?.addEventListener("click", async () => {

    if (deleteIndex === -1) return;

    products.splice(deleteIndex, 1);

    await saveProducts(products);

    displayProducts();

    updateDashboardCards();

    showToast("Product Deleted Successfully", "success");

    deleteIndex = -1;

    deleteModal.classList.remove("show");

});

});