const API_BASE = '/api';

async function loadReports() {
    try {
        const response = await fetch(`${API_BASE}/reports`);
        const data = await response.json();
        
        document.getElementById('totalRevenue').textContent = 
            `KSh${data.summary.total_revenue.toFixed(2)}`;
        document.getElementById('totalProfit').textContent = 
            `KSh${data.summary.total_profit.toFixed(2)}`;
        document.getElementById('totalItems').textContent = 
            data.summary.total_items_sold;
        
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

document.addEventListener('DOMContentLoaded', loadReports);