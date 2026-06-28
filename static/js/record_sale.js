const API_BASE = '/api';
let productsList = [];
let paymentMethodsList = [];
let paybillsList = [];

async function loadData() {
    try {
        const productsRes = await fetch(`${API_BASE}/products`);
        productsList = await productsRes.json();
        const productSelect = document.getElementById('productSelect');
        productsList.forEach(p => {
            const option = document.createElement('option');
            option.value = p.product_id;
            option.textContent = `${p.product_name} (Stock: ${p.quantity_in_stock})`;
            option.dataset.stock = p.quantity_in_stock;
            option.dataset.sellingPrice = p.selling_price;
            option.dataset.buyingPrice = p.buying_price;
            productSelect.appendChild(option);
        });
        
        const methodsRes = await fetch(`${API_BASE}/payment-methods`);
        paymentMethodsList = await methodsRes.json();
        const methodSelect = document.getElementById('paymentMethod');
        paymentMethodsList.forEach(m => {
            const option = document.createElement('option');
            option.value = m.payment_method_id;
            option.textContent = m.method_name;
            methodSelect.appendChild(option);
        });
        
        const paybillsRes = await fetch(`${API_BASE}/paybills`);
        paybillsList = await paybillsRes.json();
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

document.getElementById('productSelect').addEventListener('change', function() {
    const option = this.options[this.selectedIndex];
    const stock = option.dataset.stock;
    document.getElementById('stockInfo').textContent = stock ? `Available stock: ${stock}` : '';
    updatePreview();
});

document.getElementById('quantitySold').addEventListener('input', updatePreview);

document.getElementById('paymentMethod').addEventListener('change', function() {
    const methodName = this.options[this.selectedIndex].textContent;
    const paybillGroup = document.getElementById('paybillGroup');
    const paybillSelect = document.getElementById('paybillSelect');
    
    if (methodName.toLowerCase().includes('mpesa') || methodName.toLowerCase().includes('mobile')) {
        paybillGroup.style.display = 'block';
        paybillSelect.innerHTML = '<option value="">-- Select paybill --</option>';
        const filtered = paybillsList.filter(p => p.payment_method_id == this.value);
        filtered.forEach(p => {
            const option = document.createElement('option');
            option.value = p.paybill_id;
            option.textContent = `${p.paybill_name} (${p.paybill_number})`;
            paybillSelect.appendChild(option);
        });
    } else {
        paybillGroup.style.display = 'none';
    }
});

function updatePreview() {
    const productSelect = document.getElementById('productSelect');
    const quantity = parseInt(document.getElementById('quantitySold').value) || 0;
    const option = productSelect.options[productSelect.selectedIndex];
    
    if (!option.value || !quantity) {
        document.getElementById('previewRevenue').textContent = 'KSh0.00';
        document.getElementById('previewProfit').textContent = 'KSh0.00';
        return;
    }
    
    const sellingPrice = parseFloat(option.dataset.sellingPrice);
    const buyingPrice = parseFloat(option.dataset.buyingPrice);
    const revenue = quantity * sellingPrice;
    const profit = quantity * (sellingPrice - buyingPrice);
    
    document.getElementById('previewRevenue').textContent = `KSh${revenue.toFixed(2)}`;
    document.getElementById('previewProfit').textContent = `KSh${profit.toFixed(2)}`;
}

document.getElementById('saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = parseInt(document.getElementById('productSelect').value);
    const quantity = parseInt(document.getElementById('quantitySold').value);
    const paymentMethodId = parseInt(document.getElementById('paymentMethod').value);
    const paybillId = document.getElementById('paybillSelect').value || null;
    
    const product = productsList.find(p => p.product_id === productId);
    if (quantity > product.quantity_in_stock) {
        alert('Not enough stock!');
        return;
    }
    
    const saleData = {
        product_id: productId,
        quantity_sold: quantity,
        payment_method_id: paymentMethodId,
        paybill_id: paybillId
    };
    
    try {
        const response = await fetch(`${API_BASE}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Sale recorded successfully!');
            document.getElementById('saleForm').reset();
            document.getElementById('salePreview').style.display = 'none';
            loadData();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error recording sale:', error);
    }
});

document.addEventListener('DOMContentLoaded', loadData);