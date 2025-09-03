"""
System API
Provides endpoints for retrieving system information
"""

import psutil
from flask import Blueprint, jsonify

system_bp = Blueprint('system', __name__)


@system_bp.route('/api/system/info')
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