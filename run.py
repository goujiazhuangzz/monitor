#!/usr/bin/env python3
"""
Main entry point for the Python Script Monitor application
"""

import os
import sys

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app'))

from app import create_app

if __name__ == '__main__':
    app, sock = create_app()
    
    # Check if templates directory exists and index.html exists
    if not os.path.exists(os.path.join(app.config['TEMPLATE_DIR'], 'index.html')):
        print("警告: 未找到templates/index.html文件，Web界面可能无法正常显示")
    
    port = 5000
    print(f"Starting monitor tool on http://localhost:{port}")
    print("Press Ctrl+C to stop")
    app.run(host='0.0.0.0', port=port, debug=False)