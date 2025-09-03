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
            return jsonify({'error': 'SSH连接不存在'}), 404
        
        ssh_conn = ssh_connections[conn_id]
        # Note: execute_command method is not implemented in SSHConnection class
        # This is a placeholder for future implementation
        return jsonify({'error': '功能未实现'}), 501
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ssh_bp.route('/api/ssh/open_shell', methods=['POST'])
def ssh_open_shell():
    """打开SSH shell"""
    # This is now handled by the WebSocket connection
    return jsonify({'success': True, 'message': 'Shell opened via WebSocket'})


@ssh_bp.route('/api/ssh/system_info', methods=['POST'])
def ssh_system_info():
    """获取SSH连接的远程系统信息"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')
        
        if not conn_id:
            return jsonify({'error': '连接ID是必需的'}), 400
        
        if conn_id not in ssh_connections:
            return jsonify({'error': 'SSH连接不存在'}), 404
        
        ssh_conn = ssh_connections[conn_id]
        if not ssh_conn.connected:
            return jsonify({'error': 'SSH连接未建立'}), 400
        
        # 执行命令获取系统信息
        try:
            # 获取CPU信息
            stdin, stdout, stderr = ssh_conn.client.exec_command("cat /proc/cpuinfo | grep 'cpu cores' | uniq | awk '{print $4}'")
            cpu_cores = stdout.read().decode('utf-8').strip() or "未知"
            
            # 获取CPU使用率
            stdin, stdout, stderr = ssh_conn.client.exec_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
            cpu_usage = stdout.read().decode('utf-8').strip() or "未知"
            
            # 获取内存信息
            stdin, stdout, stderr = ssh_conn.client.exec_command("free -m | grep 'Mem' | awk '{print $2, $3, $4}'")
            mem_info = stdout.read().decode('utf-8').strip().split()
            if len(mem_info) == 3:
                mem_total = f"{int(mem_info[0])} MB"
                mem_used = f"{int(mem_info[1])} MB"
                mem_free = f"{int(mem_info[2])} MB"
                mem_usage_percent = f"{int(int(mem_info[1]) / int(mem_info[0]) * 100)}%" if int(mem_info[0]) > 0 else "0%"
            else:
                mem_total = mem_used = mem_free = mem_usage_percent = "未知"
            
            # 获取磁盘信息
            stdin, stdout, stderr = ssh_conn.client.exec_command("df -h | grep -E '^/dev/' | awk '{print $1, $2, $3, $4, $5, $6}'")
            disk_info_lines = stdout.read().decode('utf-8').strip().split('\n')
            disk_info = []
            for line in disk_info_lines:
                if line:
                    parts = line.split()
                    if len(parts) >= 6:
                        disk_info.append({
                            'device': parts[0],
                            'size': parts[1],
                            'used': parts[2],
                            'available': parts[3],
                            'use_percent': parts[4],
                            'mount_point': parts[5]
                        })
            
            return jsonify({
                'success': True,
                'system_info': {
                    'cpu': {
                        'cores': cpu_cores,
                        'usage': cpu_usage + "%" if cpu_usage != "未知" else cpu_usage
                    },
                    'memory': {
                        'total': mem_total,
                        'used': mem_used,
                        'free': mem_free,
                        'usage_percent': mem_usage_percent
                    },
                    'disk': disk_info
                }
            })
        except Exception as cmd_error:
            return jsonify({'error': f'执行命令时出错: {str(cmd_error)}'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500