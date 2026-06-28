const API_BASE = '/api';

/// Check if editing existing product
const productForm = document.getElementById('productForm');
const editId = productForm.dataset.productId;

if (editId) {
    document.getElementById('formTitle').textContent = '✏️ Edit Product';
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