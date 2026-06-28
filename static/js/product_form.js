const API_BASE = '/api';

// ── MODE TOGGLE (new product vs restock) ──
// Only relevant on the add page, not edit page
let currentMode = 'new';

function setMode(mode) {
    currentMode = mode;
    const restockSection = document.getElementById('restockSection');
    const productForm = document.getElementById('productForm');
    const btnNew = document.getElementById('btnNewProduct');
    const btnRestock = document.getElementById('btnRestock');

    if (mode === 'restock') {
        restockSection.style.display = 'block';
        productForm.style.display = 'none';
        btnNew.className = 'btn-secondary';
        btnRestock.className = 'btn-primary';
        loadProductsForRestock();
    } else {
        restockSection.style.display = 'none';
        productForm.style.display = 'block';
        btnNew.className = 'btn-primary';
        btnRestock.className = 'btn-secondary';
    }
}

async function loadProductsForRestock() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const products = await res.json();
        const select = document.getElementById('restockSelect');
        select.innerHTML = '<option value="">-- Choose a product --</option>';
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.product_id;
            opt.textContent = p.product_name;
            opt.dataset.stock = p.quantity_in_stock;
            opt.dataset.category = p.category;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error loading products for restock:', err);
    }
}

function onRestockProductChange() {
    const select = document.getElementById('restockSelect');
    const opt = select.options[select.selectedIndex];
    const hint = document.getElementById('restockCurrentStock');
    if (opt.value) {
        hint.textContent = `Current stock: ${opt.dataset.stock} units`;
    } else {
        hint.textContent = '';
    }
}

async function submitRestock() {
    const select = document.getElementById('restockSelect');
    const opt = select.options[select.selectedIndex];
    const qty = parseInt(document.getElementById('restockQuantity').value);
    const errorEl = document.getElementById('restockError');

    errorEl.style.display = 'none';

    if (!opt.value) {
        errorEl.textContent = 'Please select a product to restock.';
        errorEl.style.display = 'block';
        return;
    }

    if (!qty || qty <= 0) {
        errorEl.textContent = 'Please enter a valid quantity.';
        errorEl.style.display = 'block';
        return;
    }

    const productId = parseInt(opt.value);
    const currentStock = parseInt(opt.dataset.stock);
    const newStock = currentStock + qty;

    try {
        const res = await fetch(`${API_BASE}/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity_in_stock: newStock })
        });

        const result = await res.json();

        if (res.ok) {
            alert(`Stock updated. ${opt.textContent} now has ${newStock} units.`);
            window.location.href = '/inventory';
        } else {
            errorEl.textContent = 'Error: ' + JSON.stringify(result);
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
    }
}

// ── EDIT MODE — load existing product data ──
const productForm = document.getElementById('productForm');
const editId = productForm.dataset.productId;

if (editId) {
    // Hide the mode toggle buttons if editing
    const btnNew = document.getElementById('btnNewProduct');
    const btnRestock = document.getElementById('btnRestock');
    if (btnNew) btnNew.style.display = 'none';
    if (btnRestock) btnRestock.style.display = 'none';

    loadProductForEdit(editId);
}

async function loadProductForEdit(id) {
    try {
        const response = await fetch(`${API_BASE}/products/${id}`);
        const product = await response.json();

        document.getElementById('productId').value = product.product_id;
        document.getElementById('productName').value = product.product_name;
        document.getElementById('description').value = product.description || '';
        document.getElementById('category').value = product.category;
        document.getElementById('buyingPrice').value = product.buying_price;
        document.getElementById('sellingPrice').value = product.selling_price;
        document.getElementById('quantityInStock').value = product.quantity_in_stock;
        document.getElementById('lowStockThreshold').value = product.low_stock_threshold;
    } catch (error) {
        console.error('Error loading product:', error);
    }
}

// ── SAVE NEW / EDIT PRODUCT ──
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const productData = {
        product_name: document.getElementById('productName').value,
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        buying_price: parseFloat(document.getElementById('buyingPrice').value),
        selling_price: parseFloat(document.getElementById('sellingPrice').value),
        quantity_in_stock: parseInt(document.getElementById('quantityInStock').value),
        low_stock_threshold: parseInt(document.getElementById('lowStockThreshold').value)
    };

    const productId = document.getElementById('productId').value;
    const url = productId ? `${API_BASE}/products/${productId}` : `${API_BASE}/products`;
    const method = productId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(productId ? 'Product updated!' : 'Product added!');
            window.location.href = '/inventory';
        } else {
            alert('Error: ' + JSON.stringify(result));
        }
    } catch (error) {
        console.error('Error saving product:', error);
    }
});