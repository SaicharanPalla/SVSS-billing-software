document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // ELEMENTS
    // =====================================
    const masterUnit =
    document.getElementById("masterUnit");
    
    const productMasterBtn =
        document.getElementById("productMasterBtn");

    const productMasterModal =
        new bootstrap.Modal(
            document.getElementById("productMasterModal")
        );

    const categoryInput =
        document.getElementById("masterCategoryName");

    const saveCategoryBtn =
        document.getElementById("saveCategoryBtn");

    const categoryTable =
        document.getElementById("masterCategoryTable");
    const masterProductCategory =
        document.getElementById("masterProductCategory");
        
        const masterProductName =
        document.getElementById("masterProductName");
        
        const saveMasterProductBtn =
        document.getElementById("saveMasterProductBtn");
        
        const masterProductTable =
        document.getElementById("masterProductTable");
           
        
// =====================================
// EDIT INDEX
// =====================================

let editIndex = -1; 

    // =====================================
    // OPEN MODAL
    // =====================================

    if (productMasterBtn) {

    productMasterBtn.addEventListener("click", async () => {

        productMasterModal.show();

        await loadCategories();

        await loadCategoryDropdown();

        await loadMasterProducts();

    });

}

    // =====================================
    // LOAD CATEGORIES
    // =====================================

    async function loadCategories() {

        const categories =
            await window.api.getCategories();

        categoryTable.innerHTML = "";

        if (categories.length === 0) {

            categoryTable.innerHTML = `

            <tr>

                <td colspan="2" class="text-center">

                    No Categories Found

                </td>

            </tr>

            `;

            return;

        }

        categories.forEach((category, index) => {

            categoryTable.innerHTML += `

            <tr>

                <td>

                    ${category.name}

                </td>

                <td>

                    <button
                        class="btn btn-warning btn-sm edit-category"
                        data-index="${index}">

                        <i class="bi bi-pencil"></i>

                    </button>

                    <button
                        class="btn btn-danger btn-sm ms-2 delete-category"
                        data-index="${index}">

                        <i class="bi bi-trash"></i>

                    </button>

                </td>

            </tr>

            `;

        });


    }
    // =====================================
// LOAD CATEGORY DROPDOWN
// =====================================

async function loadCategoryDropdown() {

    const categories =
        await window.api.getCategories();

    masterProductCategory.innerHTML = `

        <option value="">

            Select Category

        </option>

    `;

    categories.forEach(category => {

        masterProductCategory.innerHTML += `

            <option value="${category.name}">

                ${category.name}

            </option>

        `;

    });

}
    // =====================================
// LOAD MASTER PRODUCTS
// =====================================

async function loadMasterProducts() {

    const products =
        await window.api.getMasterProducts();

    masterProductTable.innerHTML = "";

    if (products.length === 0) {

        masterProductTable.innerHTML = `

        <tr>

            <td colspan="4" class="text-center">

                No Products Found

            </td>

        </tr>

        `;

        return;

    }

    products.forEach((product, index) => {

    masterProductTable.innerHTML += `
        <tr>

            <td>
                ${product.category}
            </td>

            <td>
                ${product.name}
            </td>

            <td>
                ${product.unit || "Piece"}
            </td>

            <td>

                <button
                    class="btn btn-warning btn-sm edit-product"
                    data-index="${index}">
                    <i class="bi bi-pencil"></i>
                </button>

                <button
                    class="btn btn-danger btn-sm ms-2 delete-product"
                    data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>

            </td>

        </tr>
    `;

});
}
// =====================================
// EDIT CATEGORY - ELECTRON SAFE
// =====================================

function editCategoryDialog(oldName) {

    return new Promise((resolve) => {

        // Remove old dialog if it exists
        const oldModal =
            document.getElementById("editCategoryModal");

        if (oldModal) {
            oldModal.remove();
        }

        // Create modal
        const modalHTML = `
            <div
                class="modal fade"
                id="editCategoryModal"
                tabindex="-1"
                aria-hidden="true"
            >

                <div class="modal-dialog modal-dialog-centered">

                    <div class="modal-content">

                        <div class="modal-header">

                            <h5 class="modal-title">
                                Edit Category
                            </h5>

                            <button
                                type="button"
                                class="btn-close"
                                data-bs-dismiss="modal">
                            </button>

                        </div>

                        <div class="modal-body">

                            <label class="form-label fw-bold">
                                Category Name
                            </label>

                            <input
                                type="text"
                                id="editCategoryInput"
                                class="form-control"
                                value="${escapeHTML(oldName)}"
                                autocomplete="off"
                            >

                        </div>

                        <div class="modal-footer">

                            <button
                                type="button"
                                class="btn btn-secondary"
                                id="cancelEditCategory">
                                Cancel
                            </button>

                            <button
                                type="button"
                                class="btn btn-primary"
                                id="confirmEditCategory">
                                Update Category
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;

        document.body.insertAdjacentHTML(
            "beforeend",
            modalHTML
        );

        const modalElement =
            document.getElementById(
                "editCategoryModal"
            );

        const input =
            document.getElementById(
                "editCategoryInput"
            );

        const modal =
            new bootstrap.Modal(modalElement);

        let completed = false;

        function finish(value) {

            if (completed) return;

            completed = true;

            modal.hide();

            setTimeout(() => {

                modalElement.remove();

                resolve(value);

            }, 200);
        }

        // UPDATE
        document
            .getElementById("confirmEditCategory")
            .addEventListener("click", () => {

                const newName =
                    input.value.trim();

                if (!newName) {

                    alert(
                        "Category name cannot be empty."
                    );

                    input.focus();

                    return;

                }

                finish(newName);

            });

        // CANCEL
        document
            .getElementById("cancelEditCategory")
            .addEventListener("click", () => {

                finish(null);

            });

        // X button / outside close
        modalElement.addEventListener(
            "hidden.bs.modal",
            () => {

                if (!completed) {
                    finish(null);
                }

            },
            { once: true }
        );

        modal.show();

        // Focus input
        modalElement.addEventListener(
            "shown.bs.modal",
            () => {

                input.focus();

                input.select();

            },
            { once: true }
        );

        // ENTER KEY
        input.addEventListener(
            "keydown",
            (e) => {

                if (e.key === "Enter") {

                    e.preventDefault();

                    document
                        .getElementById(
                            "confirmEditCategory"
                        )
                        .click();

                }

                if (e.key === "Escape") {

                    finish(null);

                }

            }
        );

    });

}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================
// EDIT CATEGORY BUTTON
// =====================================

document.addEventListener(
    "click",
    async (e) => {

        const btn =
            e.target.closest(
                ".edit-category"
            );

        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        try {

            const index =
                Number(btn.dataset.index);

            const categories =
                await window.api.getCategories();

            if (!Array.isArray(categories)) {

                alert(
                    "Unable to load categories."
                );

                return;

            }

            const category =
                categories[index];

            if (!category) {

                alert(
                    "Category not found."
                );

                return;

            }

            const oldName =
                String(
                    category.name || ""
                ).trim();

            // =================================
            // SHOW CUSTOM EDIT WINDOW
            // =================================

            const newName =
                await editCategoryDialog(
                    oldName
                );

            // Cancelled
            if (newName === null) {

                return;

            }

            const updatedName =
                newName.trim();

            // =================================
            // CHECK SAME NAME
            // =================================

            if (
                updatedName.toLowerCase() ===
                oldName.toLowerCase()
            ) {

                return;

            }

            // =================================
            // CHECK DUPLICATE
            // =================================

            const duplicate =
                categories.some(
                    (item, i) => {

                        if (i === index)
                            return false;

                        return String(
                            item.name || ""
                        )
                            .trim()
                            .toLowerCase() ===
                            updatedName
                                .toLowerCase();

                    }
                );

            if (duplicate) {

                alert(
                    "This category already exists."
                );

                return;

            }

            // =================================
            // UPDATE CATEGORY
            // =================================

            categories[index].name =
                updatedName;

            // =================================
            // UPDATE MASTER PRODUCTS
            // =================================

            const masterProducts =
                await window.api
                    .getMasterProducts();

            if (
                    Array.isArray(masterProducts)
                ) {
                masterProducts.forEach(
                    product => {

                        if (
                            String(
                                product.category || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            oldName.toLowerCase()
                        ) {

                            product.category =
                                updatedName;

                        }

                    }
                );

            }

            // =================================
            // UPDATE PRODUCTS
            // =================================

            const products =
                await window.api.getProducts();

            if (Array.isArray(products)) {

                products.forEach(
                    product => {

                        if (
                            String(
                                product.category || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            oldName.toLowerCase()
                        ) {

                            product.category =
                                updatedName;

                        }

                    }
                );

            }

            // =================================
            // SAVE EVERYTHING
            // =================================

            await window.api.saveCategories(
                categories
            );

            await window.api.saveMasterProducts(
                masterProducts
            );

            await window.api.saveProducts(
                products
            );

            // =================================
            // REFRESH UI
            // =================================

            await loadCategories();

            await loadCategoryDropdown();

            await loadMasterProducts();

            window.dispatchEvent(
                new Event(
                    "product-master-updated"
                )
            );

            alert(
                "Category updated successfully."
            );

        }
        catch (error) {

            console.error(
                "EDIT CATEGORY ERROR:",
                error
            );

            alert(
                "Unable to edit category.\n\n" +
                error.message
            );

        }

    }
);
// =====================================
// DELETE CATEGORY
// =====================================

categoryTable.addEventListener("click", async (e) => {

    const btn = e.target.closest(".delete-category");

    if (!btn) return;

    if (!confirm("Delete this category?"))
        return;

    const index = Number(btn.dataset.index);

    const categories =
        await window.api.getCategories();

    const selectedCategory =
    categories[index].name;

const savedProducts =
    await window.api.getProducts();

const used =
    savedProducts.some(product =>

        product.category === selectedCategory

    );

if (used) {

    alert(
        "This category is already used in Product Management.\nDelete those products first."
    );

    return;

}

categories.splice(index, 1);

await window.api.saveCategories(categories);

window.dispatchEvent(
    new Event("product-master-updated")
);

    await loadCategories();

    await loadCategoryDropdown();

});
// =====================================
// MASTER PRODUCT ACTIONS
// =====================================

document.addEventListener("click", async (e) => {
// ---------------- EDIT ----------------

const editBtn = e.target.closest(".edit-product");

if (editBtn) {

    const index = Number(editBtn.dataset.index);

    const products =
        await window.api.getMasterProducts();

    const product = products[index];

    if (!product) {
        alert("Product not found.");
        return;
    }

    masterProductCategory.value =
        product.category || "";

    masterProductName.value =
        product.name || "";

    masterUnit.value =
        product.unit || "Piece";

    editIndex = index;

    saveMasterProductBtn.innerHTML = `
        <i class="bi bi-check-circle"></i>
        Update Product
    `;

    return;
}
    // ---------------- DELETE ----------------

    const deleteBtn = e.target.closest(".delete-product");

    if (deleteBtn) {

        if (!confirm("Delete this product?"))
            return;

        const index = Number(deleteBtn.dataset.index);

        const products =
            await window.api.getMasterProducts();

        const selected = products[index];

        const savedProducts =
            await window.api.getProducts();

        const used = savedProducts.some(product =>

            product.category === selected.category &&
            product.productName === selected.name

        );

        if (used) {

            alert(
                "This product is already used in Product Management.\nDelete it there first."
            );

            return;

        }

        products.splice(index, 1);

        await window.api.saveMasterProducts(products);

        await loadMasterProducts();

        return;

    }

});
    // =====================================
    // ADD CATEGORY
    // =====================================

    saveCategoryBtn.addEventListener("click", async () => {
        

        const name = categoryInput.value.trim();

        if (name === "") {

            alert("Enter Category Name");

            return;

        }

        const categories =
            await window.api.getCategories();

        const exists =
            categories.some(c =>

                c.name.toLowerCase() ===
                name.toLowerCase()

            );

        if (exists) {

            alert("Category already exists.");

            return;

        }

        categories.push({

            id: Date.now(),

            name

        });

        console.log("Saving:", categories);

        await window.api.saveCategories(categories);
        
        const test =
            await window.api.getCategories();
        
        console.log("After Save:", test);
        
        categoryInput.value = "";
        
        await loadCategories();

        await loadCategoryDropdown();

    });
// =====================================
// ADD MASTER PRODUCT
// =====================================

saveMasterProductBtn.addEventListener("click", async () => {

    try {

        const category =
            masterProductCategory.value.trim();

        const name =
            masterProductName.value.trim();

        if (!category) {
            alert("Select Category");
            return;
        }

        if (!name) {
            alert("Enter Product Name");
            return;
        }


        const products =
            await window.api.getMasterProducts();

        const exists = products.some((product, index) =>
            index !== editIndex &&
            String(product.category || "")
                .trim()
                .toLowerCase() === category.toLowerCase() &&
            String(product.name || "")
                .trim()
                .toLowerCase() === name.toLowerCase()
        );

        if (exists) {
            alert("Product already exists.");
            return;
        }

        const data = {

    id: editIndex >= 0
        ? products[editIndex].id
        : Date.now(),

    category: category,

    name: name,

    unit: masterUnit.value || "Piece"

};

        // UPDATE
        if (editIndex >= 0) {

            products[editIndex] = data;

        }

        // ADD
        else {

            products.push(data);

        }

        await window.api.saveMasterProducts(products);

        await loadMasterProducts();

        await loadCategoryDropdown();

        window.dispatchEvent(
            new Event("product-master-updated")
        );

        alert(
            editIndex === -1
                ? "Product Added Successfully"
                : "Product Updated Successfully"
        );

        // Reset form
        masterProductCategory.value = "";

        masterProductName.value = "";

        masterUnit.value = "Piece";

        editIndex = -1;

        saveMasterProductBtn.innerHTML = `
            <i class="bi bi-plus-circle"></i>
            Save Product
        `;

    } catch (err) {

        console.error(
            "MASTER PRODUCT ERROR:",
            err
        );

        alert(err.message);

    }

});

});
