"""
Process API
Provides endpoints for managing running processes
"""

from flask import Blueprint, request, jsonify, Response, stream_with_context
import psutil
import os
import json
import time
from datetime import datetime
from app.utils.process_manager import get_python_processes, capture_process_output
from app.models.process_logger import ProcessLogger

process_bp = Blueprint('process', __name__)

# Global store for process loggers
process_loggers = {}


@process_bp.route('/api/processes')
def api_processes():
    """
    API endpoint to get running Python processes
    """
    return jsonify(get_python_processes())


@process_bp.route('/api/stop', methods=['POST'])
def stop_script():
    """
    Stop a running Python script by PID
    """
    from app import create_app
    app, _ = create_app()
    
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


@process_bp.route('/api/kill', methods=['POST'])
def kill_process():
    """
    Kill any running process by PID (not limited to Python scripts)
    """
    data = request.get_json()
    pid = data.get('pid')
    
    if not pid:
        return jsonify({'error': 'PID is required'}), 400
    
    try:
        pid = int(pid)
        process = psutil.Process(pid)
        
        # Terminate the process
        process.terminate()
        process.wait(timeout=5)  # Wait up to 5 seconds for graceful termination
        
        # Clean up logger if exists
        if pid in process_loggers:
            del process_loggers[pid]
        
        return jsonify({
            'success': True,
            'message': f'Process {pid} terminated successfully'
        })
    except psutil.NoSuchProcess:
        return jsonify({'error': 'Process not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@process_bp.route('/api/logs/<int:pid>')
def script_logs(pid):
    """
    Get logs from a running script
    """
    from app import create_app
    app, _ = create_app()
    LOGS_DIR = app.config['LOGS_DIR']
    
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


@process_bp.route('/api/logs/stream/<int:pid>')
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
