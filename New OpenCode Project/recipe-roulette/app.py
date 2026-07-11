import os, sys, tempfile
from datetime import timedelta
from flask import Flask
from flask_session import Session
from config import Config
from database.schema import db
from routes.main import main_bp
from routes.recipes import recipes_bp
from routes.favorites import favorites_bp
from routes.history import history_bp
from routes.auth import auth_bp
from sqlalchemy import text

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    on_render = os.environ.get('RENDER', '').lower() == 'true'
    app.config.update(
        SESSION_TYPE='filesystem',
        SESSION_PERMANENT=True,
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=on_render,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_NAME='cookly_session'
    )

    session_dir = os.path.join(tempfile.gettempdir(), 'cookly_sessions')
    os.makedirs(session_dir, exist_ok=True)
    app.config['SESSION_FILE_DIR'] = session_dir

    Session(app)
    db.init_app(app)

    with app.app_context():
        db.create_all()
        for col in ['video_url VARCHAR(500)', 'password_hash VARCHAR(200)']:
            try:
                with db.engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE recipes ADD COLUMN {col}"))
                    conn.commit()
            except Exception:
                pass
            try:
                with db.engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col}"))
                    conn.commit()
            except Exception:
                pass

    app.register_blueprint(main_bp)
    app.register_blueprint(recipes_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(auth_bp)

    return app

app = create_app()

if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    import socket
    host_ip = [ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if ip.startswith("192.")]
    ip = host_ip[0] if host_ip else "192.168.1.49"
    print("=" * 60)
    print("  Cookly is running!")
    print(f"  PC:   http://www.cookly.com:5000")
    print(f"  PC:   http://127.0.0.1:5000")
    print(f"  LAN:  http://{ip}:5000")
    print(f"  Render: deploy to https://render.com for global access")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
