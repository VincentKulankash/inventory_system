import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'static/uploads'
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    SECRET_KEY = os.environ.get('SECRET_KEY')

    