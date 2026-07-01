const API_BASE = '/api';

let mpesaMethodId = null;  // track Mpesa's ID so we know when to show paybills

// ── INIT ──
document.addEventListener('DOMContentLoaded', loadPaymentMethods);

async function loadPaymentMethods() {
    try {
        const res = await fetch(`${API_BASE}/payment-methods`);
        const methods = await res.json();
        const tbody = document.getElementById('methodsBody');
        tbody.innerHTML = '';
        mpesaMethodId = null;

        methods.forEach(m => {
            // Track Mpesa ID for paybill section
            if (m.method_name.toLowerCase() === 'mpesa') {
                mpesaMethodId = m.payment_method_id;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${m.payment_method_id}</td>
                <td>${m.method_name}</td>
                <td>
                    <button class="danger" onclick="deletePaymentMethod(${m.payment_method_id}, '${m.method_name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Show paybill section only if Mpesa exists
        const paybillSection = document.getElementById('paybillSection');
        if (mpesaMethodId) {
            paybillSection.style.display = 'block';
            loadPaybills();
        } else {
            paybillSection.style.display = 'none';
        }

    } catch (err) {
        console.error('Error loading payment methods:', err);
    }
}

async function loadPaybills() {
    try {
        const res = await fetch(`${API_BASE}/paybills`);
        const all = await res.json();
        // Only show paybills linked to Mpesa
        const mpesaPaybills = all.filter(p => p.payment_method_id === mpesaMethodId);
        const tbody = document.getElementById('paybillsBody');
        tbody.innerHTML = '';

        if (mpesaPaybills.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:#7f8c8d; text-align:center;">
                No business numbers added yet.</td></tr>`;
            return;
        }

        mpesaPaybills.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.paybill_name}</td>
                <td>${p.paybill_number}</td>
                <td>
                    <button class="danger" onclick="deletePaybill(${p.paybill_id}, '${p.paybill_name}')">Remove</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading paybills:', err);
    }
}

// ── ADD PAYMENT METHOD ──
function showAddMethodForm() {
    document.getElementById('addMethodForm').style.display = 'block';
    document.getElementById('newMethodName').focus();
}

function hideAddMethodForm() {
    document.getElementById('addMethodForm').style.display = 'none';
    document.getElementById('newMethodName').value = '';
    document.getElementById('methodError').style.display = 'none';
}

async function addPaymentMethod() {
    const name = document.getElementById('newMethodName').value.trim();
    const errorEl = document.getElementById('methodError');
    errorEl.style.display = 'none';

    if (!name) {
        errorEl.textContent = 'Please enter a method name.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/payment-methods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method_name: name })
        });
        const result = await res.json();
        if (res.ok) {
            hideAddMethodForm();
            showToast(`"${name}" added.`, 'success');
            loadPaymentMethods();
        } else {
            errorEl.textContent = result.error || 'Something went wrong.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Failed to add method.';
        errorEl.style.display = 'block';
    }
}

async function deletePaymentMethod(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${API_BASE}/payment-methods/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
            showToast(result.message, 'warning');
            loadPaymentMethods();
        } else {
            alert('⚠️ ' + (result.error || 'Could not delete.'));
        }
    } catch (err) {
        console.error(err);
    }
}

// ── ADD PAYBILL ──
function showAddPaybillForm() {
    document.getElementById('addPaybillForm').style.display = 'block';
    document.getElementById('newPaybillName').focus();
}

function hideAddPaybillForm() {
    document.getElementById('addPaybillForm').style.display = 'none';
    document.getElementById('newPaybillName').value = '';
    document.getElementById('newPaybillNumber').value = '';
    document.getElementById('paybillError').style.display = 'none';
}

async function addPaybill() {
    const name = document.getElementById('newPaybillName').value.trim();
    const number = document.getElementById('newPaybillNumber').value.trim();
    const errorEl = document.getElementById('paybillError');
    errorEl.style.display = 'none';

    if (!name || !number) {
        errorEl.textContent = 'Please fill in both the business name and number.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/paybills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paybill_name: name,
                paybill_number: number,
                payment_method_id: mpesaMethodId
            })
        });
        const result = await res.json();
        if (res.ok) {
            hideAddPaybillForm();
            showToast(`"${name}" added.`, 'success');
            loadPaybills();
        } else {
            errorEl.textContent = result.error || 'Something went wrong.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Failed to add paybill.';
        errorEl.style.display = 'block';
    }
}

async function deletePaybill(id, name) {
    if (!confirm(`Remove "${name}"?`)) return;
    try {
        const res = await fetch(`${API_BASE}/paybills/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
            showToast(result.message, 'warning');
            loadPaybills();
        } else {
            alert('⚠️ ' + (result.error || 'Could not remove.'));
        }
    } catch (err) {
        console.error(err);
    }
}

// ── TOAST ──
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed; bottom:2rem; right:2rem;
        background:${type === 'success' ? '#27ae60' : '#e67e22'};
        color:white; padding:1rem 1.5rem; border-radius:8px;
        box-shadow:0 4px 12px rgba(0,0,0,0.2); font-weight:600;
        z-index:9999; transition:opacity 0.4s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
}