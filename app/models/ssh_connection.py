"""
SSH Connection Model
Provides functionality for managing SSH connections
"""

import threading
import time
import paramiko
import json
import re

class SSHConnection:
    """Helper class to manage SSH connections"""
    
    def __init__(self, host, port, username, password=None, key_file=None):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.key_file = key_file
        self.client = None
        self.connected = False
        self.shell = None
        self.shell_thread = None
        self.ws = None
        
    def connect(self):
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            if self.key_file:
                self.client.connect(
                    hostname=self.host,
                    port=self.port,
                    username=self.username,
                    key_filename=self.key_file
                )
            else:
                self.client.connect(
                    hostname=self.host,
                    port=self.port,
                    username=self.username,
                    password=self.password
                )
            
            self.connected = True
            return True, "Connected successfully"
        except Exception as e:
            self.connected = False
            return False, str(e)
    
    def open_shell(self, ws):
        """Open an interactive shell"""
        if not self.connected or not self.client:
            return False, "Not connected"
        
        try:
            self.ws = ws
            self.shell = self.client.invoke_shell()
            self.shell.settimeout(0)  # Non-blocking
            
            # Start a thread to read from the shell
            self.shell_thread = threading.Thread(target=self._read_shell_output)
            self.shell_thread.daemon = True
            self.shell_thread.start()
            
            return True, "Shell opened"
        except Exception as e:
            return False, str(e)
    
    def _read_shell_output(self):
        """Read output from the shell in a separate thread"""
        # ANSI转义序列的正则表达式模式
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        
        while self.shell and not self.shell.closed:
            try:
                if self.shell.recv_ready():
                    output = self.shell.recv(1024).decode('utf-8', errors='ignore')
                    # 过滤ANSI转义序列
                    clean_output = ansi_escape.sub('', output)
                    if self.ws:
                        try:
                            self.ws.send(json.dumps({"output": clean_output}))
                        except:
                            # WebSocket连接已关闭
                            break
                time.sleep(0.05)  # Small delay to prevent excessive CPU usage
            except Exception as e:
                if self.ws:
                    try:
                        self.ws.send(json.dumps({"error": f"读取输出时出错: {str(e)}"}))
                    except:
                        pass
                break
    
    def send_command(self, command):
        """Send command to the shell"""
        if not self.shell:
            return False, "Shell not opened"
        
        try:
            # Add newline if not present
            if not command.endswith('\n'):
                command += '\n'
            self.shell.send(command)
            return True, "Command sent"
        except Exception as e:
            return False, str(e)
    
    def disconnect(self):
        if self.shell_thread:
            # 等待线程结束
            if self.shell_thread.is_alive():
                self.shell_thread.join(timeout=1)
        if self.shell:
            self.shell.close()
        if self.client:
            self.client.close()
            self.connected = False