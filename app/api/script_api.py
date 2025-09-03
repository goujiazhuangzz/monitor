"""
Script API
Provides endpoints for managing Python scripts
"""

import os
import sys
import subprocess
from flask import Blueprint, request, jsonify
from app.utils.process_manager import get_all_python_scripts, capture_process_output
from app.models.process_logger import ProcessLogger
from app.utils.config_loader import load_monitor_config
from datetime import datetime

script_bp = Blueprint('script', __name__)

# Global store for process loggers
from app.api.process_api import process_loggers


@script_bp.route('/api/scripts')
def api_scripts():
    """
    API endpoint to get all Python scripts
    """
    from app import create_app
    app, _ = create_app()
    return jsonify(get_all_python_scripts(app))


@script_bp.route('/api/start', methods=['POST'])
def start_script():
    """
    Start a Python script
    """
    from app import create_app
    app, _ = create_app()
    BASE_DIR = app.config['BASE_DIR']
    LOGS_DIR = app.config['LOGS_DIR']
    
    data = request.get_json()
    script_path = data.get('script_path')
    
    if not script_path:
        return jsonify({'error': 'Script path is required'}), 400
    
    # 验证脚本路径是否在监控路径中
    config = load_monitor_config(app)
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
        
        # Give process time to start
        import time
        time.sleep(0.5)
        
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