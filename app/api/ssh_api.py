"""
SSH API
Provides endpoints for managing SSH connections
"""

import json
from flask import Blueprint, request, jsonify
from app.models.ssh_connection import SSHConnection

ssh_bp = Blueprint('ssh', __name__)

# Store for SSH connections
ssh_connections = {}


@ssh_bp.route('/api/ssh/config', methods=['GET'])
def get_ssh_config():
    """获取SSH配置"""
    from app import create_app
    app, _ = create_app()
    SSH_CONFIG_FILE = app.config['SSH_CONFIG_FILE']
    
    try:
        with open(SSH_CONFIG_FILE, 'r') as f:
            config = json.load(f)
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/config', methods=['POST'])
def save_ssh_config():
    """保存SSH配置"""
    from app import create_app
    app, _ = create_app()
    SSH_CONFIG_FILE = app.config['SSH_CONFIG_FILE']
    
    try:
        config = request.get_json()
        with open(SSH_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return jsonify({'success': True, 'message': 'SSH配置已保存'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/test_connection', methods=['POST'])
def test_ssh_connection():
    """测试SSH连接"""
    try:
        data = request.get_json()
        host = data.get('host')
        port = data.get('port', 22)
        username = data.get('username')
        password = data.get('password')
        key_file = data.get('key_file')
        
        if not host or not username:
            return jsonify({'error': '主机地址和用户名是必需的'}), 400
        
        # 创建临时SSH连接进行测试
        ssh_conn = SSHConnection(host, port, username, password, key_file)
        success, message = ssh_conn.connect()
        
        # 断开连接
        if success:
            ssh_conn.client.close()
        
        if success:
            return jsonify({'success': True, 'message': 'SSH连接测试成功'})
        else:
            return jsonify({'error': f'连接失败: {message}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/connect', methods=['POST'])
def ssh_connect():
    """建立SSH连接"""
    try:
        data = request.get_json()
        host = data.get('host')
        port = data.get('port', 22)
        username = data.get('username')
        password = data.get('password')
        key_file = data.get('key_file')
        conn_id = data.get('conn_id')
        
        if not host or not username:
            return jsonify({'error': '主机地址和用户名是必需的'}), 400
        
        # 先断开已存在的连接
        if conn_id in ssh_connections:
            ssh_connections[conn_id].disconnect()
            del ssh_connections[conn_id]
        
        # 创建SSH连接
        ssh_conn = SSHConnection(host, port, username, password, key_file)
        success, message = ssh_conn.connect()
        
        if success:
            # 保存连接
            ssh_connections[conn_id] = ssh_conn
            return jsonify({'success': True, 'message': 'SSH连接成功'})
        else:
            return jsonify({'error': f'连接失败: {message}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/disconnect', methods=['POST'])
def ssh_disconnect():
    """断开SSH连接"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')
        
        if conn_id in ssh_connections:
            ssh_connections[conn_id].disconnect()
            del ssh_connections[conn_id]
            return jsonify({'success': True, 'message': 'SSH连接已断开'})
        else:
            return jsonify({'error': '未找到指定的连接'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/execute', methods=['POST'])
def ssh_execute():
    """在SSH连接上执行命令"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')
        command = data.get('command')
        
        if not conn_id or not command:
            return jsonify({'error': '连接ID和命令是必需的'}), 400
        
        if conn_id not in ssh_connections:
            return jsonify({'error': '未找到指定的连接'}), 404
        
        ssh_conn = ssh_connections[conn_id]
        success, output = ssh_conn.send_command(command)
        
        if success:
            return jsonify({'success': True, 'output': output})
        else:
            return jsonify({'error': output}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/connections')
def get_saved_connections():
    """获取已保存的SSH连接"""
    try:
        from app import create_app
        app, _ = create_app()
        SSH_CONFIG_FILE = app.config['SSH_CONFIG_FILE']
        
        with open(SSH_CONFIG_FILE, 'r') as f:
            config = json.load(f)
        
        # 清除密码信息
        connections = []
        for conn in config.get('connections', []):
            # 创建不包含密码信息的连接对象
            safe_conn = {k: v for k, v in conn.items() if k != 'password'}
            connections.append(safe_conn)
        
        return jsonify(connections)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/save_connection', methods=['POST'])
def save_connection():
    """保存SSH连接配置"""
    try:
        connection_data = request.get_json()
        
        from app import create_app
        app, _ = create_app()
        SSH_CONFIG_FILE = app.config['SSH_CONFIG_FILE']
        
        # 读取现有配置
        try:
            with open(SSH_CONFIG_FILE, 'r') as f:
                config = json.load(f)
        except FileNotFoundError:
            config = {'connections': []}
        
        if 'connections' not in config:
            config['connections'] = []
        
        # 检查是否已存在同名连接
        conn_name = connection_data.get('name')
        existing_index = None
        for i, conn in enumerate(config['connections']):
            if conn.get('name') == conn_name:
                existing_index = i
                break
        
        # 更新或添加连接
        if existing_index is not None:
            config['connections'][existing_index] = connection_data
        else:
            config['connections'].append(connection_data)
        
        # 保存配置
        with open(SSH_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        
        return jsonify({'success': True, 'message': '连接配置已保存'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/delete_connection/<conn_name>', methods=['DELETE'])
def delete_connection(conn_name):
    """删除SSH连接配置"""
    try:
        from app import create_app
        app, _ = create_app()
        SSH_CONFIG_FILE = app.config['SSH_CONFIG_FILE']
        
        # 读取现有配置
        try:
            with open(SSH_CONFIG_FILE, 'r') as f:
                config = json.load(f)
        except FileNotFoundError:
            config = {'connections': []}
        
        if 'connections' not in config:
            config['connections'] = []
        
        # 查找并删除连接
        config['connections'] = [conn for conn in config['connections'] if conn.get('name') != conn_name]
        
        # 保存配置
        with open(SSH_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        
        return jsonify({'success': True, 'message': '连接配置已删除'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500