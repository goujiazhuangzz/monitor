"""
Process Manager Utility
Provides functionality for managing and monitoring processes
"""

import os
import psutil
import fnmatch
import threading
from datetime import datetime
from app.utils.config_loader import load_monitor_config


def get_python_processes():
    """
    Get all running Python processes with their details
    """
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
        try:
            # 检查进程是否为Python进程 - 改进检测逻辑
            name = proc.info['name'].lower() if proc.info['name'] else ''
            is_python_process = (
                'python' in name or 
                name in ['python', 'python3', 'python.exe', 'python3.exe']
            )
            
            if is_python_process:
                # 检查命令行参数
                cmdline = proc.info['cmdline']
                if cmdline and len(cmdline) > 0:
                    # 第一个参数通常是python解释器
                    if len(cmdline) > 1:
                        script_path = cmdline[1]
                        # 获取脚本名称
                        script_name = os.path.basename(script_path)
                        
                        # 检查是否为Python脚本
                        if script_path.endswith('.py'):
                            processes.append({
                                'pid': proc.info['pid'],
                                'script_name': script_name,
                                'script_path': script_path,
                                'cmdline': ' '.join(cmdline),
                                'start_time': datetime.fromtimestamp(proc.info['create_time']).strftime('%Y-%m-%d %H:%M:%S')
                            })
                        # 也包括直接用python -c命令运行的情况
                        elif '-c' in cmdline:
                            processes.append({
                                'pid': proc.info['pid'],
                                'script_name': 'python -c command',
                                'script_path': 'N/A',
                                'cmdline': ' '.join(cmdline),
                                'start_time': datetime.fromtimestamp(proc.info['create_time']).strftime('%Y-%m-%d %H:%M:%S')
                            })
                    else:
                        # 只有python命令，没有脚本参数
                        processes.append({
                            'pid': proc.info['pid'],
                            'script_name': 'python interpreter',
                            'script_path': 'N/A',
                            'cmdline': ' '.join(cmdline),
                            'start_time': datetime.fromtimestamp(proc.info['create_time']).strftime('%Y-%m-%d %H:%M:%S')
                        })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return processes


def get_all_python_scripts(app):
    """
    Get all Python scripts in the configured monitor paths
    """
    config = load_monitor_config(app)
    monitor_paths = config.get("monitor_paths", ["."])
    exclude_patterns = config.get("exclude_patterns", ["monitor.py"])
    
    scripts = []
    processed_paths = set()  # 避免重复处理相同路径
    
    for path in monitor_paths:
        # 处理相对路径和绝对路径
        if not os.path.isabs(path):
            full_path = os.path.abspath(os.path.join(app.config['BASE_DIR'], path))
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
                    'relative_path': os.path.relpath(full_path, app.config['BASE_DIR'])
                })
        # 如果是目录，遍历目录下的所有Python脚本
        elif os.path.isdir(full_path):
            for root, dirs, files in os.walk(full_path):
                for file in files:
                    if file.endswith('.py'):
                        full_file_path = os.path.join(root, file)
                        relative_file_path = os.path.relpath(full_file_path, app.config['BASE_DIR'])
                        
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