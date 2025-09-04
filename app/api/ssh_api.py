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


@ssh_bp.route('/api/ssh/connections', methods=['GET'])
def get_ssh_connections():
    """获取当前活动的SSH连接列表"""
    try:
        active_connections = list(ssh_connections.keys())
        return jsonify(active_connections)
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


@ssh_bp.route('/api/ssh/system_info', methods=['POST'])
def ssh_system_info():
    """获取SSH连接的远程系统信息"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')
        
        if not conn_id:
            return jsonify({'error': '连接ID是必需的'}), 400
        
        if conn_id not in ssh_connections:
            return jsonify({'error': '未找到指定的连接'}), 404
        
        ssh_conn = ssh_connections[conn_id]
        
        # 检查连接状态
        if not ssh_conn.connected:
            return jsonify({'error': 'SSH连接未建立'}), 400
            
        # 在远程服务器上执行命令获取系统信息
        try:
            # CPU使用率
            success_cpu, output_cpu, error_cpu = ssh_conn.send_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}'")
            if not success_cpu and error_cpu:
                return jsonify({'success': False, 'error': f'获取CPU信息失败: {error_cpu}'}), 200
                
            # 内存使用情况
            success_memory, output_memory, error_memory = ssh_conn.send_command("free -b | grep Mem | awk '{print $2, $3, $4}'")
            if not success_memory and error_memory:
                return jsonify({'success': False, 'error': f'获取内存信息失败: {error_memory}'}), 200
            
            # 磁盘使用情况
            success_disk, output_disk, error_disk = ssh_conn.send_command("df -B1 | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{print $1, $2, $3, $4, $6}'")
            if not success_disk and error_disk:
                # 尝试另一种格式
                success_disk, output_disk, error_disk = ssh_conn.send_command("df -k | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{print $1, $2, $3, $4, $6}'")
                if not success_disk and error_disk:
                    return jsonify({'success': False, 'error': f'获取磁盘信息失败: {error_disk}'}), 200
            
            # 解析CPU信息
            cpu_percent = float(output_cpu.strip()) if output_cpu.strip() else 0
            
            # 解析内存信息
            mem_parts = output_memory.strip().split()
            if len(mem_parts) >= 3:
                mem_total = int(mem_parts[0])
                mem_used = int(mem_parts[1])
                mem_free = int(mem_parts[2])
                mem_percent = (mem_used / mem_total) * 100 if mem_total > 0 else 0
            else:
                return jsonify({'success': False, 'error': '无法解析内存信息'}), 200
            
            # 解析磁盘信息
            disks = []
            for line in output_disk.strip().split('\n'):
                if line.strip():  # 确保行不为空
                    parts = line.split()
                    if len(parts) >= 5:
                        try:
                            device = parts[0]
                            # 尝试解析数字，如果失败则跳过该行
                            total = int(parts[1])
                            used = int(parts[2])
                            free = int(parts[3])
                            mountpoint = parts[4]
                            percent = (used / total) * 100 if total > 0 else 0
                            disks.append({
                                'device': device,
                                'mountpoint': mountpoint,
                                'total': total,
                                'used': used,
                                'free': free,
                                'percent': percent
                            })
                        except ValueError:
                            # 如果解析数字失败，跳过该行
                            continue
            
            return jsonify({
                'success': True,
                'system_info': {
                    'cpu': {
                        'percent': cpu_percent
                    },
                    'memory': {
                        'total': mem_total,
                        'used': mem_used,
                        'free': mem_free,
                        'percent': mem_percent
                    },
                    'disks': disks
                }
            })
        except Exception as cmd_error:
            app.logger.error(f'Error executing SSH commands: {str(cmd_error)}')
            return jsonify({'success': False, 'error': f'执行命令时出错: {str(cmd_error)}'}), 200
    except Exception as e:
        app.logger.error(f'Error in SSH system info endpoint: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 200
