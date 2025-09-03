"""
Configuration API
Provides endpoints for managing application configuration
"""

import json
from flask import Blueprint, request, jsonify
from app.utils.config_loader import load_monitor_config

config_bp = Blueprint('config', __name__)


@config_bp.route('/api/config/monitor', methods=['GET'])
def get_monitor_config():
    """获取监控配置"""
    from app import create_app
    app, _ = create_app()
    
    try:
        config = load_monitor_config(app)
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@config_bp.route('/api/config/monitor', methods=['POST'])
def save_monitor_config():
    """保存监控配置"""
    from app import create_app
    app, _ = create_app()
    MONITOR_CONFIG_FILE = app.config['MONITOR_CONFIG_FILE']
    
    try:
        config = request.get_json()
        with open(MONITOR_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return jsonify({'success': True, 'message': '监控配置已保存'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500