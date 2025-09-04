from flask import Flask
from flask_sock import Sock
import os
import logging
from werkzeug.serving import is_running_from_reloader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    sock = Sock(app)
    
    # Generate a random secret key for sessions
    app.secret_key = os.urandom(24)
    
    # 禁用 Flask 的开发服务器警告
    import sys
    cli = sys.modules.get('flask.cli')
    if cli:
        cli.show_server_banner = lambda *x: None

    # Get the directory of this script
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    TEMPLATE_DIR = os.path.join(BASE_DIR, 'app', 'templates')
    LOGS_DIR = os.path.join(BASE_DIR, 'script_logs')
    SSH_CONFIG_FILE = os.path.join(BASE_DIR, 'ssh_config.json')
    MONITOR_CONFIG_FILE = os.path.join(BASE_DIR, 'monitor_config.json')
    
    # Store paths in app config
    app.config['BASE_DIR'] = BASE_DIR
    app.config['TEMPLATE_DIR'] = TEMPLATE_DIR
    app.config['LOGS_DIR'] = LOGS_DIR
    app.config['SSH_CONFIG_FILE'] = SSH_CONFIG_FILE
    app.config['MONITOR_CONFIG_FILE'] = MONITOR_CONFIG_FILE

    # Ensure templates and logs directories exist
    if not os.path.exists(TEMPLATE_DIR):
        os.makedirs(TEMPLATE_DIR)
        
    if not os.path.exists(LOGS_DIR):
        os.makedirs(LOGS_DIR)

    # Create default SSH config file if it doesn't exist
    if not os.path.exists(SSH_CONFIG_FILE):
        default_config = {
            "connections": []
        }
        with open(SSH_CONFIG_FILE, 'w') as f:
            import json
            json.dump(default_config, f, indent=2)

    # Create default monitor config file if it doesn't exist
    if not os.path.exists(MONITOR_CONFIG_FILE):
        default_config = {
            "monitor_paths": ["."],
            "exclude_patterns": ["monitor.py"]
        }
        with open(MONITOR_CONFIG_FILE, 'w') as f:
            import json
            json.dump(default_config, f, indent=2)
    
    # Initialize authentication
    from app.utils.auth import AuthManager
    app.auth_manager = AuthManager(app)
    
    # Import and register blueprints
    from app.api.process_api import process_bp
    from app.api.script_api import script_bp
    from app.api.ssh_api import ssh_bp
    from app.api.system_api import system_bp
    from app.api.config_api import config_bp
    from app.api.auth_api import auth_bp
    
    app.register_blueprint(process_bp)
    app.register_blueprint(script_bp)
    app.register_blueprint(ssh_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(auth_bp)
    
    # Import and initialize WebSocket routes
    from app.api.ssh_websocket import init_ssh_websocket_routes
    init_ssh_websocket_routes(sock)
    
    # Authentication decorator
    def require_auth(f):
        from functools import wraps
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask import session, redirect, url_for
            if 'username' not in session:
                return redirect(url_for('auth.login'))
            return f(*args, **kwargs)
        return decorated_function
    
    # Apply authentication to index route
    @app.route('/')
    @require_auth
    def index():
        from flask import render_template, redirect, url_for
        return redirect(url_for('system_info'))
    
    @app.route('/system_info')
    @require_auth
    def system_info():
        from flask import render_template
        return render_template('modules/system_info.html')
    
    @app.route('/local_scripts')
    @require_auth
    def local_scripts():
        from flask import render_template
        return render_template('modules/local_scripts.html')
    
    @app.route('/ssh_connections')
    @require_auth
    def ssh_connections():
        from flask import render_template
        return render_template('modules/ssh_connections.html')
    
    @app.route('/config_manager')
    @require_auth
    def config_manager():
        from flask import render_template
        return render_template('modules/config_manager.html')
    
    # Add app reference to request context
    @app.before_request
    def before_request():
        from flask import request
        request.app = app
    
    return app, sock