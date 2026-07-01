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
        const isLowStock = product.quantity_in_stock <= product.low_stock_threshold;
        const discontinued = !product.is_active;

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

        row.innerHTML = `
            <td>${product.product_id}</td>
            <td>${product.product_name}</td>
            <td>${product.category}</td>
            <td class="${isLowStock && !discontinued ? 'low-stock' : ''}">${product.quantity_in_stock}</td>
            <td>KSh${product.buying_price.toFixed(2)}</td>
            <td>KSh${product.selling_price.toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <button onclick="editProduct(${product.product_id})">Edit</button>
                ${actionBtn}
            </td>
        `;
        tbody.appendChild(row);
    });
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