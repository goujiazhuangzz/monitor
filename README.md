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
- Authentication and user management
- Responsive and modern web interface
- Module-based architecture for easy maintenance

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

### Method 3: Running on a custom port

```bash
python run.py -p 8080
```

## Usage

1. After starting the monitor, access the web interface at `http://localhost:5000`
2. Login with default credentials (admin/123456) - change this after first login
3. The "Local Script Management" tab shows running scripts and all Python scripts in configured monitor paths
4. Use the "Start" button to launch a script
5. Use the "Stop" button to terminate a running script
6. Click "View Logs" to see script logs and process information
7. Use the "Stream Logs" feature for real-time log monitoring
8. Configure SSH connections in the "SSH Management" tab to manage remote scripts
9. Use the interactive SSH console for remote server management
10. Configure monitoring paths and exclusion patterns in the "Configuration Management" tab
11. Change your password in the user menu

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

### Authentication

Default login credentials:
- Username: `admin`
- Password: `123456`

Please change the password after first login for security reasons.

## Project Structure

```
.
├── run.py                  # Main application entry point
├── run_monitor.sh          # Startup script
├── requirements.txt        # Python dependencies
├── monitor_config.json     # Monitor configuration
├── ssh_config.json         # SSH configuration
├── auth_config.json        # Authentication configuration
├── app/                    # Application source code
│   ├── __init__.py         # Application initialization
│   ├── api/                # API endpoints
│   │   ├── auth_api.py     # Authentication APIs
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
│   │   ├── auth.py         # Authentication utilities
│   │   ├── config_loader.py  # Configuration loading utilities
│   │   └── process_manager.py# Process management utilities
│   ├── static/             # Static files
│   │   ├── css/            # Stylesheets
│   │   │   ├── modules/    # Modular CSS files
│   │   │   └── style.css   # Main stylesheet
│   │   └── js/             # JavaScript files
│   │       ├── modules/    # Modular JavaScript files
│   │       └── main.js     # Main JavaScript logic
│   └── templates/          # HTML templates
│       ├── modules/        # Modular HTML templates
│       ├── index.html      # Main interface
│       └── login.html      # Login page
├── script_logs/            # Script log files (auto-created)
└── README.md               # This file
```

## API Endpoints

### Authentication
- `/login` - Login page
- `/api/auth/login` - Login API endpoint
- `/api/auth/status` - Check authentication status
- `/api/auth/change_password` - Change user password
- `/logout` - Logout

### Process Management
- `/api/processes` - Get all running Python processes
- `/api/kill` - Kill a running process by PID

### Script Management
- `/api/scripts` - Get all Python scripts in monitored paths
- `/api/start` - Start a Python script
- `/api/stop` - Stop a running script by PID
- `/api/logs/<pid>` - Get logs for a specific process
- `/api/logs/stream/<pid>` - Stream logs in real-time using Server-Sent Events

### SSH Management
- `/api/ssh/config` - Get or update SSH configuration
- `/api/ssh/connect` - Establish SSH connection
- `/api/ssh/disconnect` - Disconnect SSH session
- `/api/ssh/system_info` - Get remote system information via SSH
- `/api/ssh/test_connection` - Test SSH connection
- `/api/ssh/save_connection` - Save SSH connection configuration
- `/api/ssh/execute` - Execute command on SSH connection

### System Information
- `/api/system/info` - Get local system resource information

### Configuration Management
- `/api/config/monitor` - Get or update monitor configuration

### WebSocket Endpoints
- `/ws/ssh_shell/<conn_id>` - WebSocket endpoint for SSH shell

## User Interface

The web interface is organized into four main tabs:

1. **System Information**
   - CPU, memory, and disk usage monitoring
   - Top CPU and memory consuming processes
   - Ability to kill processes directly from the interface
   - Auto-refresh and manual refresh options

2. **Local Script Management**
   - System information panel (collapsible)
   - Running scripts table with controls
   - All scripts table with pagination
   - Log viewer with real-time streaming capability

3. **SSH Remote Connection**
   - SSH connection configuration form
   - Saved connections list with connect/disconnect buttons
   - Connection status indicators
   - Remote system information display
   - Interactive SSH console

4. **Configuration Management**
   - Monitor paths configuration
   - Exclusion patterns configuration

## Important Notes

- The tool can only manage Python scripts in configured paths
- For security reasons, run this tool with regular user privileges
- Log viewing shows process information and resource usage, not standard output logs for manually started processes
- SSH functionality requires proper network connectivity and authentication
- SSH console filters out ANSI escape sequences for better readability
- Default credentials should be changed immediately after first login

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

## Troubleshooting

### Common Issues

1. **Port already in use**: 
   - Use a different port: `python run.py -p 8080`
   - On macOS, disable AirPlay Receiver if using port 5000

2. **Permission denied when starting scripts**:
   - Ensure the user running the monitor has appropriate permissions
   - Check file permissions of the scripts you're trying to run

3. **SSH connection issues**:
   - Verify network connectivity to the remote server
   - Check SSH credentials and firewall settings
   - Ensure the remote server has SSH enabled

4. **Scripts not appearing in the interface**:
   - Check monitor configuration paths
   - Verify exclusion patterns are not filtering out your scripts
   - Restart the monitor to refresh the script list


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors who have helped to improve this tool
- Special thanks to the open-source community for the libraries used in this project