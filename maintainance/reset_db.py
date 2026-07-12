"""
reset_db.py
-----------
Wipes all product, variant, sale, and paybill data so the client starts
with a clean system — but keeps the database schema intact and re-adds
a couple of sensible default payment methods.

Run this ONCE, right before handing the system over. Do not run it
after she has started entering real data — it deletes everything.

Usage (from the project folder, with the venv active):
    python reset_db.py
"""

from app import app
from models import db, Product, ProductVariant, Sale, Paybill, PaymentMethod

DEFAULT_PAYMENT_METHODS = ["Cash", "Mpesa"]

with app.app_context():
    confirm = input(
        "This will permanently delete ALL products, variants, sales, and "
        "paybills. Type YES to continue: "
    )
    if confirm.strip() != "YES":
        print("Cancelled. Nothing was changed.")
        raise SystemExit

    # Delete in dependency order to avoid foreign-key errors
    Sale.query.delete()
    ProductVariant.query.delete()
    Product.query.delete()
    Paybill.query.delete()
    PaymentMethod.query.delete()
    db.session.commit()

    for name in DEFAULT_PAYMENT_METHODS:
        db.session.add(PaymentMethod(method_name=name))
    db.session.commit()

    print("Done. Database is clean. Default payment methods added:", DEFAULT_PAYMENT_METHODS)