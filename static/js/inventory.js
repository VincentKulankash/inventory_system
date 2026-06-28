const API_BASE = '/api';

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        displayProducts(products);
        populateCategoryFilter(products);
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
        const statusText = isLowStock ? 'Low Stock' : 'In Stock';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.product_id}</td>
            <td>${product.product_name}</td>
            <td>${product.category}</td>
            <td class="${statusClass}">${product.quantity_in_stock}</td>
            <td>KSh${product.buying_price.toFixed(2)}</td>
            <td>KSh${product.selling_price.toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <button onclick="editProduct(${product.product_id})">Edit</button>
                <button onclick="deleteProduct(${product.product_id})" class="danger">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateCategoryFilter(products) {
    const categories = [...new Set(products.map(p => p.category))];
    const select = document.getElementById('categoryFilter');
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function filterProducts() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    fetch(`${API_BASE}/products`)
        .then(r => r.json())
        .then(products => {
            const filtered = products.filter(p => {
                const matchesSearch = p.product_name.toLowerCase().includes(search);
                const matchesCategory = !category || p.category === category;
                return matchesSearch && matchesCategory;
            });
            displayProducts(filtered);
        });
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE'
        });
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