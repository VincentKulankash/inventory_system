const API_BASE = '/api';

async function loadDailyReport() {
    try {
        const response = await fetch(`${API_BASE}/reports/daily`);
        const data = await response.json();

        document.getElementById('reportDate').textContent = data.date;
        document.getElementById('dailyRevenue').textContent = `KSh${data.summary.total_revenue.toFixed(2)}`;
        document.getElementById('dailyProfit').textContent = `KSh${data.summary.total_profit.toFixed(2)}`;
        document.getElementById('dailyTransactions').textContent =
            data.payment_breakdown.reduce((sum, p) => sum + p.transactions, 0);

        // Group today's sales by payment method so each breakdown row can expand
        // to show exactly which transactions made up that method's totals.
        const salesByMethod = {};
        data.sales.forEach(s => {
            const key = s.payment_method || 'Unknown';
            if (!salesByMethod[key]) salesByMethod[key] = [];
            salesByMethod[key].push(s);
        });

        const paymentBody = document.getElementById('paymentBody');
        paymentBody.innerHTML = '';
        data.payment_breakdown.forEach(p => {
            const methodSales = salesByMethod[p.method] || [];
            const safeId = p.method.replace(/[^a-zA-Z0-9]/g, '');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><button type="button" class="expand-toggle" onclick="toggleMethodRow('${safeId}')" id="expandBtn-${safeId}">▶</button></td>
                <td>${p.method}</td>
                <td>KSh${p.revenue.toFixed(2)}</td>
                <td>KSh${p.profit.toFixed(2)}</td>
                <td>${p.transactions}</td>
            `;
            paymentBody.appendChild(row);

            const detailRow = document.createElement('tr');
            detailRow.id = `methodRow-${safeId}`;
            detailRow.className = 'method-detail-row';
            detailRow.style.display = 'none';

            const rowsHtml = methodSales.map(s => {
                const localTime = new Date(s.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const variantLabel = s.variant ? ` (${s.variant})` : '';
                return `
                    <tr>
                        <td>${s.sale_id}</td>
                        <td>${s.product_name}${variantLabel}</td>
                        <td>${s.quantity_sold}</td>
                        <td>KSh${s.total_revenue.toFixed(2)}</td>
                        <td>KSh${s.profit.toFixed(2)}</td>
                        <td>${localTime}</td>
                    </tr>
                `;
            }).join('');

            detailRow.innerHTML = `
                <td></td>
                <td colspan="4">
                    <table class="variant-subtable">
                        <thead>
                            <tr><th>Sale ID</th><th>Product</th><th>Qty</th><th>Revenue</th><th>Profit</th><th>Time</th></tr>
                        </thead>
                        <tbody>${rowsHtml || `<tr><td colspan="6" style="text-align:center; color:#7f8c8d;">No transactions.</td></tr>`}</tbody>
                    </table>
                </td>
            `;
            paymentBody.appendChild(detailRow);
        });

        const salesBody = document.getElementById('salesBody');
        salesBody.innerHTML = '';
        data.sales.forEach(s => {
            const row = document.createElement('tr');
            // Convert UTC ISO string → local time for display
            const localTime = new Date(s.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            row.innerHTML = `
                <td>${s.sale_id}</td>
                <td>${s.product_name}</td>
                <td>${s.quantity_sold}</td>
                <td>KSh${s.total_revenue.toFixed(2)}</td>
                <td>KSh${s.profit.toFixed(2)}</td>
                <td>${localTime}</td>
            `;
            salesBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading daily report:', error);
    }
}

function toggleMethodRow(safeId) {
    const row = document.getElementById(`methodRow-${safeId}`);
    const btn = document.getElementById(`expandBtn-${safeId}`);
    if (!row) return;
    const isOpen = row.style.display !== 'none';
    row.style.display = isOpen ? 'none' : 'table-row';
    if (btn) btn.textContent = isOpen ? '▶' : '▼';
}

document.addEventListener('DOMContentLoaded', loadDailyReport);