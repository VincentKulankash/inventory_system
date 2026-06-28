from flask import Flask, jsonify, request, render_template, redirect, url_for
from config import Config 
from models import db, Product, Sale, PaymentMethod, Paybill
from flask_migrate import Migrate
from sqlalchemy import func



app = Flask(__name__)

app.config.from_object(Config)

db.init_app(app)
migrate = Migrate(app, db)

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/api/products', methods=['GET', 'POST'])
def products():
    if request.method == 'POST':
        data = request.get_json()
        new_product = Product(
            product_name=data['product_name'],
            description=data.get('description'),
            category=data['category'],
            selling_price=data['selling_price'],
            buying_price=data['buying_price'],
            quantity_in_stock=data.get('quantity_in_stock', 0),
            low_stock_threshold=data.get('low_stock_threshold', 5),
            image_path=data.get('image_path')
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify(new_product.to_dict()), 201
    
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])


@app.route('/api/products/<int:product_id>', methods=['GET', 'PUT', 'DELETE'])
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    
    if request.method == 'GET':
        return jsonify(product.to_dict())
    
    elif request.method == 'PUT':
        data = request.get_json()
        product.product_name = data.get('product_name', product.product_name)
        product.description = data.get('description', product.description)
        product.category = data.get('category', product.category)
        product.selling_price = data.get('selling_price', product.selling_price)
        product.buying_price = data.get('buying_price', product.buying_price)
        product.quantity_in_stock = data.get('quantity_in_stock', product.quantity_in_stock)
        product.low_stock_threshold = data.get('low_stock_threshold', product.low_stock_threshold)
        db.session.commit()
        return jsonify(product.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product deleted'}), 200


@app.route('/api/sales', methods=['GET', 'POST'])
def sales():
    if request.method == 'POST':
        data = request.get_json()
        product = Product.query.get_or_404(data['product_id'])
        
        # Check stock
        if product.quantity_in_stock < data['quantity_sold']:
            return jsonify({'error': 'Insufficient stock'}), 400
        
        # Calculate financial
        quantity = data['quantity_sold']
        selling_price = float(product.selling_price)
        buying_price = float(product.buying_price)
        total_revenue = quantity * selling_price
        total_cost = quantity * buying_price
        profit = total_revenue - total_cost
        
        # Create sale
        new_sale = Sale(
            product_id=data['product_id'],
            quantity_sold=quantity,
            selling_price_at_sale=selling_price,
            buying_price_at_sale=buying_price,
            total_revenue=total_revenue,
            total_cost=total_cost,
            profit=profit,
            payment_method_id=data['payment_method_id'],
            paybill_id=data.get('paybill_id')
        )
        
        # Update stock
        product.quantity_in_stock -= quantity
        
        db.session.add(new_sale)
        db.session.commit()
        return jsonify(new_sale.to_dict()), 201
    
    sales = Sale.query.all()
    return jsonify([s.to_dict() for s in sales])


from sqlalchemy import func

@app.route('/api/reports')
def reports():
    # Total revenue, cost, profit
    totals = db.session.query(
        func.sum(Sale.total_revenue).label('total_revenue'),
        func.sum(Sale.total_cost).label('total_cost'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity_sold).label('total_items_sold')
    ).first()
    
    # Low stock products
    low_stock = Product.query.filter(
        Product.quantity_in_stock <= Product.low_stock_threshold
    ).all()
    
    # Sales by category
    category_sales = db.session.query(
        Product.category,
        func.sum(Sale.total_revenue).label('revenue'),
        func.sum(Sale.profit).label('profit')
    ).join(Sale).group_by(Product.category).all()
    
    return jsonify({
        'summary': {
            'total_revenue': float(totals.total_revenue or 0),
            'total_cost': float(totals.total_cost or 0),
            'total_profit': float(totals.total_profit or 0),
            'total_items_sold': int(totals.total_items_sold or 0)
        },
        'low_stock_products': [p.to_dict() for p in low_stock],
        'sales_by_category': [
            {'category': c, 'revenue': float(r), 'profit': float(p)} 
            for c, r, p in category_sales
        ]
    })

@app.route('/api/payment-methods', methods=['GET', 'POST'])
def get_payment_methods():
    if request.method == 'POST':
        data = request.get_json()
        method = PaymentMethod(method_name=data['method_name'])
        db.session.add(method)
        db.session.commit()
        return jsonify(method.to_dict()), 201

    methods = PaymentMethod.query.all()
    return jsonify([m.to_dict() for m in methods])


@app.route('/api/paybills', methods=['GET', 'POST'])
def paybills():
    if request.method == 'POST':
        data = request.get_json()
        new_paybill = Paybill(
            paybill_name=data['paybill_name'],
            paybill_number=data['paybill_number'],
            payment_method_id=data['payment_method_id']
        )
        db.session.add(new_paybill)
        db.session.commit()
        return jsonify(new_paybill.to_dict()), 201

    paybills = Paybill.query.all()
    return jsonify([p.to_dict() for p in paybills])

@app.route('/api/reports/daily', methods=['GET'])
def daily_report():
    from datetime import date
    today = date.today()

    sales_today = Sale.query.filter(
        func.date(Sale.sale_date) == today
    ).all()

    totals = db.session.query(
        func.sum(Sale.total_revenue).label('total_revenue'),
        func.sum(Sale.total_cost).label('total_cost'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity_sold).label('total_items_sold')
    ).filter(func.date(Sale.sale_date) == today).first()

    payment_breakdown = db.session.query(
        PaymentMethod.method_name,
        func.sum(Sale.total_revenue).label('revenue'),
        func.sum(Sale.profit).label('profit'),
        func.count(Sale.sale_id).label('transaction_count')
    ).join(Sale, PaymentMethod.payment_method_id == Sale.payment_method_id)\
     .filter(func.date(Sale.sale_date) == today)\
     .group_by(PaymentMethod.method_name).all()

    return jsonify({
        'date': today.isoformat(),
        'summary': {
            'total_revenue': float(totals.total_revenue or 0),
            'total_cost': float(totals.total_cost or 0),
            'total_profit': float(totals.total_profit or 0),
            'total_items_sold': int(totals.total_items_sold or 0)
        },
        'sales': [s.to_dict() for s in sales_today],
        'payment_breakdown': [
            {
                'method': m,
                'revenue': float(r),
                'profit': float(p),
                'transactions': int(c)
            }
            for m, r, p, c in payment_breakdown
        ]
    })

@app.route('/api/reports/monthly', methods=['GET'])
def monthly_report():
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)

    if not year or not month:
        return jsonify({'error': 'year and month are required'}), 400

    totals = db.session.query(
        func.sum(Sale.total_revenue).label('total_revenue'),
        func.sum(Sale.total_cost).label('total_cost'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity_sold).label('total_items_sold')
    ).filter(
        func.extract('year', Sale.sale_date) == year,
        func.extract('month', Sale.sale_date) == month
    ).first()

    daily_breakdown = db.session.query(
        func.date(Sale.sale_date).label('day'),
        func.sum(Sale.total_revenue).label('revenue'),
        func.sum(Sale.profit).label('profit'),
        func.sum(Sale.quantity_sold).label('items_sold')
    ).filter(
        func.extract('year', Sale.sale_date) == year,
        func.extract('month', Sale.sale_date) == month
    ).group_by(func.date(Sale.sale_date))\
     .order_by(func.date(Sale.sale_date)).all()

    payment_breakdown = db.session.query(
        PaymentMethod.method_name,
        func.sum(Sale.total_revenue).label('revenue'),
        func.sum(Sale.profit).label('profit'),
        func.count(Sale.sale_id).label('transaction_count')
    ).join(Sale, PaymentMethod.payment_method_id == Sale.payment_method_id)\
     .filter(
        func.extract('year', Sale.sale_date) == year,
        func.extract('month', Sale.sale_date) == month
    ).group_by(PaymentMethod.method_name).all()

    return jsonify({
        'year': year,
        'month': month,
        'summary': {
            'total_revenue': float(totals.total_revenue or 0),
            'total_cost': float(totals.total_cost or 0),
            'total_profit': float(totals.total_profit or 0),
            'total_items_sold': int(totals.total_items_sold or 0)
        },
        'daily_breakdown': [
            {
                'date': str(day),
                'revenue': float(revenue),
                'profit': float(profit),
                'items_sold': int(items)
            }
            for day, revenue, profit, items in daily_breakdown
        ],
        'payment_breakdown': [
            {
                'method': m,
                'revenue': float(r),
                'profit': float(p),
                'transactions': int(c)
            }
            for m, r, p, c in payment_breakdown
        ]
    })

@app.route('/api/reports/yearly', methods=['GET'])
def yearly_report():
    year = request.args.get('year', type=int)

    if not year:
        return jsonify({'error': 'year is required'}), 400

    totals = db.session.query(
        func.sum(Sale.total_revenue).label('total_revenue'),
        func.sum(Sale.total_cost).label('total_cost'),
        func.sum(Sale.profit).label('total_profit'),
        func.sum(Sale.quantity_sold).label('total_items_sold')
    ).filter(
        func.extract('year', Sale.sale_date) == year
    ).first()

    monthly_breakdown = db.session.query(
        func.extract('month', Sale.sale_date).label('month'),
        func.sum(Sale.total_revenue).label('revenue'),
        func.sum(Sale.profit).label('profit'),
        func.sum(Sale.quantity_sold).label('items_sold')
    ).filter(
        func.extract('year', Sale.sale_date) == year
    ).group_by(func.extract('month', Sale.sale_date))\
     .order_by(func.extract('month', Sale.sale_date)).all()

    month_names = {
        1: 'January', 2: 'February', 3: 'March', 4: 'April',
        5: 'May', 6: 'June', 7: 'July', 8: 'August',
        9: 'September', 10: 'October', 11: 'November', 12: 'December'
    }

    return jsonify({
        'year': year,
        'summary': {
            'total_revenue': float(totals.total_revenue or 0),
            'total_cost': float(totals.total_cost or 0),
            'total_profit': float(totals.total_profit or 0),
            'total_items_sold': int(totals.total_items_sold or 0)
        },
        'monthly_breakdown': [
            {
                'month': int(month),
                'month_name': month_names[int(month)],
                'revenue': float(revenue),
                'profit': float(profit),
                'items_sold': int(items)
            }
            for month, revenue, profit, items in monthly_breakdown
        ]
    })


@app.route('/')
def home():
    return redirect(url_for('inventory_page'))

@app.route('/inventory')
def inventory_page():
    return render_template('inventory.html')

@app.route('/products/new')
def new_product_page():
    return render_template('product_form.html')

@app.route('/products/<int:product_id>/edit')
def edit_product_page(product_id):
    return render_template('product_form.html', product_id=product_id)

@app.route('/sales/new')
def record_sale_page():
    return render_template('record_sale.html')

@app.route('/reports/daily')
def daily_report_page():
    return render_template('daily_report.html')

@app.route('/reports')
def reports_page():
    return render_template('reports.html')

if __name__== '__main__':
    app.run(debug=True)