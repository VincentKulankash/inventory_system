const API_BASE = '/api';

// ── STATE ──
let productsList = [];
let paymentMethodsList = [];
let paybillsList = [];
let cart = [];

// ── INIT ──
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    try {
        // Load products — clear first to prevent duplicates
        const productsRes = await fetch(`${API_BASE}/products`);
        productsList = await productsRes.json();
        const productSelect = document.getElementById('productSelect');
        productSelect.innerHTML = '<option value="">-- Choose a product --</option>';
        productsList.forEach(p => {
            const option = document.createElement('option');
            option.value = p.product_id;
            option.textContent = `${p.product_name} (Stock: ${p.quantity_in_stock})`;
            option.dataset.stock = p.quantity_in_stock;
            option.dataset.sellingPrice = p.selling_price;
            option.dataset.buyingPrice = p.buying_price;
            option.dataset.name = p.product_name;
            productSelect.appendChild(option);
        });

        // Load payment methods — clear first to prevent duplicates
        const methodsRes = await fetch(`${API_BASE}/payment-methods`);
        paymentMethodsList = await methodsRes.json();
        const methodSelect = document.getElementById('paymentMethod');
        methodSelect.innerHTML = '<option value="">-- Select payment method --</option>';
        paymentMethodsList.forEach(m => {
            const option = document.createElement('option');
            option.value = m.payment_method_id;
            option.textContent = m.method_name;
            option.dataset.name = m.method_name;
            methodSelect.appendChild(option);
        });

        // Load paybills — store for later
        const paybillsRes = await fetch(`${API_BASE}/paybills`);
        paybillsList = await paybillsRes.json();

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ── PRODUCT SELECTION ──
document.getElementById('productSelect').addEventListener('change', function() {
    const option = this.options[this.selectedIndex];
    const stock = option.dataset.stock;
    document.getElementById('stockInfo').textContent = stock ? `Available stock: ${stock}` : '';
    updatePreview();
});

document.getElementById('quantitySold').addEventListener('input', updatePreview);

// ── PAYMENT METHOD ──
function onPaymentMethodChange() {
    const select = document.getElementById('paymentMethod');
    const opt = select.options[select.selectedIndex];
    const paybillGroup = document.getElementById('paybillGroup');
    const paybillSelect = document.getElementById('paybillSelect');
    const paybillHint = document.getElementById('paybillHint');

    if (opt.dataset.name && opt.dataset.name.toLowerCase() === 'mpesa') {
        paybillGroup.style.display = 'block';

        // Populate paybills — clear first
        const mpesaPaybills = paybillsList.filter(
            p => p.payment_method_id === parseInt(select.value)
        );
        paybillSelect.innerHTML = '<option value="">-- Select business number --</option>';

        if (mpesaPaybills.length === 0) {
            paybillHint.textContent = 'No business numbers configured yet. Contact your administrator.';
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

// ── CART ──
function addItemToCart() {
    const select = document.getElementById('productSelect');
    const opt = select.options[select.selectedIndex];
    const qty = parseInt(document.getElementById('quantitySold').value);

    if (!opt.value) {
        showError('Please select a product.');
        return;
    }
    if (!qty || qty <= 0) {
        showError('Please enter a valid quantity.');
        return;
    }

    const productId = parseInt(opt.value);
    const stock = parseInt(opt.dataset.stock);

    // Check stock accounting for items already in cart
    const existingItem = cart.find(i => i.productId === productId);
    const alreadyInCart = existingItem ? existingItem.quantity : 0;
    const remaining = stock - alreadyInCart;

    if (qty > remaining) {
        showError(`Only ${remaining} unit(s) available for ${opt.dataset.name}.`);
        return;
    }

    hideError();

    if (existingItem) {
        existingItem.quantity += qty;
    } else {
        cart.push({
            productId,
            name: opt.dataset.name,
            sellingPrice: parseFloat(opt.dataset.sellingPrice),
            buyingPrice: parseFloat(opt.dataset.buyingPrice),
            stock,
            quantity: qty
        });
    }

    // Reset selectors
    select.value = '';
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

    if (cart.length === 0) {
        cartSection.style.display = 'none';
        return;
    }

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
    let totalRevenue = 0;
    let totalProfit = 0;

    cart.forEach(item => {
        totalRevenue += item.quantity * item.sellingPrice;
        totalProfit += item.quantity * (item.sellingPrice - item.buyingPrice);
    });

    document.getElementById('previewRevenue').textContent = `KSh${totalRevenue.toFixed(2)}`;
    document.getElementById('previewProfit').textContent = `KSh${totalProfit.toFixed(2)}`;
}

// ── SUBMIT ──
document.getElementById('saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    // Validate cart has items
    if (cart.length === 0) {
        showError('Please add at least one item to the sale.');
        return;
    }

    // Validate payment method
    const paymentMethodId = parseInt(document.getElementById('paymentMethod').value);
    if (!paymentMethodId) {
        showError('Please select a payment method.');
        return;
    }

    // Validate paybill if Mpesa
    const methodOpt = document.getElementById('paymentMethod');
    const selectedMethodName = methodOpt.options[methodOpt.selectedIndex].dataset.name || '';
    const paybillId = document.getElementById('paybillSelect').value
        ? parseInt(document.getElementById('paybillSelect').value)
        : null;

    if (selectedMethodName.toLowerCase() === 'mpesa' && !paybillId) {
        showError('Please select an Mpesa business number.');
        return;
    }

    try {
        // Post each cart item as a separate sale record
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
            if (!res.ok) {
                throw new Error(result.error || `Failed to record sale for ${item.name}`);
            }
        }

        alert('Sale recorded successfully!');
        clearCart();
        document.getElementById('paymentMethod').value = '';
        document.getElementById('paybillGroup').style.display = 'none';
        // Reload to get fresh stock counts — clears dropdowns correctly
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