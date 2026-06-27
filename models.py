from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
db = SQLAlchemy()

class Product(db.Model):
    __tablename__ = 'products'
    
    product_id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), nullable=False)
    selling_price = db.Column(db.Numeric(10, 2), nullable=False)
    buying_price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity_in_stock = db.Column(db.Integer, nullable=False, default=0)
    low_stock_threshold = db.Column(db.Integer, nullable=False, default=5)
    image_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'product_id': self.product_id,
            'product_name': self.product_name,
            'description': self.description,
            'category': self.category,
            'selling_price': float(self.selling_price),
            'buying_price': float(self.buying_price),
            'quantity_in_stock': self.quantity_in_stock,
            'low_stock_threshold': self.low_stock_threshold,
            'image_path': self.image_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'
    
    payment_method_id = db.Column(db.Integer, primary_key=True)
    method_name = db.Column(db.String(100), nullable=False, unique=True)
    
    def to_dict(self):
        return {
            'payment_method_id': self.payment_method_id,
            'method_name': self.method_name
        }

class Paybill(db.Model):
    __tablename__ = 'paybills'
    
    paybill_id = db.Column(db.Integer, primary_key=True)
    paybill_name = db.Column(db.String(100), nullable=False)
    paybill_number = db.Column(db.String(20), nullable=False)
    payment_method_id = db.Column(db.Integer, db.ForeignKey('payment_methods.payment_method_id'))
    
    def to_dict(self):
        return {
            'paybill_id': self.paybill_id,
            'paybill_name': self.paybill_name,
            'paybill_number': self.paybill_number,
            'payment_method_id': self.payment_method_id
        }

class Sale(db.Model):
    __tablename__ = 'sales'
    
    sale_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.product_id'), nullable=False)
    quantity_sold = db.Column(db.Integer, nullable=False)
    selling_price_at_sale = db.Column(db.Numeric(10, 2), nullable=False)
    buying_price_at_sale = db.Column(db.Numeric(10, 2), nullable=False)
    total_revenue = db.Column(db.Numeric(10, 2), nullable=False)
    total_cost = db.Column(db.Numeric(10, 2), nullable=False)
    profit = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method_id = db.Column(db.Integer, db.ForeignKey('payment_methods.payment_method_id'), nullable=False)
    paybill_id = db.Column(db.Integer, db.ForeignKey('paybills.paybill_id'), nullable=True)
    sale_date = db.Column(db.DateTime, default=datetime.utcnow)
    product = db.relationship('Product', backref='sales')
    payment_method = db.relationship('PaymentMethod', backref='sales')
    paybill = db.relationship('Paybill', backref='sales')
    
    def to_dict(self):
        return {
            'sale_id': self.sale_id,
            'product_id': self.product_id,
            'product_name': self.product.product_name if self.product else None,
            'quantity_sold': self.quantity_sold,
            'selling_price_at_sale': float(self.selling_price_at_sale),
            'buying_price_at_sale': float(self.buying_price_at_sale),
            'total_revenue': float(self.total_revenue),
            'total_cost': float(self.total_cost),
            'profit': float(self.profit),
            'payment_method': self.payment_method.method_name if self.payment_method else None,
            'paybill': self.paybill.paybill_name if self.paybill else None,
            'sale_date': self.sale_date.isoformat() if self.sale_date else None
        }