# Python Script Monitor

A powerful and easy-to-use monitoring tool for managing Python scripts. This tool provides a web interface to start, stop, monitor, and view logs of Python scripts running on your local machine or remote servers via SSH.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Monitor all running Python processes in real-time
- Start and stop Python scripts with one click
- View detailed process information and resource usage
- Real-time log streaming for running scripts
- SSH connection to remote machines for script management
- Web-based user interface for easy access
- Configurable monitoring paths and exclusion patterns
- System resource monitoring (CPU, memory, disk usage)
- Interactive SSH console for remote server management

## Prerequisites

- Python 3.6+
- pip (Python package installer)

## Installation & Quick Start

### Method 1: Using the startup script (Recommended)

```bash
./run_monitor.sh
```

### Method 2: Manual installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the monitor:
```bash
python run.py
```

After starting the application, open your browser and navigate to `http://localhost:5000`

## Usage

1. After starting the monitor, access the web interface at `http://localhost:5000`
2. The "Local Script Management" tab shows running scripts and all Python scripts in configured monitor paths
3. Use the "Start" button to launch a script
4. Use the "Stop" button to terminate a running script
5. Click "View Logs" to see script logs and process information
6. Use the "Stream Logs" feature for real-time log monitoring
7. Configure SSH connections in the "SSH Management" tab to manage remote scripts
8. Use the interactive SSH console for remote server management
9. Configure monitoring paths and exclusion patterns in the "Configuration Management" tab

## Configuration

### Monitor Configuration

The monitor can be configured via [monitor_config.json](monitor_config.json):

- `monitor_paths`: List of paths to scan for Python scripts
- `exclude_patterns`: Patterns for excluding files from monitoring

Example configuration:
```json
{
  "monitor_paths": [
    ".",
    "../scripts",
    "../../projects"
  ],
  "exclude_patterns": [
    "monitor.py",
    "test_*.py",
    "*_test.py"
  ]
}
```

### SSH Configuration

SSH connections are configured in [ssh_config.json](ssh_config.json):

Example configuration:
```json
{
  "connections": [
    {
      "name": "Production Server",
      "host": "192.168.1.100",
      "port": 22,
      "username": "user",
      "auth_method": "password",
      "password": "password",
      "key_file": ""
    }
  ]
}
```

## Project Structure

```
.
├── run.py                  # Main application entry point
├── run_monitor.sh          # Startup script
├── requirements.txt        # Python dependencies
├── monitor_config.json     # Monitor configuration
├── ssh_config.json         # SSH configuration
├── app/                    # Application source code
│   ├── __init__.py         # Application initialization
│   ├── api/                # API endpoints
│   │   ├── process_api.py  # Process management APIs
│   │   ├── script_api.py   # Script management APIs
│   │   ├── ssh_api.py      # SSH connection APIs
│   │   ├── system_api.py   # System information APIs
│   │   ├── config_api.py   # Configuration APIs
│   │   └── ssh_websocket.py# SSH WebSocket handlers
│   ├── models/             # Data models
│   │   ├── process_logger.py # Process logging model
│   │   └── ssh_connection.py # SSH connection model
│   ├── utils/              # Utility functions
│   │   ├── config_loader.py  # Configuration loading utilities
│   │   └── process_manager.py# Process management utilities
│   ├── static/             # Static files
│   │   ├── css/            # Stylesheets
│   │   │   └── style.css   # Main stylesheet
│   │   └── js/             # JavaScript files
│   │       └── main.js     # Main JavaScript logic
│   └── templates/          # HTML templates
│       └── index.html      # Main interface
├── script_logs/            # Script log files (auto-created)
└── README.md               # This file
```

## API Endpoints

- `/api/processes` - Get all running Python processes
- `/api/scripts` - Get all Python scripts in monitored paths
- `/api/start` - Start a Python script
- `/api/stop` - Stop a running script by PID
- `/api/logs/<pid>` - Get logs for a specific process
- `/api/logs/stream/<pid>` - Stream logs in real-time using Server-Sent Events
- `/api/ssh/config` - Get or update SSH configuration
- `/api/ssh/connect` - Establish SSH connection
- `/api/ssh/disconnect` - Disconnect SSH session
- `/api/ssh/system_info` - Get remote system information via SSH
- `/api/system/info` - Get local system resource information
- `/api/config/monitor` - Get or update monitor configuration
- `/ws/ssh_shell/<conn_id>` - WebSocket endpoint for SSH shell

## User Interface

The web interface is organized into three main tabs:

1. **Local Script Management**
   - System information panel (collapsible)
   - Running scripts table with controls
   - All scripts table with pagination
   - Log viewer with real-time streaming capability

2. **SSH Remote Connection**
   - SSH connection configuration form
   - Saved connections list with connect/disconnect buttons
   - Connection status indicators
   - Remote system information display
   - Interactive SSH console

3. **Configuration Management**
   - Monitor paths configuration
   - Exclusion patterns configuration

## Important Notes

- The tool can only manage Python scripts in configured paths
- For security reasons, run this tool with regular user privileges
- Log viewing shows process information and resource usage, not standard output logs for manually started processes
- SSH functionality requires proper network connectivity and authentication
- SSH console filters out ANSI escape sequences for better readability

## Dependencies

- [Flask 2.3.2](https://pypi.org/project/Flask/2.3.2/) - Web framework
- [psutil 5.9.5](https://pypi.org/project/psutil/5.9.5/) - Process and system utilities
- [paramiko 3.3.1](https://pypi.org/project/paramiko/3.3.1/) - SSH protocol library
- [flask-sock 0.5.2](https://pypi.org/project/flask-sock/0.5.2/) - WebSocket support for Flask

## Screenshots

![Main Interface](screenshots/main_interface.png)
![SSH Management](screenshots/ssh_management.png)
![Log Streaming](screenshots/log_streaming.png)

*Note: Screenshots are for demonstration purposes. Actual interface may vary.*