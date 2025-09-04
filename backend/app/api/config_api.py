"""
Configuration API
Provides endpoints for managing application configuration
"""

import json
import os
from flask import Blueprint, request, jsonify
from app.utils.config_loader import load_monitor_config

config_bp = Blueprint('config', __name__)

MONITOR_CONFIG_FILE = 'monitor_config.json'

@config_bp.route('/monitor', methods=['GET'])
def get_monitor_config():
    """获取监控配置"""
    try:
        if os.path.exists(MONITOR_CONFIG_FILE):
            config = load_monitor_config(None)  # 传递None因为不再需要app参数
            return jsonify(config)
        else:
            # 返回默认配置
            default_config = {
                "monitor_paths": ["."],
                "exclude_patterns": ["*.pyc", "__pycache__", "script_logs"]
            }
            return jsonify(default_config)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@config_bp.route('/monitor', methods=['POST'])
def save_monitor_config():
    """保存监控配置"""
    try:
        config = request.get_json()
        with open(MONITOR_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return jsonify({'success': True, 'message': '监控配置已保存'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500