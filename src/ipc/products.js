// ==========================================
// SVSS PRODUCTS
// products.js
// Part 1
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {

    // ======================================
    // Category Wise Products
    // ======================================

    // ======================================
    // Controls
    // ======================================

    const category = document.getElementById("category");
    const productName = document.getElementById("productName");
    const unit = document.getElementById("unit");
    const hsnCode = document.getElementById("hsnCode");

    const cgst = document.getElementById("cgst");
    const sgst = document.getElementById("sgst");
    const gst = document.getElementById("gst");

    const Rate = document.getElementById("Rate");
    // ======================================
    // Load Categories
    // ======================================
    

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

        products = await window.api.getProducts()

        if (!Array.isArray(products)) {

            products = [];

        }

        await refreshProducts();

    }
    // ======================================
// LOAD MASTER CATEGORIES
// ======================================

async function loadCategories() {

    const categories = await window.api.getCategories();

    category.innerHTML = `
        <option value="">
            Choose Category
        </option>
    `;

    categories.forEach(item => {

        category.innerHTML += `
            <option value="${item.name}">
                ${item.name}
            </option>
        `;

    });

}

// ======================================
// LOAD MASTER PRODUCTS
// ======================================

async function loadProductNames(categoryName) {

    const masterProducts =
        await window.api.getMasterProducts();

    productName.innerHTML =
        `<option value="">Select Product</option>`;

    const filtered = masterProducts.filter(product =>
        product.category.trim().toLowerCase() ===
        categoryName.trim().toLowerCase()
    );

    filtered.forEach(product => {

        productName.innerHTML += `
            <option value="${product.name}">
                ${product.name}
            </option>
        `;

    });

}
    category.addEventListener("change", async () => {

    await loadProductNames(category.value);

    // Clear product details
    productName.value = "";

    hsnCode.value = "";

    unit.value = "";

    cgst.value = 0;

    sgst.value = 0;

    updateGST();

   });
   // ======================================
// PRODUCT CHANGE
// AUTO LOAD DETAILS
// ======================================

productName.addEventListener("change", async () => {

    if (!category.value || !productName.value)
        return;

    const products =
        await window.api.getMasterProducts();

    const selected =
        products.find(product =>

            product.category === category.value &&

            product.name === productName.value

        );

    if (!selected)
        return;

    unit.value =
        selected.unit || "";

    hsnCode.value =
        selected.hsnCode || "";

    cgst.value =
        selected.cgst || 0;

    sgst.value =
        selected.sgst || 0;

    updateGST();

    });

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

   

    // ======================================
    // Display Products
    // ======================================

    function displayProducts(filtered = products) {

    tableBody.innerHTML = "";

    if (filtered.length === 0) {

        tableBody.innerHTML = `
        <tr>
            <td colspan="10" class="text-center">
                No Products Found
            </td>
        </tr>
        `;

        return;
    }

    filtered.forEach((product) => {

        tableBody.innerHTML += `
        <tr>
            <td>${product.code}</td>
            <td>${product.productName}</td>
            <td>${product.category}</td>
            <td>${product.hsnCode || "-"}</td>
            <td>${product.unit}</td>
            <td>${product.cgst}%</td>
            <td>${product.sgst}%</td>
            <td>${product.gst}%</td>
            <td>Rs. ${Number(product.Rate).toFixed(2)}</td>
            <td>
                <button class="btn btn-warning btn-sm editBtn" data-code="${product.code}">
                    <i class="bi bi-pencil"></i>
                </button>

                <button class="btn btn-danger btn-sm deleteBtn" data-code="${product.code}">
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
    await loadCategories();
    updateGST();
    // ======================================
// SAVE PRODUCT
// ======================================

saveProduct.addEventListener("click", async function (e) {

    e.preventDefault();
    e.stopPropagation();

    try {

        console.log("SAVE PRODUCT BUTTON CLICKED");

        // ======================================
        // VALIDATION
        // ======================================

        const selectedCategory =
            category.value.trim();

        const selectedProduct =
            productName.value.trim();

        const selectedUnit =
            unit.value.trim();

        const selectedRate =
            Rate.value.trim();

        if (!selectedCategory) {

            showToast(
                "Please Select Category",
                "warning"
            );

            return;
        }

        if (!selectedProduct) {

            showToast(
                "Please Select Product",
                "warning"
            );

            return;
        }

        if (!selectedUnit) {

            showToast(
                "Unit is Empty",
                "warning"
            );

            return;
        }

        if (!selectedRate) {

            showToast(
                "Enter Rate",
                "warning"
            );

            return;
        }

        const rateNumber =
            Number(selectedRate);

        if (!Number.isFinite(rateNumber) || rateNumber < 0) {

            showToast(
                "Enter a valid Rate",
                "warning"
            );

            return;
        }

        // ======================================
        // GET LATEST PRODUCTS
        // ======================================

        products =
            await window.api.getProducts();

        if (!Array.isArray(products)) {

            products = [];

        }

        // ======================================
        // GENERATE PRODUCT CODE
        // ======================================

        let code;

        if (editIndex === -1) {

            let maxNumber = 0;

            products.forEach(product => {

                const match =
                    String(product.code || "")
                        .match(/^P(\d+)$/);

                if (match) {

                    maxNumber =
                        Math.max(
                            maxNumber,
                            Number(match[1])
                        );

                }

            });

            code =
                "P" +
                String(maxNumber + 1)
                    .padStart(3, "0");

        } else {

            code =
                products[editIndex]?.code;

        }

        // ======================================
        // CREATE PRODUCT
        // ======================================

        const product = {

            code: code,

            productName:
                selectedProduct,

            category:
                selectedCategory,

            hsnCode:
                hsnCode.value.trim(),

            unit:
                selectedUnit,

            cgst:
                Number(cgst.value || 0),

            sgst:
                Number(sgst.value || 0),

            gst:
                Number(gst.value || 0),

            Rate:
                rateNumber

        };

        // ======================================
        // ADD
        // ======================================

        if (editIndex === -1) {

            products.push(product);

        }

        // ======================================
        // UPDATE
        // ======================================

        else {

            if (!products[editIndex]) {

                showToast(
                    "Product not found",
                    "warning"
                );

                return;
            }

            products[editIndex] =
                product;

        }

        // ======================================
        // SAVE
        // ======================================

        console.log(
            "Saving product:",
            product
        );

        const result =
            await window.api.saveProducts(
                products
            );

        console.log(
            "Product save result:",
            result
        );

        // ======================================
        // RELOAD FROM DATABASE
        // ======================================

        products =
            await window.api.getProducts();

        await refreshProducts();

        // ======================================
        // RESET
        // ======================================

        resetForm();

        editIndex = -1;

        // ======================================
        // CLOSE MODAL
        // ======================================

        const modalElement =
            document.getElementById(
                "productModal"
            );

        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );

        if (modal) {

            modal.hide();

        }

        // ======================================
        // SUCCESS
        // ======================================

        showToast(
            "Product Saved Successfully",
            "success"
        );

        console.log(
            "PRODUCT SAVED SUCCESSFULLY"
        );

    } catch (error) {

        console.error(
            "SAVE PRODUCT ERROR:",
            error
        );

        showToast(
            "Unable to save product: " +
            error.message,
            "danger"
        );

    }

});

// ======================================
// Edit Product
// ======================================

tableBody.addEventListener("click", async function (e) {

    const btn = e.target.closest(".editBtn");

    if (!btn) return;

    const productCode = btn.dataset.code;

editIndex =
    products.findIndex(
        product => product.code === productCode
    );

const product = products[editIndex];

    if (!product) {
        showToast("Product not found", "warning");
        return;
    }

    // Load category
    category.value = product.category;

    // Load products belonging to category
    await loadProductNames(product.category);

    // Select product
    productName.value = product.productName;

    // ======================================
    // LOAD PRODUCT DETAILS FROM MASTER
    // ======================================

    const masterProducts =
        await window.api.getMasterProducts();

    const selected =
        masterProducts.find(masterProduct =>
            String(masterProduct.category || "")
                .trim()
                .toLowerCase() ===
            String(product.category || "")
                .trim()
                .toLowerCase()
            &&
            String(masterProduct.name || "")
                .trim()
                .toLowerCase() ===
            String(product.productName || "")
                .trim()
                .toLowerCase()
        );

    // ======================================
    // LOAD MASTER DETAILS
    // ======================================

    if (selected) {

        unit.value =
            selected.unit || "";

        hsnCode.value =
            selected.hsnCode || "";

        cgst.value =
            selected.cgst || 0;

        sgst.value =
            selected.sgst || 0;

        Rate.value =
            selected.rate ??
            selected.Rate ??
            product.Rate ??
            "";

    } else {

        // Fallback to saved product details

        unit.value =
            product.unit || "";

        hsnCode.value =
            product.hsnCode || "";

        cgst.value =
            product.cgst || 0;

        sgst.value =
            product.sgst || 0;

        Rate.value =
            product.Rate || "";
    }

    updateGST();

    // ======================================
    // OPEN EDIT MODAL
    // ======================================

    const modal =
        new bootstrap.Modal(
            document.getElementById("productModal")
        );

    modal.show();

});

// ======================================
// DELETE PRODUCT - CONFIRMATION POPUP
// ======================================

let productToDelete = null;


// ======================================
// CREATE DELETE POPUP
// ======================================

let deleteConfirmModal =
    document.getElementById("deleteConfirmModal");

// Remove old popup if it already exists
if (deleteConfirmModal) {
    deleteConfirmModal.remove();
}


// Create popup
deleteConfirmModal =
    document.createElement("div");

deleteConfirmModal.id =
    "deleteConfirmModal";

deleteConfirmModal.className =
    "delete-confirm-overlay";

deleteConfirmModal.innerHTML = `

    <div class="delete-confirm-box">

        <div class="delete-confirm-icon">
            <i class="bi bi-trash3-fill"></i>
        </div>

        <h3>
            Delete Product?
        </h3>

        <p>
            Are you sure you want to delete
            <strong id="deleteProductName"></strong>?
        </p>

        <div class="delete-confirm-actions">

            <button
                type="button"
                id="deleteCancelBtn"
                class="delete-cancel-btn">

                Cancel

            </button>

            <button
                type="button"
                id="deleteConfirmBtn"
                class="delete-confirm-btn">

                <i class="bi bi-trash3"></i>
                Delete

            </button>

        </div>

    </div>

`;

document.body.appendChild(deleteConfirmModal);


// Get popup elements
const deleteProductName =
    document.getElementById("deleteProductName");

const deleteConfirmBtn =
    document.getElementById("deleteConfirmBtn");

const deleteCancelBtn =
    document.getElementById("deleteCancelBtn");


// ======================================
// DELETE BUTTON
// ======================================

tableBody.addEventListener("click", function (e) {

    const btn =
        e.target.closest(".deleteBtn");

    if (!btn) return;


    const productCode =
        String(btn.dataset.code || "").trim();


    if (!productCode) {

        showToast(
            "Product code not found",
            "warning"
        );

        return;
    }


    // Find product
    const index =
        products.findIndex(
            product =>
                String(product.code || "").trim() ===
                productCode
        );


    if (index === -1) {

        showToast(
            "Product not found",
            "warning"
        );

        return;
    }


    // Store product
    productToDelete = {

        index: index,

        product: products[index]

    };


    // Show product name
    deleteProductName.textContent =
        products[index].productName ||
        "this product";


    // SHOW POPUP
    deleteConfirmModal.style.display =
        "flex";

});


// ======================================
// CANCEL
// ======================================

deleteCancelBtn.addEventListener(
    "click",
    function () {

        productToDelete = null;

        deleteConfirmModal.style.display =
            "none";

    }
);


// ======================================
// CONFIRM DELETE
// ======================================

deleteConfirmBtn.addEventListener(
    "click",
    async function () {

        if (!productToDelete)
            return;


        const product =
            productToDelete.product;


        try {

            // DELETE HERE ONLY
            products.splice(
                productToDelete.index,
                1
            );


            // Save
            await window.api.saveProducts(
                products
            );


            // Clear selected product
            productToDelete = null;


            // Close popup
            deleteConfirmModal.style.display =
                "none";


            // Refresh table
            await refreshProducts();


            // Success
            showToast(
                `"${product.productName}" deleted successfully`,
                "success"
            );


        } catch (error) {

            console.error(
                "Delete Product Error:",
                error
            );


            showToast(
                "Failed to delete product",
                "danger"
            );

        }

    }
);


// ======================================
// CLICK OUTSIDE POPUP
// ======================================

deleteConfirmModal.addEventListener(
    "click",
    function (e) {

        if (
            e.target ===
            deleteConfirmModal
        ) {

            productToDelete = null;

            deleteConfirmModal.style.display =
                "none";

        }

    }
);


// ======================================
// ESC KEY
// ======================================

document.addEventListener(
    "keydown",
    function (e) {

        if (
            e.key === "Escape" &&
            deleteConfirmModal.style.display ===
                "flex"
        ) {

            productToDelete = null;

            deleteConfirmModal.style.display =
                "none";

        }

    }
);

    // ======================================
    // Reset Form
    // ======================================

    function resetForm() {

        editIndex = -1;

        category.selectedIndex = 0;

        productName.innerHTML =
            `<option value="">Select Product</option>`;

        unit.selectedIndex = 0;

        hsnCode.value = "";

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
    // ======================================
// CATEGORY FILTER
// ======================================

const categoryFilter =
    document.getElementById("categoryFilter");

categoryFilter.addEventListener("change", function () {

    const value = this.value.toLowerCase();

    const rows = tableBody.querySelectorAll("tr");

    rows.forEach(row => {

        // Skip "No Products Found"
        if (row.children.length < 3) return;

        const category =
            row.children[2].innerText.toLowerCase();

        if (value === "") {

            row.style.display = "";

        } else {

            row.style.display =
                category === value ? "" : "none";

        }

    });

});

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

        products = await window.api.getProducts()

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

openProductModal.addEventListener("click", async () => {

    resetForm();

    await loadCategories();

    modalInstance.show();

});

if (productModal) {

    // When modal opens
    productModal.addEventListener("shown.bs.modal", function () {

  setTimeout(() => {
    const modalElement = document.getElementById("productModal");
    modalElement.focus();
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
document.addEventListener("svss:new", async () => {

    resetForm();

    await loadCategories();

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

window.addEventListener(
    "product-master-updated",
    async () => {

        await loadCategories();

    }
);

});