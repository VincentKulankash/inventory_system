const API_BASE = '/api';

let showDiscontinued = false;

async function loadProducts() {
    try {
        const url = showDiscontinued
            ? `${API_BASE}/products?show_discontinued=true`
            : `${API_BASE}/products`;
        const response = await fetch(url);
        const products = await response.json();
        displayProducts(products);
        populateCategoryDatalist(products);
        updateToggleButton();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#7f8c8d; padding:2rem;">
            No products found.</td></tr>`;
        return;
    }

    products.forEach(product => {
        const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
        const discontinued = !product.is_active;

        // ── Collapsed-row values (Option B: summarized for variant products) ──
        let stockCell, buyingCell, sellingCell, isLowStock;

        if (hasVariants) {
            const activeVariants = product.variants;
            const totalStock = activeVariants.reduce((sum, v) => sum + v.quantity_in_stock, 0);
            isLowStock = activeVariants.some(v => v.quantity_in_stock <= v.low_stock_threshold);

            stockCell = `${totalStock} <span class="stock-info">(${activeVariants.length} variant${activeVariants.length > 1 ? 's' : ''})</span>`;

            const buyPrices = activeVariants.map(v => v.buying_price);
            const sellPrices = activeVariants.map(v => v.selling_price);
            buyingCell = formatPriceRange(buyPrices);
            sellingCell = formatPriceRange(sellPrices);
        } else {
            isLowStock = product.quantity_in_stock <= product.low_stock_threshold;
            stockCell = product.quantity_in_stock;
            buyingCell = `KSh${product.buying_price.toFixed(2)}`;
            sellingCell = `KSh${product.selling_price.toFixed(2)}`;
        }

        let statusClass, statusText;
        if (discontinued) {
            statusClass = 'discontinued';
            statusText = 'Discontinued';
        } else if (isLowStock) {
            statusClass = 'low-stock';
            statusText = 'Low Stock';
        } else {
            statusClass = 'in-stock';
            statusText = 'In Stock';
        }

        const actionBtn = discontinued
            ? `<button onclick="restoreProduct(${product.product_id})" class="btn-restore">Restore</button>`
            : `<button onclick="discontinueProduct(${product.product_id})" class="btn-discontinue">Discontinue</button>`;

        const row = document.createElement('tr');
        if (discontinued) row.style.opacity = '0.55';

        const expandCell = hasVariants
            ? `<button type="button" class="expand-toggle" onclick="toggleVariantRow(${product.product_id})" id="expandBtn-${product.product_id}">▶</button>`
            : '';

        row.innerHTML = `
            <td>${expandCell}</td>
            <td>${product.product_id}</td>
            <td>${product.product_name}</td>
            <td>${product.category}</td>
            <td class="${isLowStock && !discontinued ? 'low-stock' : ''}">${stockCell}</td>
            <td>${buyingCell}</td>
            <td>${sellingCell}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <button onclick="editProduct(${product.product_id})">Edit</button>
                ${actionBtn}
            </td>
        `;
        tbody.appendChild(row);

        // ── Hidden detail row with full variant breakdown ──
        if (hasVariants) {
            const detailRow = document.createElement('tr');
            detailRow.id = `variantRow-${product.product_id}`;
            detailRow.className = 'variant-detail-row';
            detailRow.style.display = 'none';

            const variantRowsHtml = product.variants.map(v => {
                const vLow = v.quantity_in_stock <= v.low_stock_threshold;
                return `
                    <tr>
                        <td>${v.label}</td>
                        <td class="${vLow ? 'low-stock' : ''}">${v.quantity_in_stock}</td>
                        <td>KSh${v.buying_price.toFixed(2)}</td>
                        <td>KSh${v.selling_price.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');

            detailRow.innerHTML = `
                <td></td>
                <td colspan="8">
                    <table class="variant-subtable">
                        <thead>
                            <tr><th>Variant</th><th>Stock</th><th>Buying Price</th><th>Selling Price</th></tr>
                        </thead>
                        <tbody>${variantRowsHtml}</tbody>
                    </table>
                </td>
            `;
            tbody.appendChild(detailRow);
        }
    });
}

function formatPriceRange(prices) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `KSh${min.toFixed(2)}`;
    return `KSh${min.toFixed(2)} – KSh${max.toFixed(2)}`;
}

function toggleVariantRow(productId) {
    const row = document.getElementById(`variantRow-${productId}`);
    const btn = document.getElementById(`expandBtn-${productId}`);
    if (!row) return;
    const isOpen = row.style.display !== 'none';
    row.style.display = isOpen ? 'none' : 'table-row';
    if (btn) btn.textContent = isOpen ? '▶' : '▼';
}

function populateCategoryDatalist(products) {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const dl = document.getElementById('categoryOptions');
    dl.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        dl.appendChild(opt);
    });
}

function filterProducts() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const category = document.getElementById('categoryFilter').value.trim();

    let url = showDiscontinued
        ? `${API_BASE}/products?show_discontinued=true`
        : `${API_BASE}/products`;
    if (category) url += `${url.includes('?') ? '&' : '?'}category=${encodeURIComponent(category)}`;

    fetch(url)
        .then(r => r.json())
        .then(products => {
            const filtered = search
                ? products.filter(p => p.product_name.toLowerCase().includes(search))
                : products;
            displayProducts(filtered);
        });
}

function toggleDiscontinued() {
    showDiscontinued = !showDiscontinued;
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    loadProducts();
}

function updateToggleButton() {
    const btn = document.getElementById('toggleDiscontinuedBtn');
    if (!btn) return;
    btn.textContent = showDiscontinued ? '👁 Hide Discontinued' : '👁 Show Discontinued';
    btn.className = showDiscontinued ? 'btn-primary' : 'btn-secondary';
}

async function discontinueProduct(id) {
    if (!confirm('Discontinue this product? It will be hidden from inventory and record sale.')) return;
    try {
        const res = await fetch(`${API_BASE}/products/${id}/discontinue`, { method: 'PUT' });
        const result = await res.json();
        if (res.ok) {
            showToast(result.message, 'warning');
            loadProducts();
        } else {
            alert('Error: ' + (result.error || 'Something went wrong.'));
        }
    } catch (error) {
        console.error('Error discontinuing product:', error);
    }
}

async function restoreProduct(id) {
    try {
        const res = await fetch(`${API_BASE}/products/${id}/restore`, { method: 'PUT' });
        const result = await res.json();
        if (res.ok) {
            showToast(result.message, 'success');
            loadProducts();
        } else {
            alert('Error: ' + (result.error || 'Something went wrong.'));
        }
    } catch (error) {
        console.error('Error restoring product:', error);
    }
}

function editProduct(id) {
    window.location.href = `/products/${id}/edit`;
}

// ── Toast notification (nicer than alert) ──
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem;
        background: ${type === 'success' ? '#27ae60' : '#e67e22'};
        color: white; padding: 1rem 1.5rem; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-weight: 600;
        z-index: 9999; transition: opacity 0.4s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
}

document.addEventListener('DOMContentLoaded', loadProducts);