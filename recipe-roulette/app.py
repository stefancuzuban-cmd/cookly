import os, threading
from flask import Flask
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

    db.init_app(app)

    with app.app_context():
        db.create_all()
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE recipes ADD COLUMN video_url VARCHAR(500)"))
                conn.commit()
        except Exception:
            pass
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(200)"))
                conn.commit()
        except Exception:
            pass

    app.register_blueprint(main_bp)
    app.register_blueprint(recipes_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(auth_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    import socket
    host_ip = [ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if ip.startswith("192.")]
    ip = host_ip[0] if host_ip else "192.168.1.49"
    
    from dotenv import load_dotenv
    load_dotenv()
    print("=" * 60)
    print("  Cookly is running!")
    print(f"  PC:   http://www.cookly.com:5000")
    print(f"  PC:   http://127.0.0.1:5000")
    print(f"  LAN:  http://{ip}:5000")
    print()
    print("  To access from ANY network (phone data, work, etc.):")
    print("  1. Open a NEW terminal (press Win+R, type cmd, Enter)")
    print("  2. Paste this and press Enter:")
    print("     ssh -R 80:localhost:5000 nokey@localhost.run")
    print("  3. A URL like https://xxxx.lhr.life will appear")
    print("  4. Open that URL on your phone or any device")
    print("  (Keep that terminal window open while using it)")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
