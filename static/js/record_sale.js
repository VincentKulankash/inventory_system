const API_BASE = '/api';

let productsList = [];        // full list from API
let filteredProducts = [];    // after category filter
let paymentMethodsList = [];
let paybillsList = [];
let cart = [];

// ── INIT ──
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    try {
        // Products
        const productsRes = await fetch(`${API_BASE}/products`);
        productsList = await productsRes.json();
        filteredProducts = [...productsList];

        // Categories — populate category datalist
        const cats = [...new Set(productsList.map(p => p.category))].sort();
        const catDL = document.getElementById('categoryFilterOptions');
        catDL.innerHTML = '';
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            catDL.appendChild(opt);
        });

        // Populate initial product datalist
        rebuildProductDatalist(productsList);

        // Payment methods
        const methodsRes = await fetch(`${API_BASE}/payment-methods`);
        paymentMethodsList = await methodsRes.json();
        const methodSelect = document.getElementById('paymentMethod');
        methodSelect.innerHTML = '<option value="">-- Select payment method --</option>';
        paymentMethodsList.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.payment_method_id;
            opt.textContent = m.method_name;
            opt.dataset.name = m.method_name;
            methodSelect.appendChild(opt);
        });

        // Paybills
        const paybillsRes = await fetch(`${API_BASE}/paybills`);
        paybillsList = await paybillsRes.json();

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ── CATEGORY FILTER ──
function onCategoryFilter() {
    const cat = document.getElementById('categorySearch').value.trim().toLowerCase();

    filteredProducts = cat
        ? productsList.filter(p => p.category.toLowerCase().includes(cat))
        : [...productsList];

    // Clear any selected product since the list changed
    document.getElementById('productSearch').value = '';
    document.getElementById('selectedProductId').value = '';
    document.getElementById('stockInfo').textContent = '';

    rebuildProductDatalist(filteredProducts);
}

// ── PRODUCT DATALIST ──
function rebuildProductDatalist(list) {
    const dl = document.getElementById('productOptions');
    dl.innerHTML = '';
    list.forEach(p => {
        const opt = document.createElement('option');
        // Value is what shows in the input; we resolve the ID on selection
        opt.value = p.product_name;
        opt.dataset.id = p.product_id;
        dl.appendChild(opt);
    });
}

// ── PRODUCT SEARCH / SELECTION ──
function onProductSearch() {
    const typed = document.getElementById('productSearch').value.trim();

    // Find an exact match in the current filtered list
    const match = filteredProducts.find(
        p => p.product_name.toLowerCase() === typed.toLowerCase()
    );

    if (match) {
        document.getElementById('selectedProductId').value = match.product_id;
        document.getElementById('stockInfo').textContent =
            `Available stock: ${match.quantity_in_stock} units  |  Price: KSh${parseFloat(match.selling_price).toFixed(2)}`;
    } else {
        document.getElementById('selectedProductId').value = '';
        document.getElementById('stockInfo').textContent = '';
    }

    updatePreview();
}

// ── CART ──
function addItemToCart() {
    const productId = parseInt(document.getElementById('selectedProductId').value);
    const qty = parseInt(document.getElementById('quantitySold').value);

    if (!productId) { showError('Please select a valid product from the list.'); return; }
    if (!qty || qty <= 0) { showError('Please enter a valid quantity.'); return; }

    const product = filteredProducts.find(p => p.product_id === productId)
                 || productsList.find(p => p.product_id === productId);
    if (!product) { showError('Product not found. Please select again.'); return; }

    const existing = cart.find(i => i.productId === productId);
    const alreadyInCart = existing ? existing.quantity : 0;
    const remaining = product.quantity_in_stock - alreadyInCart;

    if (qty > remaining) {
        showError(`Only ${remaining} unit(s) available for ${product.product_name}.`);
        return;
    }

    hideError();

    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            productId: product.product_id,
            name: product.product_name,
            sellingPrice: parseFloat(product.selling_price),
            buyingPrice: parseFloat(product.buying_price),
            stock: product.quantity_in_stock,
            quantity: qty
        });
    }

    // Reset product selection
    document.getElementById('productSearch').value = '';
    document.getElementById('selectedProductId').value = '';
    document.getElementById('quantitySold').value = '';
    document.getElementById('stockInfo').textContent = '';

    renderCart();
    updatePreview();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.productId !== productId);
    renderCart();
    updatePreview();
}

function clearCart() {
    cart = [];
    renderCart();
    updatePreview();
    hideError();
}

function renderCart() {
    const cartSection = document.getElementById('cartSection');
    const cartBody = document.getElementById('cartBody');
    if (cart.length === 0) { cartSection.style.display = 'none'; return; }

    cartSection.style.display = 'block';
    cartBody.innerHTML = '';
    cart.forEach(item => {
        const subtotal = item.quantity * item.sellingPrice;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>KSh${item.sellingPrice.toFixed(2)}</td>
            <td>KSh${subtotal.toFixed(2)}</td>
            <td><button type="button" class="danger" onclick="removeFromCart(${item.productId})">Remove</button></td>
        `;
        cartBody.appendChild(tr);
    });
}

// ── PREVIEW ──
function updatePreview() {
    let totalRevenue = 0, totalProfit = 0;
    cart.forEach(item => {
        totalRevenue += item.quantity * item.sellingPrice;
        totalProfit += item.quantity * (item.sellingPrice - item.buyingPrice);
    });
    document.getElementById('previewRevenue').textContent = `KSh${totalRevenue.toFixed(2)}`;
    document.getElementById('previewProfit').textContent = `KSh${totalProfit.toFixed(2)}`;
}

// ── PAYMENT METHOD ──
function onPaymentMethodChange() {
    const select = document.getElementById('paymentMethod');
    const opt = select.options[select.selectedIndex];
    const paybillGroup = document.getElementById('paybillGroup');
    const paybillSelect = document.getElementById('paybillSelect');
    const paybillHint = document.getElementById('paybillHint');

    if (opt.dataset.name && opt.dataset.name.toLowerCase() === 'mpesa') {
        paybillGroup.style.display = 'block';
        const mpesaPaybills = paybillsList.filter(
            p => p.payment_method_id === parseInt(select.value)
        );
        paybillSelect.innerHTML = '<option value="">-- Select business number --</option>';
        if (mpesaPaybills.length === 0) {
            paybillHint.textContent = 'No business numbers configured yet.';
        } else {
            paybillHint.textContent = '';
            mpesaPaybills.forEach(p => {
                const o = document.createElement('option');
                o.value = p.paybill_id;
                o.textContent = `${p.paybill_name} (${p.paybill_number})`;
                paybillSelect.appendChild(o);
            });
        }
    } else {
        paybillGroup.style.display = 'none';
        paybillSelect.value = '';
    }
}

// ── SUBMIT ──
document.getElementById('saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    if (cart.length === 0) { showError('Please add at least one item to the sale.'); return; }

    const paymentMethodId = parseInt(document.getElementById('paymentMethod').value);
    if (!paymentMethodId) { showError('Please select a payment method.'); return; }

    const methodOpt = document.getElementById('paymentMethod');
    const selectedMethodName = methodOpt.options[methodOpt.selectedIndex].dataset.name || '';
    const paybillId = document.getElementById('paybillSelect').value
        ? parseInt(document.getElementById('paybillSelect').value) : null;

    if (selectedMethodName.toLowerCase() === 'mpesa' && !paybillId) {
        showError('Please select an Mpesa business number.');
        return;
    }

    try {
        for (const item of cart) {
            const res = await fetch(`${API_BASE}/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: item.productId,
                    quantity_sold: item.quantity,
                    payment_method_id: paymentMethodId,
                    paybill_id: paybillId
                })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || `Failed to record sale for ${item.name}`);
        }

        alert('Sale recorded successfully!');
        clearCart();
        document.getElementById('paymentMethod').value = '';
        document.getElementById('paybillGroup').style.display = 'none';
        document.getElementById('categorySearch').value = '';
        filteredProducts = [...productsList];
        rebuildProductDatalist(productsList);
        loadData();

    } catch (error) {
        showError(error.message || 'Something went wrong. Please try again.');
    }
});

// ── ERROR HELPERS ──
function showError(msg) {
    const el = document.getElementById('saleError');
    el.textContent = msg;
    el.style.display = 'block';
}
function hideError() {
    document.getElementById('saleError').style.display = 'none';
}