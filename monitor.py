#!/usr/bin/env python3
"""
Monitor tool for managing Python scripts
Provides a web interface to view, start, stop, and view logs of Python scripts
Also provides SSH connection to remote machines
"""

import os
import sys
import psutil
import subprocess
import time
import json
import threading
import paramiko
import fnmatch
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from flask_sock import Sock
import logging
from datetime import datetime
from collections import deque
from werkzeug.serving import is_running_from_reloader

app = Flask(__name__)
sock = Sock(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 禁用 Flask 的开发服务器警告
cli = sys.modules.get('flask.cli')
if cli:
    cli.show_server_banner = lambda *x: None

# Get the directory of this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
LOGS_DIR = os.path.join(BASE_DIR, 'script_logs')
SSH_CONFIG_FILE = os.path.join(BASE_DIR, 'ssh_config.json')
MONITOR_CONFIG_FILE = os.path.join(BASE_DIR, 'monitor_config.json')

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
        json.dump(default_config, f, indent=2)

# Create default monitor config file if it doesn't exist
if not os.path.exists(MONITOR_CONFIG_FILE):
    default_config = {
        "monitor_paths": ["."],
        "exclude_patterns": ["monitor.py"]
    }
    with open(MONITOR_CONFIG_FILE, 'w') as f:
        json.dump(default_config, f, indent=2)

# Store for process logs (in-memory for active processes)
process_logs = {}

# Store for SSH connections
ssh_connections = {}

class ProcessLogger:
    """Helper class to capture and store process logs"""
    def __init__(self, pid, log_file_path):
        self.pid = pid
        self.log_file_path = log_file_path
        self.log_queue = deque(maxlen=1000)  # Keep last 1000 lines in memory
        self.lock = threading.Lock()
        
    def append_log(self, line):
        with self.lock:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            log_entry = f"[{timestamp}] {line}"
            self.log_queue.append(log_entry)
            
            # Also write to file
            try:
                with open(self.log_file_path, 'a', encoding='utf-8') as f:
                    f.write(log_entry + '\n')
            except Exception as e:
                print(f"Error writing to log file: {e}")

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
        while self.shell and not self.shell.closed:
            try:
                if self.shell.recv_ready():
                    output = self.shell.recv(1024).decode('utf-8', errors='ignore')
                    if self.ws:
                        self.ws.send(json.dumps({"output": output}))
                time.sleep(0.05)  # Small delay to prevent excessive CPU usage
            except Exception as e:
                if self.ws:
                    self.ws.send(json.dumps({"error": f"读取输出时出错: {str(e)}"}))
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
        if self.shell:
            self.shell.close()
        if self.client:
            self.client.close()
            self.connected = False

# Dictionary to hold loggers for running processes
process_loggers = {}

def load_monitor_config():
    """Load monitor configuration from file"""
    try:
        with open(MONITOR_CONFIG_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading monitor config: {e}")
        # Return default config
        return {
            "monitor_paths": ["."],
            "exclude_patterns": ["monitor.py"]
        }

def get_python_processes():
    """
    Get all running Python processes with their details
    """
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
        try:
            # 检查进程是否为Python进程
            if proc.info['name'] in ['python', 'python3', 'python.exe', 'python3.exe']:
                # 检查命令行参数
                if proc.info['cmdline'] and len(proc.info['cmdline']) > 1:
                    script_path = proc.info['cmdline'][1]
                    # 获取脚本名称
                    script_name = os.path.basename(script_path)
                    
                    # 检查是否为Python脚本
                    if script_path.endswith('.py'):
                        processes.append({
                            'pid': proc.info['pid'],
                            'script_name': script_name,
                            'script_path': script_path,
                            'cmdline': ' '.join(proc.info['cmdline']),
                            'start_time': datetime.fromtimestamp(proc.info['create_time']).strftime('%Y-%m-%d %H:%M:%S')
                        })
                    # 也包括直接用python -c命令运行的情况
                    elif '-c' in proc.info['cmdline']:
                        processes.append({
                            'pid': proc.info['pid'],
                            'script_name': 'python -c command',
                            'script_path': 'N/A',
                            'cmdline': ' '.join(proc.info['cmdline']),
                            'start_time': datetime.fromtimestamp(proc.info['create_time']).strftime('%Y-%m-%d %H:%M:%S')
                        })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return processes

def get_all_python_scripts():
    """
    Get all Python scripts in the configured monitor paths
    """
    config = load_monitor_config()
    monitor_paths = config.get("monitor_paths", ["."])
    exclude_patterns = config.get("exclude_patterns", ["monitor.py"])
    
    scripts = []
    processed_paths = set()  # 避免重复处理相同路径
    
    for path in monitor_paths:
        # 处理相对路径和绝对路径
        if not os.path.isabs(path):
            full_path = os.path.abspath(os.path.join(BASE_DIR, path))
        else:
            full_path = os.path.abspath(path)
            
        # 避免重复处理
        if full_path in processed_paths:
            continue
        processed_paths.add(full_path)
        
        # 检查路径是否存在
        if not os.path.exists(full_path):
            continue
            
        # 如果是文件且是Python脚本
        if os.path.isfile(full_path) and full_path.endswith('.py'):
            script_name = os.path.basename(full_path)
            # 检查是否在排除列表中
            should_exclude = False
            for pattern in exclude_patterns:
                if fnmatch.fnmatch(script_name, pattern):
                    should_exclude = True
                    break
            if not should_exclude:
                scripts.append({
                    'name': script_name,
                    'path': full_path,
                    'relative_path': os.path.relpath(full_path, BASE_DIR)
                })
        # 如果是目录，遍历目录下的所有Python脚本
        elif os.path.isdir(full_path):
            for root, dirs, files in os.walk(full_path):
                for file in files:
                    if file.endswith('.py'):
                        full_file_path = os.path.join(root, file)
                        relative_file_path = os.path.relpath(full_file_path, BASE_DIR)
                        
                        # 检查是否在排除列表中
                        should_exclude = False
                        for pattern in exclude_patterns:
                            if fnmatch.fnmatch(file, pattern):
                                should_exclude = True
                                break
                        if not should_exclude:
                            scripts.append({
                                'name': file,
                                'path': full_file_path,
                                'relative_path': relative_file_path
                            })
    
    return scripts

def capture_process_output(process, logger):
    """
    Capture stdout and stderr from a process and log it
    """
    def log_output(pipe):
        for line in iter(pipe.readline, b''):
            try:
                decoded_line = line.decode('utf-8', errors='ignore').rstrip()
                logger.append_log(decoded_line)
            except Exception as e:
                logger.append_log(f"Error decoding line: {e}")
        pipe.close()
    
    # Start threads to capture stdout and stderr
    stdout_thread = threading.Thread(target=log_output, args=(process.stdout,))
    stderr_thread = threading.Thread(target=log_output, args=(process.stderr,))
    
    stdout_thread.daemon = True
    stderr_thread.daemon = True
    
    stdout_thread.start()
    stderr_thread.start()

@app.route('/')
def index():
    """
    Main page showing all Python scripts and running processes
    """
    return render_template('index.html')

@app.route('/api/processes')
def api_processes():
    """
    API endpoint to get running Python processes
    """
    return jsonify(get_python_processes())

@app.route('/api/scripts')
def api_scripts():
    """
    API endpoint to get all Python scripts
    """
    return jsonify(get_all_python_scripts())

@app.route('/api/start', methods=['POST'])
def start_script():
    """
    Start a Python script
    """
    data = request.get_json()
    script_path = data.get('script_path')
    
    if not script_path:
        return jsonify({'error': 'Script path is required'}), 400
    
    # 验证脚本路径是否在监控路径中
    config = load_monitor_config()
    monitor_paths = config.get("monitor_paths", ["."])
    
    is_valid_path = False
    for path in monitor_paths:
        if not os.path.isabs(path):
            full_path = os.path.abspath(os.path.join(BASE_DIR, path))
        else:
            full_path = os.path.abspath(path)
            
        # 检查脚本是否在监控路径下
        if os.path.commonpath([full_path, script_path]) == full_path:
            is_valid_path = True
            break
    
    if not is_valid_path:
        return jsonify({'error': 'Script path is not in monitored paths'}), 400
    
    if not os.path.exists(script_path):
        return jsonify({'error': f'Script {script_path} not found'}), 404
    
    try:
        script_name = os.path.basename(script_path)
        script_dir = os.path.dirname(script_path)
        
        # Create log file for this process
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_filename = f"{os.path.splitext(script_name)[0]}_{timestamp}.log"
        log_file_path = os.path.join(LOGS_DIR, log_filename)
        
        # Start the script as a subprocess
        # 使用preexec_fn=os.setsid确保子进程有独立的进程组
        process = subprocess.Popen([sys.executable, script_path], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE,
                                 cwd=script_dir,
                                 preexec_fn=os.setsid)
        
        time.sleep(0.5)  # Give process time to start
        
        # Create logger for this process
        proc_logger = ProcessLogger(process.pid, log_file_path)
        process_loggers[process.pid] = proc_logger
        
        # Start capturing output
        capture_process_output(process, proc_logger)
        
        return jsonify({
            'success': True,
            'message': f'Script {script_name} started with PID {process.pid}',
            'pid': process.pid
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stop', methods=['POST'])
def stop_script():
    """
    Stop a running Python script by PID
    """
    data = request.get_json()
    pid = data.get('pid')
    
    if not pid:
        return jsonify({'error': 'PID is required'}), 400
    
    try:
        pid = int(pid)
        process = psutil.Process(pid)
        
        # Check if it's actually a Python script
        if 'python' not in process.name().lower():
            return jsonify({'error': 'Process is not a Python script'}), 400
        
        # Terminate the process
        process.terminate()
        process.wait(timeout=5)  # Wait up to 5 seconds for graceful termination
        
        # Clean up logger
        if pid in process_loggers:
            del process_loggers[pid]
        
        return jsonify({
            'success': True,
            'message': f'Process {pid} terminated successfully'
        })
    except psutil.NoSuchProcess:
        return jsonify({'error': 'Process not found'}), 404
    except psutil.TimeoutExpired:
        # Force kill if graceful termination failed
        try:
            process.kill()
            # Clean up logger
            if pid in process_loggers:
                del process_loggers[pid]
            return jsonify({
                'success': True,
                'message': f'Process {pid} killed forcefully'
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/<int:pid>')
def script_logs(pid):
    """
    Get logs from a running script
    """
    try:
        # Check if we have an active logger for this process
        if pid in process_loggers:
            logger = process_loggers[pid]
            with logger.lock:
                logs = list(logger.log_queue)
            return jsonify({
                'pid': pid,
                'logs': logs,
                'source': 'active'
            })
        
        # If not an active process, check for saved log file
        process = psutil.Process(pid)
        if 'python' not in process.name().lower():
            return jsonify({'error': 'Process is not a Python script'}), 400
            
        # For manually started processes, we can't capture logs
        # But we can provide process information
        return jsonify({
            'pid': pid,
            'name': process.name(),
            'cmdline': ' '.join(process.cmdline()),
            'status': process.status(),
            'create_time': datetime.fromtimestamp(process.create_time()).strftime('%Y-%m-%d %H:%M:%S'),
            'cpu_percent': process.cpu_percent(),
            'memory_info': process.memory_info()._asdict(),
            'logs': ['注意: 此进程为手动启动，无法获取实时日志'],
            'source': 'process_info'
        })
    except psutil.NoSuchProcess:
        # Check if there's a saved log file
        log_files = [f for f in os.listdir(LOGS_DIR) if f.startswith(f"script_{pid}_")]
        if log_files:
            latest_log = sorted(log_files)[-1]
            log_path = os.path.join(LOGS_DIR, latest_log)
            try:
                with open(log_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()[-100:]  # Last 100 lines
                return jsonify({
                    'pid': pid,
                    'logs': [line.rstrip() for line in lines],
                    'source': 'file'
                })
            except Exception as e:
                return jsonify({'error': f'Error reading log file: {str(e)}'}), 500
        return jsonify({'error': 'Process not found and no log file available'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/stream/<int:pid>')
def stream_script_logs(pid):
    """
    Stream logs from a running script using Server-Sent Events
    """
    # 检查进程是否存在
    try:
        process = psutil.Process(pid)
        if 'python' not in process.name().lower():
            return "data: {\"error\": \"Process is not a Python script\"}\n\n", 400
    except psutil.NoSuchProcess:
        return "data: {\"error\": \"Process not found\"}\n\n", 404
    
    # 如果是通过监控工具启动的进程，使用实时日志
    if pid in process_loggers:
        logger = process_loggers[pid]
        
        def generate():
            last_sent = 0
            while True:
                try:
                    # Check if process still exists
                    if not psutil.pid_exists(pid):
                        yield "data: {\"end\": true}\n\n"
                        break
                    
                    with logger.lock:
                        current_len = len(logger.log_queue)
                        if current_len > last_sent:
                            # Send new log lines
                            for i in range(last_sent, current_len):
                                log_line = logger.log_queue[i]
                                yield f"data: {{\"line\": {json.dumps(log_line)}}}\n\n"
                            last_sent = current_len
                    
                    time.sleep(1)  # Check for new logs every second
                except Exception as e:
                    yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
                    break
        
        return Response(stream_with_context(generate()), mimetype='text/event-stream')
    
    # 如果是手动启动的进程，返回提示信息
    def generate():
        yield "data: {\"line\": \"[提示] 此进程为手动启动，无法获取实时日志输出\"}\n\n"
        yield "data: {\"line\": \"[提示] 请查看进程基本信息:\"}\n\n"
        try:
            process = psutil.Process(pid)
            yield f"data: {{\"line\": \"PID: {pid}\"}}\n\n"
            yield f"data: {{\"line\": \"名称: {process.name()}\"}}\n\n"
            yield f"data: {{\"line\": \"命令行: {' '.join(process.cmdline())}\"}}\n\n"
            yield f"data: {{\"line\": \"状态: {process.status()}\"}}\n\n"
            yield f"data: {{\"line\": \"启动时间: {datetime.fromtimestamp(process.create_time()).strftime('%Y-%m-%d %H:%M:%S')}\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"error\": \"获取进程信息时出错: {str(e)}\"}}\n\n"
        yield "data: {\"end\": true}\n\n"
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

# SSH相关API接口
@app.route('/api/ssh/config', methods=['GET'])
def get_ssh_config():
    """获取SSH配置"""
    try:
        with open(SSH_CONFIG_FILE, 'r') as f:
            config = json.load(f)
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ssh/config', methods=['POST'])
def save_ssh_config():
    """保存SSH配置"""
    try:
        config = request.get_json()
        with open(SSH_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return jsonify({'success': True, 'message': 'SSH配置已保存'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ssh/connect', methods=['POST'])
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

@app.route('/api/ssh/disconnect', methods=['POST'])
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

@app.route('/api/ssh/execute', methods=['POST'])
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
        success, result = ssh_conn.execute_command(command)
        
        if success:
            return jsonify({'success': True, 'result': result})
        else:
            return jsonify({'error': f'执行命令失败: {result}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ssh/open_shell', methods=['POST'])
def ssh_open_shell():
    """打开SSH shell"""
    # This is now handled by the WebSocket connection
    return jsonify({'success': True, 'message': 'Shell opened via WebSocket'})

# WebSocket for SSH shell
@sock.route('/ws/ssh_shell/<conn_id>')
def ssh_shell_websocket(ws, conn_id):
    if conn_id not in ssh_connections:
        ws.send(json.dumps({"error": "SSH连接不存在"}))
        ws.close()
        return
    
    ssh_conn = ssh_connections[conn_id]
    
    # Open shell with WebSocket
    success, message = ssh_conn.open_shell(ws)
    
    if not success:
        ws.send(json.dumps({"error": f"打开Shell失败: {message}"}))
        ws.close()
        return
    
    try:
        while True:
            data = ws.receive()
            if data:
                try:
                    message = json.loads(data)
                    if 'command' in message:
                        ssh_conn.send_command(message['command'])
                except json.JSONDecodeError:
                    # 如果不是JSON，当作命令直接发送
                    ssh_conn.send_command(data)
    except Exception as e:
        print(f"WebSocket连接错误: {str(e)}")
    finally:
        ws.close()

# System info API
@app.route('/api/system/info')
def get_system_info():
    """获取系统信息"""
    try:
        # CPU信息
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # 内存信息
        memory = psutil.virtual_memory()
        
        # 磁盘信息 (所有分区)
        disk_partitions = psutil.disk_partitions()
        disks = []
        for partition in disk_partitions:
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disks.append({
                    'device': partition.device,
                    'mountpoint': partition.mountpoint,
                    'total': usage.total,
                    'used': usage.used,
                    'free': usage.free,
                    'percent': (usage.used / usage.total) * 100 if usage.total > 0 else 0
                })
            except PermissionError:
                # 某些分区可能没有访问权限，跳过
                continue
        
        # 获取CPU和内存占用最高的5个进程
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # 按CPU使用率排序，取前5
        top_cpu_processes = sorted(processes, key=lambda x: x['cpu_percent'] if x['cpu_percent'] is not None else 0, reverse=True)[:5]
        
        # 按内存使用率排序，取前5
        top_memory_processes = sorted(processes, key=lambda x: x['memory_percent'] if x['memory_percent'] is not None else 0, reverse=True)[:5]
        
        return jsonify({
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count
            },
            'memory': {
                'total': memory.total,
                'available': memory.available,
                'used': memory.used,
                'percent': memory.percent
            },
            'disks': disks,
            'top_processes': {
                'cpu': top_cpu_processes,
                'memory': top_memory_processes
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Monitor config API
@app.route('/api/config/monitor', methods=['GET'])
def get_monitor_config():
    """获取监控配置"""
    try:
        config = load_monitor_config()
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/config/monitor', methods=['POST'])
def save_monitor_config():
    """保存监控配置"""
    try:
        config = request.get_json()
        with open(MONITOR_CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return jsonify({'success': True, 'message': '监控配置已保存'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Check if templates directory exists and index.html exists
    if not os.path.exists(os.path.join(TEMPLATE_DIR, 'index.html')):
        print("警告: 未找到templates/index.html文件，Web界面可能无法正常显示")
    
    port = 5000
    print(f"Starting monitor tool on http://localhost:{port}")
    print("Press Ctrl+C to stop")
    app.run(host='0.0.0.0', port=port, debug=False)