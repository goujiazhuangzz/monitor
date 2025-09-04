# -*- coding: utf-8 -*-

import paramiko
import threading
import time
import os
from collections import defaultdict

class SSHConnectionManager:
    """SSH连接管理器"""
    
    def __init__(self):
        self.connections = {}  # 存储活动的SSH连接
        self.shells = {}       # 存储活动的SSH Shell会话
        
    def connect(self, conn_id, connection_data):
        """建立SSH连接"""
        try:
            # 创建SSH客户端
            ssh_client = paramiko.SSHClient()
            ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # 获取连接参数
            host = connection_data['host']
            port = int(connection_data.get('port', 22))
            username = connection_data['username']
            
            # 根据认证方式连接
            if connection_data.get('auth_method') == 'key_file' and 'key_file' in connection_data:
                # 使用密钥文件认证
                key_file = connection_data['key_file']
                if os.path.exists(key_file):
                    private_key = paramiko.RSAKey.from_private_key_file(key_file)
                    ssh_client.connect(host, port=port, username=username, pkey=private_key)
                else:
                    raise Exception(f"密钥文件不存在: {key_file}")
            else:
                # 使用密码认证
                password = connection_data.get('password', '')
                ssh_client.connect(host, port=port, username=username, password=password)
            
            # 存储连接
            self.connections[conn_id] = ssh_client
            
            return True
        except Exception as e:
            print(f"SSH连接失败: {str(e)}")
            return False
    
    def disconnect(self, conn_id):
        """断开SSH连接"""
        if conn_id in self.connections:
            try:
                ssh_client = self.connections[conn_id]
                ssh_client.close()
            except Exception as e:
                print(f"关闭SSH连接时出错: {str(e)}")
            finally:
                # 从活动连接中移除
                if conn_id in self.connections:
                    del self.connections[conn_id]
    
    def is_connected(self, conn_id):
        """检查连接是否仍然有效"""
        if conn_id not in self.connections:
            return False
            
        try:
            ssh_client = self.connections[conn_id]
            ssh_client.exec_command('echo test', timeout=5)
            return True
        except Exception as e:
            # 连接已断开，清理资源
            self.disconnect(conn_id)
            return False
    
    def get_active_connections(self):
        """获取活动连接列表"""
        active_connections = []
        disconnected_connections = []
        
        for conn_id in self.connections:
            if self.is_connected(conn_id):
                active_connections.append(conn_id)
            else:
                disconnected_connections.append(conn_id)
        
        # 清理已断开的连接
        for conn_id in disconnected_connections:
            if conn_id in self.connections:
                del self.connections[conn_id]
        
        return active_connections

class SSHShellHandler:
    """SSH Shell处理器"""
    
    def __init__(self, ssh_manager):
        self.ssh_manager = ssh_manager
        self.shells = {}
    
    def create_shell(self, conn_id):
        """为指定连接创建Shell会话"""
        if conn_id not in self.ssh_manager.connections:
            return False
            
        try:
            ssh_client = self.ssh_manager.connections[conn_id]
            shell = ssh_client.invoke_shell()
            shell.settimeout(0)  # 非阻塞模式
            
            self.shells[conn_id] = shell
            return True
        except Exception as e:
            print(f"创建Shell会话失败: {str(e)}")
            return False
    
    def send_command(self, conn_id, command):
        """向Shell会话发送命令"""
        if conn_id not in self.shells:
            return False
            
        try:
            shell = self.shells[conn_id]
            shell.send(command)
            return True
        except Exception as e:
            print(f"发送命令失败: {str(e)}")
            return False
    
    def read_output(self, conn_id):
        """从Shell会话读取输出"""
        if conn_id not in self.shells:
            return None
            
        try:
            shell = self.shells[conn_id]
            if shell.recv_ready():
                output = shell.recv(1024).decode('utf-8')
                return output
            return None
        except Exception as e:
            print(f"读取输出失败: {str(e)}")
            return None
    
    def close_shell(self, conn_id):
        """关闭Shell会话"""
        if conn_id in self.shells:
            try:
                shell = self.shells[conn_id]
                shell.close()
            except Exception as e:
                print(f"关闭Shell会话时出错: {str(e)}")
            finally:
                del self.shells[conn_id]