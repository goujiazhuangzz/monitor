"""
SSH API
Provides endpoints for managing SSH connections
"""

# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify, current_app
import paramiko
import threading
import json
import time
import os
from app.utils.ssh_utils import SSHConnectionManager, SSHShellHandler
from app.utils.config_loader import load_ssh_config, save_ssh_config

ssh_bp = Blueprint('ssh', __name__)

# 初始化SSH连接管理器
ssh_manager = SSHConnectionManager()

@ssh_bp.route('/config', methods=['GET'])
def get_ssh_config():
    """获取SSH配置"""
    try:
        config = load_ssh_config()
        return jsonify(config)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/save_connection', methods=['POST'])
def save_ssh_connection():
    """保存SSH连接配置"""
    try:
        connection_data = request.get_json()
        if not connection_data:
            return jsonify({'success': False, 'error': '无效的请求数据'}), 400

        # 加载现有配置
        config = load_ssh_config()
        if 'connections' not in config:
            config['connections'] = []

        # 检查连接名称是否已存在
        existing_index = None
        for i, conn in enumerate(config['connections']):
            if conn['name'] == connection_data['name']:
                existing_index = i
                break

        # 更新或添加连接
        if existing_index is not None:
            config['connections'][existing_index] = connection_data
        else:
            config['connections'].append(connection_data)

        # 保存配置
        save_ssh_config(config)
        return jsonify({'success': True, 'message': '连接配置保存成功'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/delete_connection/<conn_name>', methods=['DELETE'])
def delete_ssh_connection(conn_name):
    """删除SSH连接配置"""
    try:
        # 加载现有配置
        config = load_ssh_config()
        if 'connections' not in config:
            config['connections'] = []

        # 查找并删除连接
        config['connections'] = [conn for conn in config['connections'] if conn['name'] != conn_name]

        # 保存配置
        save_ssh_config(config)
        return jsonify({'success': True, 'message': '连接配置删除成功'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/connect', methods=['POST'])
def connect_ssh():
    """建立SSH连接"""
    try:
        connection_data = request.get_json()
        if not connection_data:
            return jsonify({'success': False, 'error': '无效的请求数据'}), 400

        conn_id = connection_data.get('conn_id')
        if not conn_id:
            return jsonify({'success': False, 'error': '缺少连接ID'}), 400

        # 检查连接是否已存在
        if ssh_manager.is_connected(conn_id):
            return jsonify({'success': True, 'message': '连接已存在'})

        # 建立新连接
        success = ssh_manager.connect(conn_id, connection_data)
        if success:
            return jsonify({'success': True, 'message': 'SSH连接建立成功'})
        else:
            return jsonify({'success': False, 'error': 'SSH连接建立失败'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/disconnect', methods=['POST'])
def disconnect_ssh():
    """断开SSH连接"""
    try:
        connection_data = request.get_json()
        if not connection_data:
            return jsonify({'success': False, 'error': '无效的请求数据'}), 400

        conn_id = connection_data.get('conn_id')
        if not conn_id:
            return jsonify({'success': False, 'error': '缺少连接ID'}), 400

        # 断开连接
        ssh_manager.disconnect(conn_id)
        return jsonify({'success': True, 'message': 'SSH连接已断开'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/connections', methods=['GET'])
def get_active_connections():
    """获取活动的SSH连接列表"""
    try:
        active_connections = ssh_manager.get_active_connections()
        return jsonify(active_connections)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/execute', methods=['POST'])
def execute_ssh_command():
    """在SSH连接上执行命令"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')
        command = data.get('command')

        if not conn_id or not command:
            return jsonify({'success': False, 'error': '缺少连接ID或命令'}), 400

        # 执行命令
        output = ssh_manager.execute_command(conn_id, command)
        return jsonify({'success': True, 'output': output})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/shell', methods=['POST'])
def start_ssh_shell():
    """启动SSH Shell"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')

        if not conn_id:
            return jsonify({'success': False, 'error': '缺少连接ID'}), 400

        # 启动Shell
        shell_handler = SSHShellHandler(ssh_manager.get_client(conn_id))
        shell_handler.start_shell()
        return jsonify({'success': True, 'message': 'SSH Shell已启动'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/shell_input', methods=['POST'])
def send_shell_input():
    """发送Shell输入"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')
        input_data = data.get('input')

        if not conn_id or not input_data:
            return jsonify({'success': False, 'error': '缺少连接ID或输入数据'}), 400

        # 发送输入
        shell_handler = SSHShellHandler(ssh_manager.get_client(conn_id))
        shell_handler.send_input(input_data)
        return jsonify({'success': True, 'message': '输入已发送'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/shell_output', methods=['GET'])
def get_shell_output():
    """获取Shell输出"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')

        if not conn_id:
            return jsonify({'success': False, 'error': '缺少连接ID'}), 400

        # 获取输出
        shell_handler = SSHShellHandler(ssh_manager.get_client(conn_id))
        output = shell_handler.get_output()
        return jsonify({'success': True, 'output': output})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ssh_bp.route('/shell_close', methods=['POST'])
def close_ssh_shell():
    """关闭SSH Shell"""
    try:
        data = request.get_json()
        conn_id = data.get('conn_id')

        if not conn_id:
            return jsonify({'success': False, 'error': '缺少连接ID'}), 400

        # 关闭Shell
        shell_handler = SSHShellHandler(ssh_manager.get_client(conn_id))
        shell_handler.close_shell()
        return jsonify({'success': True, 'message': 'SSH Shell已关闭'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
