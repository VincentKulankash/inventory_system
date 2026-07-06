const API_BASE = '/api';
let currentMode = 'new';
let productHasVariants = false;

// ── MODE TOGGLE ──
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

// ── RESTOCK ──
let restockProductsMap = {};

async function loadProductsForRestock() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const products = await res.json();
        restockProductsMap = {};
        const select = document.getElementById('restockSelect');
        select.innerHTML = '<option value="">-- Choose a product --</option>';
        products.forEach(p => {
            restockProductsMap[p.product_id] = p;
            const opt = document.createElement('option');
            opt.value = p.product_id;
            opt.textContent = p.product_name + (p.variants && p.variants.length > 0 ? ' (has variants)' : '');
            opt.dataset.stock = p.quantity_in_stock;
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
    const variantGroup = document.getElementById('restockVariantGroup');
    const variantSelect = document.getElementById('restockVariantSelect');
    const variantHint = document.getElementById('restockVariantCurrentStock');

    variantSelect.innerHTML = '<option value="">-- Choose a variant --</option>';
    variantHint.textContent = '';

    if (!opt.value) {
        hint.textContent = '';
        variantGroup.style.display = 'none';
        return;
    }

    const product = restockProductsMap[opt.value];
    const hasVariants = product && product.variants && product.variants.length > 0;

    if (hasVariants) {
        hint.textContent = 'This product has variants — choose one below to restock.';
        product.variants.forEach(v => {
            const vOpt = document.createElement('option');
            vOpt.value = v.variant_id;
            vOpt.textContent = `${v.label}  (Stock: ${v.quantity_in_stock})`;
            vOpt.dataset.stock = v.quantity_in_stock;
            variantSelect.appendChild(vOpt);
        });
        variantGroup.style.display = 'block';
    } else {
        hint.textContent = `Current stock: ${opt.dataset.stock} units`;
        variantGroup.style.display = 'none';
    }
}

function onRestockVariantChange() {
    const select = document.getElementById('restockVariantSelect');
    const opt = select.options[select.selectedIndex];
    const hint = document.getElementById('restockVariantCurrentStock');
    hint.textContent = opt.value ? `Current stock: ${opt.dataset.stock} units` : '';
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

    const product = restockProductsMap[opt.value];
    const hasVariants = product && product.variants && product.variants.length > 0;

    if (hasVariants) {
        const variantSelect = document.getElementById('restockVariantSelect');
        const variantOpt = variantSelect.options[variantSelect.selectedIndex];

        if (!variantOpt.value) {
            errorEl.textContent = 'This product has variants — please select which one to restock.';
            errorEl.style.display = 'block';
            return;
        }

        const newStock = parseInt(variantOpt.dataset.stock) + qty;
        try {
            const res = await fetch(`${API_BASE}/variants/${variantOpt.value}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity_in_stock: newStock })
            });
            const result = await res.json();
            if (res.ok) {
                alert(`Stock updated. ${opt.textContent.replace(' (has variants)', '')} — ${variantOpt.dataset.label || variantOpt.textContent} now has ${newStock} units.`);
                window.location.href = '/inventory';
            } else {
                errorEl.textContent = 'Error: ' + JSON.stringify(result);
                errorEl.style.display = 'block';
            }
        } catch (err) {
            errorEl.textContent = 'Something went wrong. Please try again.';
            errorEl.style.display = 'block';
        }
        return;
    }

    const newStock = parseInt(opt.dataset.stock) + qty;
    try {
        const res = await fetch(`${API_BASE}/products/${opt.value}`, {
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

// ── CATEGORY DATALIST ──
async function loadCategoryOptions(selectedValue = '') {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        const categories = await res.json();
        const datalist = document.getElementById('categoryOptions');
        if (!datalist) return;
        datalist.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            datalist.appendChild(opt);
        });
        if (selectedValue) {
            document.getElementById('category').value = selectedValue;
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

// ── VARIANT PRICE NOTICE ──
// Called after variants are loaded — if any exist, disable price/stock fields
function updatePriceStockVisibility(hasVariants) {
    productHasVariants = hasVariants;
    const priceSection = document.getElementById('priceStockSection');
    const notice = document.getElementById('variantPriceNotice');

    if (hasVariants) {
        // Disable all inputs inside the price/stock section
        priceSection.querySelectorAll('input').forEach(input => {
            input.disabled = true;
            input.style.background = '#f0f0f0';
            input.style.color = '#999';
            input.removeAttribute('required');
        });
        notice.style.display = 'block';
    } else {
        priceSection.querySelectorAll('input').forEach(input => {
            input.disabled = false;
            input.style.background = '';
            input.style.color = '';
        });
        notice.style.display = 'none';
    }
}

// ── VARIANTS ──
async function loadVariants(productId) {
    try {
        const res = await fetch(`${API_BASE}/products/${productId}/variants`);
        const variants = await res.json();
        renderVariants(variants);
        updatePriceStockVisibility(variants.length > 0);
    } catch (err) {
        console.error('Error loading variants:', err);
    }
}

function renderVariants(variants) {
    const tbody = document.getElementById('variantsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (variants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#7f8c8d; padding:1rem;">
            No variants yet. Add one below.</td></tr>`;
        return;
    }

    variants.forEach(v => {
        const isLow = v.quantity_in_stock <= v.low_stock_threshold;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v.size || '—'}</td>
            <td>${v.color || '—'}</td>
            <td>${v.material || '—'}</td>
            <td>KSh${v.buying_price.toFixed(2)}</td>
            <td>KSh${v.selling_price.toFixed(2)}</td>
            <td class="${isLow ? 'low-stock' : ''}">${v.quantity_in_stock}</td>
            <td><span class="badge ${v.is_active ? 'in-stock' : 'low-stock'}">
                ${v.is_active ? 'Active' : 'Discontinued'}</span></td>
            <td>
                ${v.is_active
                    ? `<button type="button" class="btn-discontinue"
                         onclick="discontinueVariant(${v.variant_id})">Discontinue</button>`
                    : `<button type="button" class="btn-restore"
                         onclick="restoreVariant(${v.variant_id})">Restore</button>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addVariant() {
    const productId = document.getElementById('productId').value;
    const errorEl = document.getElementById('variantError');
    errorEl.style.display = 'none';

    const buyingPrice = parseFloat(document.getElementById('vBuyingPrice').value);
    const sellingPrice = parseFloat(document.getElementById('vSellingPrice').value);
    const quantity = parseInt(document.getElementById('vQuantity').value);

    if (!buyingPrice || buyingPrice <= 0) {
        errorEl.textContent = 'Buying price is required.';
        errorEl.style.display = 'block';
        return;
    }
    if (!sellingPrice || sellingPrice <= 0) {
        errorEl.textContent = 'Selling price is required.';
        errorEl.style.display = 'block';
        return;
    }
    if (isNaN(quantity) || quantity < 0) {
        errorEl.textContent = 'Please enter a valid quantity.';
        errorEl.style.display = 'block';
        return;
    }

    const variantData = {
        size:               document.getElementById('vSize').value.trim() || null,
        color:              document.getElementById('vColor').value.trim() || null,
        material:           document.getElementById('vMaterial').value.trim() || null,
        buying_price:       buyingPrice,
        selling_price:      sellingPrice,
        quantity_in_stock:  quantity,
        low_stock_threshold: parseInt(document.getElementById('vThreshold').value) || 5
    };

    try {
        const res = await fetch(`${API_BASE}/products/${productId}/variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variantData)
        });
        const result = await res.json();

        if (res.ok) {
            // Clear the form
            ['vSize','vColor','vMaterial','vBuyingPrice','vSellingPrice','vQuantity'].forEach(
                id => { document.getElementById(id).value = ''; }
            );
            document.getElementById('vThreshold').value = '5';
            // Reload variants
            loadVariants(productId);
        } else {
            errorEl.textContent = result.error || 'Failed to add variant.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function discontinueVariant(variantId) {
    if (!confirm('Discontinue this variant? It will no longer appear in sales.')) return;
    try {
        const res = await fetch(`${API_BASE}/variants/${variantId}/discontinue`, { method: 'PUT' });
        if (res.ok) loadVariants(document.getElementById('productId').value);
    } catch (err) {
        console.error('Error discontinuing variant:', err);
    }
}

async function restoreVariant(variantId) {
    try {
        const res = await fetch(`${API_BASE}/variants/${variantId}/restore`, { method: 'PUT' });
        if (res.ok) loadVariants(document.getElementById('productId').value);
    } catch (err) {
        console.error('Error restoring variant:', err);
    }
}

// ── EDIT MODE ──
const productForm = document.getElementById('productForm');
const editId = productForm ? productForm.dataset.productId : null;

if (editId) {
    const btnNew = document.getElementById('btnNewProduct');
    const btnRestock = document.getElementById('btnRestock');
    if (btnNew) btnNew.style.display = 'none';
    if (btnRestock) btnRestock.style.display = 'none';
    loadProductForEdit(editId);
    loadVariants(editId);
} else {
    loadCategoryOptions();
}

async function loadProductForEdit(id) {
    try {
        const response = await fetch(`${API_BASE}/products/${id}`);
        const product = await response.json();
        document.getElementById('productId').value = product.product_id;
        document.getElementById('productName').value = product.product_name;
        document.getElementById('description').value = product.description || '';
        document.getElementById('buyingPrice').value = product.buying_price;
        document.getElementById('sellingPrice').value = product.selling_price;
        document.getElementById('quantityInStock').value = product.quantity_in_stock;
        document.getElementById('lowStockThreshold').value = product.low_stock_threshold;
        await loadCategoryOptions(product.category);
    } catch (error) {
        console.error('Error loading product:', error);
    }
}

// ── SAVE PRODUCT ──
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const productData = {
        product_name: document.getElementById('productName').value.trim(),
        description:  document.getElementById('description').value.trim(),
        category:     document.getElementById('category').value.trim(),
    };

    // Only include price and stock if not a variant product
    if (!productHasVariants) {
        const buyingPrice = parseFloat(document.getElementById('buyingPrice').value);
        const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
        const quantity = parseInt(document.getElementById('quantityInStock').value);

        if (!buyingPrice || !sellingPrice || isNaN(quantity)) {
            alert('Please fill in buying price, selling price, and quantity.');
            return;
        }
        productData.buying_price      = buyingPrice;
        productData.selling_price     = sellingPrice;
        productData.quantity_in_stock = quantity;
        productData.low_stock_threshold = parseInt(document.getElementById('lowStockThreshold').value) || 5;
    } else {
        // Variant product — set placeholder values so backend does not reject
        productData.buying_price      = 0;
        productData.selling_price     = 0;
        productData.quantity_in_stock = 0;
        productData.low_stock_threshold = 5;
    }

    const productId = document.getElementById('productId').value;
    const url    = productId ? `${API_BASE}/products/${productId}` : `${API_BASE}/products`;
    const method = productId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        const result = await response.json();
        if (response.ok) {
            alert(productId ? 'Product updated!' : 'Product added! You can now add variants from the edit page.');
            window.location.href = productId ? `/products/${productId}/edit` : '/inventory';
        } else {
            alert('Error: ' + JSON.stringify(result));
        }
    } catch (error) {
        console.error('Error saving product:', error);
    }
});