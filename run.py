#!/usr/bin/env python3
"""
Main entry point for the Python Script Monitor application
"""

import os
import sys
import argparse

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app'))

from app import create_app

if __name__ == '__main__':
    app, sock = create_app()
    
    # Check if templates directory exists and index.html exists
    if not os.path.exists(os.path.join(app.config['TEMPLATE_DIR'], 'index.html')):
        print("警告: 未找到templates/index.html文件，Web界面可能无法正常显示")
    
    # Parse command line arguments for port
    parser = argparse.ArgumentParser(description='Python Script Monitor')
    parser.add_argument('-p', '--port', type=int, default=5000, help='Port to run the monitor on (default: 5000)')
    args = parser.parse_args()
    
    port = args.port
    print(f"Starting monitor tool on http://localhost:{port}")
    print("Press Ctrl+C to stop")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Error: Port {port} is already in use.")
            print("Please try another port using the -p option, for example:")
            print(f"  python3 run.py -p {port + 1}")
            if port == 5000 and sys.platform == "darwin":
                print("On macOS, you can also try disabling the 'AirPlay Receiver' service")
                print("from System Preferences -> General -> AirDrop & Handoff.")
        else:
            raise e