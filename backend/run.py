#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

# 将项目根目录添加到Python路径中
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app

if __name__ == '__main__':
    # 从环境变量获取主机和端口，如果没有设置则使用默认值
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # 配置会话
    app.secret_key = 'your-secret-key-here'
    
    print(f"Starting Python Script Monitor API server on {host}:{port}")
    print(f"Debug mode: {debug}")
    
    # 运行Flask应用
    app.run(host=host, port=port, debug=debug)