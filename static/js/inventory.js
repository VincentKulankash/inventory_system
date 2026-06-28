const API_BASE = '/api';

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        displayProducts(products);
        populateCategoryDatalist(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';
    products.forEach(product => {
        const isLowStock = product.quantity_in_stock <= product.low_stock_threshold;
        const statusClass = isLowStock ? 'low-stock' : 'in-stock';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.product_id}</td>
            <td>${product.product_name}</td>
            <td>${product.category}</td>
            <td class="${statusClass}">${product.quantity_in_stock}</td>
            <td>KSh${product.buying_price.toFixed(2)}</td>
            <td>KSh${product.selling_price.toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${isLowStock ? 'Low Stock' : 'In Stock'}</span></td>
            <td>
                <button onclick="editProduct(${product.product_id})">Edit</button>
                <button onclick="deleteProduct(${product.product_id})" class="danger">Delete</button>
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

    const url = category
        ? `${API_BASE}/products?category=${encodeURIComponent(category)}`
        : `${API_BASE}/products`;

    fetch(url)
        .then(r => r.json())
        .then(products => {
            const filtered = search
                ? products.filter(p => p.product_name.toLowerCase().includes(search))
                : products;
            displayProducts(filtered);
        });
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        const response = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
        const result = await response.json();
        alert(result.message);
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}

function editProduct(id) {
    window.location.href = `/products/${id}/edit`;
}

document.addEventListener('DOMContentLoaded', loadProducts);