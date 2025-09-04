from flask import Flask
import os

def create_app():
    # 初始化Flask应用
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your-secret-key-here'
    app.config['MONITOR_CONFIG_FILE'] = 'monitor_config.json'

    # 确保必要的目录存在
    if not os.path.exists('script_logs'):
        os.makedirs('script_logs')

    # 初始化认证管理器
    from app.utils.auth import AuthManager
    app.auth_manager = AuthManager()
    
    # 注册API蓝图
    from app.api.auth_api import auth_bp
    from app.api.ssh_api import ssh_bp
    from app.api.script_api import script_bp
    from app.api.config_api import config_bp
    from app.api.system_api import system_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(ssh_bp, url_prefix='/api/ssh')
    app.register_blueprint(script_bp, url_prefix='/api/scripts')
    app.register_blueprint(config_bp, url_prefix='/api/config')
    app.register_blueprint(system_bp, url_prefix='/api/system')

    # 只保留根路径API检查
    @app.route('/api')
    def index():
        return {'message': 'Python Script Monitor API is running', 'status': 'success'}
    
    return app

# 创建应用实例
app = create_app()