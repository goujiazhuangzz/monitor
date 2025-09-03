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
python monitor.py
```

After starting the application, open your browser and navigate to `http://localhost:5000`

## Usage

1. After starting the monitor, access the web interface at `http://localhost:5000`
2. The "Running Scripts" section shows all currently running Python processes
3. The "All Scripts" section lists all Python scripts in configured monitor paths
4. Use the "Start" button to launch a script
5. Use the "Stop" button to terminate a running script
6. Click "View Logs" to see script logs and process information
7. Use the "Stream Logs" feature for real-time log monitoring
8. Configure SSH connections in the "SSH Management" section to manage remote scripts

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
├── monitor.py              # Main application
├── run_monitor.sh          # Startup script
├── requirements.txt        # Python dependencies
├── monitor_config.json     # Monitor configuration
├── ssh_config.json         # SSH configuration
├── templates/              # Web interface templates
│   └── index.html          # Main interface
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
- `/api/system/info` - Get system resource information
- `/api/config/monitor` - Get or update monitor configuration

## Important Notes

- The tool can only manage Python scripts in configured paths
- For security reasons, run this tool with regular user privileges
- Log viewing shows process information and resource usage, not standard output logs for manually started processes
- SSH functionality requires proper network connectivity and authentication

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