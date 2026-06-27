from flask import Flask, jsonify, request
from config import Config 
from models import db, Product, Sale, PaymentMethod, Paybill
from flask_migrate import Migrate
from sqlalchemy import func

app = Flask(__name__)

app.config.from_object(Config)

db.init_app(app)
migrate = Migrate(app, db)

@app.route('/')
def home():
    return jsonify({
        'message': 'Inventory Management System API',
        'status': 'running',
        'endpoints': {
            '/api/products': 'Product management',
            '/api/sales': 'Sales management',
            '/api/reports': 'Reports'
        }
    })

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



if __name__== '__main__':
    app.run(debug=True)