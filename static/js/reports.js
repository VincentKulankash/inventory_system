const API_BASE = '/api';

// Current range dates (set when filter is applied)
let currentStart = null;
let currentEnd = null;

async function loadReports() {
    try {
        const response = await fetch(`${API_BASE}/reports`);
        const data = await response.json();

        document.getElementById('totalRevenue').textContent = `KSh${data.summary.total_revenue.toFixed(2)}`;
        document.getElementById('totalProfit').textContent = `KSh${data.summary.total_profit.toFixed(2)}`;
        document.getElementById('totalItems').textContent = data.summary.total_items_sold;

        const lowStockBody = document.getElementById('lowStockBody');
        lowStockBody.innerHTML = '';
        data.low_stock_products.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.product_name}</td>
                <td>${p.category}</td>
                <td class="low-stock">${p.quantity_in_stock}</td>
                <td>${p.low_stock_threshold}</td>
            `;
            lowStockBody.appendChild(row);
        });

        const categoryBody = document.getElementById('categoryBody');
        categoryBody.innerHTML = '';
        data.sales_by_category.forEach(c => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${c.category}</td>
                <td>KSh${c.revenue.toFixed(2)}</td>
                <td>KSh${c.profit.toFixed(2)}</td>
            `;
            categoryBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

async function loadRangeReport() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const errorEl = document.getElementById('rangeError');
    errorEl.style.display = 'none';

    if (!start || !end) {
        errorEl.textContent = 'Please select both a start and end date.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/reports/range?start=${start}&end=${end}`);
        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.error || 'Something went wrong.';
            errorEl.style.display = 'block';
            document.getElementById('rangeResults').style.display = 'none';
            return;
        }

        currentStart = start;
        currentEnd = end;

        document.getElementById('rangeLabel').textContent = `${start} → ${end}`;
        document.getElementById('rangeRevenue').textContent = `KSh${data.summary.total_revenue.toFixed(2)}`;
        document.getElementById('rangeProfit').textContent = `KSh${data.summary.total_profit.toFixed(2)}`;
        document.getElementById('rangeTx').textContent = data.summary.total_transactions;

        const catBody = document.getElementById('rangeCategoryBody');
        catBody.innerHTML = '';
        data.category_breakdown.forEach(c => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${c.category}</td><td>KSh${c.revenue.toFixed(2)}</td><td>KSh${c.profit.toFixed(2)}</td><td>${c.items_sold}</td>`;
            catBody.appendChild(row);
        });

        const payBody = document.getElementById('rangePaymentBody');
        payBody.innerHTML = '';
        data.payment_breakdown.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${p.method}</td><td>KSh${p.revenue.toFixed(2)}</td><td>${p.transactions}</td>`;
            payBody.appendChild(row);
        });

        document.getElementById('rangeResults').style.display = 'block';

    } catch (err) {
        errorEl.textContent = 'Failed to load report. Please try again.';
        errorEl.style.display = 'block';
    }
}

function clearRangeFilter() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('rangeResults').style.display = 'none';
    document.getElementById('rangeError').style.display = 'none';
    currentStart = null;
    currentEnd = null;
}

function downloadExport(format) {
    if (!currentStart || !currentEnd) return;
    window.location.href = `${API_BASE}/reports/export?format=${format}&start=${currentStart}&end=${currentEnd}`;
}

function downloadAll(format) {
    window.location.href = `${API_BASE}/reports/export?format=${format}`;
}

document.addEventListener('DOMContentLoaded', loadReports);