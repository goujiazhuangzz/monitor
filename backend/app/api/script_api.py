"""
Script API
Provides endpoints for managing Python scripts
"""

import os
import sys
import subprocess
import glob
from flask import Blueprint, request, jsonify
from app.utils.config_loader import load_monitor_config
from datetime import datetime

script_bp = Blueprint('script', __name__)

def get_all_python_scripts():
    """
    Get all Python scripts in monitored directories
    """
    try:
        # 加载监控配置
        config = load_monitor_config(None)
        monitor_paths = config.get("monitor_paths", ["."])
        exclude_patterns = config.get("exclude_patterns", [])
        
        scripts = []
        processed_paths = set()  # 避免重复处理相同路径
        
        for base_path in monitor_paths:
            if not os.path.exists(base_path):
                continue
                
            # 规范化路径
            base_path = os.path.abspath(base_path)
            
            # 避免重复处理
            if base_path in processed_paths:
                continue
            processed_paths.add(base_path)
            
            # 递归搜索Python文件
            for root, dirs, files in os.walk(base_path):
                # 跳过排除的目录
                dirs[:] = [d for d in dirs if not _should_exclude(os.path.join(root, d), exclude_patterns)]
                
                for file in files:
                    if file.endswith('.py'):
                        file_path = os.path.join(root, file)
                        if not _should_exclude(file_path, exclude_patterns):
                            rel_path = os.path.relpath(file_path, base_path)
                            last_modified = os.path.getmtime(file_path)
                            
                            scripts.append({
                                'name': file,
                                'path': file_path,
                                'relative_path': rel_path,
                                'last_modified': datetime.fromtimestamp(last_modified).strftime('%Y-%m-%d %H:%M:%S')
                            })
        
        return scripts
    except Exception as e:
        print(f"Error getting Python scripts: {e}")
        return []

def _should_exclude(path, exclude_patterns):
    """
    Check if a path should be excluded based on patterns
    """
    path = path.replace('\\', '/')  # 统一使用正斜杠
    
    for pattern in exclude_patterns:
        pattern = pattern.replace('\\', '/')  # 统一使用正斜杠
        if glob.fnmatch.fnmatch(path, pattern):
            return True
        # 也检查文件名本身是否匹配模式
        if glob.fnmatch.fnmatch(os.path.basename(path), pattern):
            return True
    return False

@script_bp.route('/list')
def list_scripts():
    """
    API endpoint to get all Python scripts
    """
    try:
        # 获取当前目录及子目录中的所有Python脚本
        scripts = get_all_python_scripts()
        return jsonify({'success': True, 'scripts': scripts})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@script_bp.route('/run', methods=['POST'])
def run_script():
    """
    Run a Python script
    """
    try:
        data = request.get_json()
        script_path = data.get('path')
        
        if not script_path:
            return jsonify({'success': False, 'error': '脚本路径是必需的'}), 400
        
        # 验证脚本文件是否存在
        if not os.path.exists(script_path):
            return jsonify({'success': False, 'error': '脚本文件不存在'}), 400
        
        # 运行脚本并获取输出
        try:
            # 使用subprocess运行脚本
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=30  # 30秒超时
            )
            
            output = result.stdout
            if result.stderr:
                output += "\n错误输出:\n" + result.stderr
                
            return jsonify({
                'success': True,
                'output': output,
                'returncode': result.returncode
            })
        except subprocess.TimeoutExpired:
            return jsonify({
                'success': False,
                'error': '脚本执行超时（超过30秒）'
            }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'执行脚本时出错: {str(e)}'
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@script_bp.route('/content')
def get_script_content():
    """
    Get content of a Python script
    """
    try:
        script_path = request.args.get('path')
        
        if not script_path:
            return jsonify({'success': False, 'error': '脚本路径是必需的'}), 400
        
        # 验证脚本文件是否存在
        if not os.path.exists(script_path):
            return jsonify({'success': False, 'error': '脚本文件不存在'}), 400
        
        # 读取脚本内容
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        return jsonify({
            'success': True,
            'content': content
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@script_bp.route('/save', methods=['POST'])
def save_script():
    """
    Save content to a Python script
    """
    try:
        data = request.get_json()
        script_path = data.get('path')
        content = data.get('content')
        name = data.get('name')
        
        if not script_path:
            return jsonify({'success': False, 'error': '脚本路径是必需的'}), 400
        
        # 创建目录（如果不存在）
        os.makedirs(os.path.dirname(script_path), exist_ok=True)
        
        # 保存脚本内容
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return jsonify({
            'success': True,
            'message': '脚本保存成功'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@script_bp.route('/delete', methods=['POST'])
def delete_script():
    """
    Delete a Python script
    """
    try:
        data = request.get_json()
        script_path = data.get('path')
        
        if not script_path:
            return jsonify({'success': False, 'error': '脚本路径是必需的'}), 400
        
        # 验证脚本文件是否存在
        if not os.path.exists(script_path):
            return jsonify({'success': False, 'error': '脚本文件不存在'}), 400
        
        # 删除脚本文件
        os.remove(script_path)
            
        return jsonify({
            'success': True,
            'message': '脚本删除成功'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500