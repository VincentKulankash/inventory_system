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

        const paymentBody = document.getElementById('paymentBody');
        paymentBody.innerHTML = '';
        data.payment_breakdown.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.method}</td>
                <td>KSh${p.revenue.toFixed(2)}</td>
                <td>KSh${p.profit.toFixed(2)}</td>
                <td>${p.transactions}</td>
            `;
            paymentBody.appendChild(row);
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

document.addEventListener('DOMContentLoaded', loadDailyReport);