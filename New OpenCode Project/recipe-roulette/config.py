import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///recipe_roulette.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AI_API_KEY = os.getenv('AI_API_KEY', 'your_openai_api_key_here')
    AI_API_URL = os.getenv('AI_API_URL', 'https://api.openai.com/v1/chat/completions')
    AI_MODEL = os.getenv('AI_MODEL', 'gpt-3.5-turbo')

    # Fix for Render PostgreSQL URL (starts with postgres:// but SQLAlchemy needs postgresql://)
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
