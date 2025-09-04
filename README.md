# Python Script Monitor

A modern web-based tool for monitoring and managing Python scripts, featuring local script management and SSH remote server connectivity.

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Installation](#manual-installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [API Documentation](#api-documentation)
- [Notes](#notes)

## Architecture

This project follows a modern frontend-backend separation architecture:

```
monitor/
├── backend/          # Backend service (Python Flask API)
├── frontend/         # Frontend interface (Vue 3 + Element Plus)
├── start.sh         # One-click startup script
└── README.md        # Project documentation
```

## Features

1. **SSH Connection Management** - Manage multiple SSH connections with password and key-based authentication
2. **WebSSH Terminal** - Use SSH terminal directly in the browser with color support
3. **Local Script Management** - Manage local Python scripts with execution and output viewing
4. **System Monitoring** - Real-time system resource monitoring (CPU, memory, disk)
5. **Configuration Management** - Unified management of monitoring paths, SSH connections, and user authentication

## Prerequisites

### Backend Requirements
- Python 3.6+
- pip package manager

### Frontend Requirements
- Node.js 12+
- npm package manager

## Quick Start

### Using the Startup Script (Recommended)

```bash
# Clone the project and navigate to the directory
cd monitor

# Run the startup script (automatically checks and installs dependencies)
./start.sh
```

The script will:
1. Check and install backend Python dependencies
2. Check and install frontend Node.js dependencies
3. Start the backend service (default: http://127.0.0.1:5000)
4. Start the frontend service (default: http://localhost:3000)

## Manual Installation

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# (Optional) Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the backend service
python run.py
```

Backend service will run at `http://127.0.0.1:5000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the frontend development server
npm run dev
```

Frontend service will run at `http://localhost:3000`

## Usage

1. After starting the services, access the frontend at `http://localhost:3000`
2. Login with default credentials:
   - Username: `admin`
   - Password: `123456`
3. Configure SSH connections, manage scripts, and monitor system resources

## Project Structure

```
monitor/
├── backend/                    # Backend source code
│   ├── app/                   # Flask application
│   │   ├── api/              # API endpoints
│   │   ├── models/           # Data models
│   │   ├── utils/            # Utility functions
│   │   └── __init__.py       # Application initialization
│   ├── run.py                # Application entry point
│   ├── requirements.txt      # Python dependencies
│   └── config files          # JSON configuration files
├── frontend/                 # Frontend source code
│   ├── src/                  # Vue source code
│   │   ├── assets/          # Static assets
│   │   ├── components/      # Vue components
│   │   ├── views/           # Page components
│   │   ├── router/          # Router configuration
│   │   └── main.js          # Application entry point
│   ├── package.json         # Node.js dependencies
│   └── vite.config.js       # Vite configuration
├── start.sh                 # One-click startup script
└── README.md               # Project documentation
```

## Technology Stack

### Backend
- **Python 3** - Programming language
- **Flask** - Web framework
- **Paramiko** - SSH library
- **Psutil** - System monitoring library

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Build tool
- **Element Plus** - Vue 3 component library
- **Vue Router** - Routing management

## API Documentation

All backend APIs are RESTful and accessible under `/api/` prefix:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/change_password` - Change password
- `GET /api/auth/users` - Get user list
- `POST /api/auth/add_user` - Add new user
- `DELETE /api/auth/delete_user/<username>` - Delete user

### SSH Management
- `GET /api/ssh/config` - Get SSH configuration
- `POST /api/ssh/save_connection` - Save SSH connection
- `DELETE /api/ssh/delete_connection/<conn_name>` - Delete SSH connection
- `POST /api/ssh/connect` - Establish SSH connection
- `POST /api/ssh/disconnect` - Disconnect SSH connection
- `GET /api/ssh/connections` - Get active connections

### Script Management
- `GET /api/scripts/list` - List Python scripts
- `POST /api/scripts/run` - Run Python script
- `GET /api/scripts/content` - Get script content
- `POST /api/scripts/save` - Save script content
- `POST /api/scripts/delete` - Delete script

### Configuration
- `GET /api/config/monitor` - Get monitor configuration
- `POST /api/config/monitor` - Save monitor configuration

### System Information
- `GET /api/system/info` - Get system information

## Notes

1. The startup script automatically checks and installs required dependencies on first run
2. Frontend and backend can be deployed independently
3. All configuration data is stored in JSON files for easy management and migration
4. Use Ctrl+C to gracefully stop all services when using the startup script
5. For production deployment, consider using a production WSGI server for the backend
# Python Script Monitor

A modern web-based tool for monitoring and managing Python scripts, featuring local script management and SSH remote server connectivity.

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Installation](#manual-installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [API Documentation](#api-documentation)
- [Notes](#notes)

## Architecture

This project follows a modern frontend-backend separation architecture:

```
monitor/
├── backend/          # Backend service (Python Flask API)
├── frontend/         # Frontend interface (Vue 3 + Element Plus)
├── start.sh         # One-click startup script
└── README.md        # Project documentation
```

## Features

1. **SSH Connection Management** - Manage multiple SSH connections with password and key-based authentication
2. **WebSSH Terminal** - Use SSH terminal directly in the browser with color support
3. **Local Script Management** - Manage local Python scripts with execution and output viewing
4. **System Monitoring** - Real-time system resource monitoring (CPU, memory, disk)
5. **Configuration Management** - Unified management of monitoring paths, SSH connections, and user authentication

## Prerequisites

### Backend Requirements
- Python 3.6+
- pip package manager

### Frontend Requirements
- Node.js 12+
- npm package manager

## Quick Start

### Using the Startup Script (Recommended)

```bash
# Clone the project and navigate to the directory
cd monitor

# Run the startup script (automatically checks and installs dependencies)
./start.sh
```

The script will:
1. Check and install backend Python dependencies
2. Check and install frontend Node.js dependencies
3. Start the backend service (default: http://127.0.0.1:5000)
4. Start the frontend service (default: http://localhost:3000)

## Manual Installation

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# (Optional) Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the backend service
python run.py
```

Backend service will run at `http://127.0.0.1:5000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the frontend development server
npm run dev
```

Frontend service will run at `http://localhost:3000`

## Usage

1. After starting the services, access the frontend at `http://localhost:3000`
2. Login with default credentials:
   - Username: `admin`
   - Password: `123456`
3. Configure SSH connections, manage scripts, and monitor system resources

## Project Structure

```
monitor/
├── backend/                    # Backend source code
│   ├── app/                   # Flask application
│   │   ├── api/              # API endpoints
│   │   ├── models/           # Data models
│   │   ├── utils/            # Utility functions
│   │   └── __init__.py       # Application initialization
│   ├── run.py                # Application entry point
│   ├── requirements.txt      # Python dependencies
│   └── config files          # JSON configuration files
├── frontend/                 # Frontend source code
│   ├── src/                  # Vue source code
│   │   ├── assets/          # Static assets
│   │   ├── components/      # Vue components
│   │   ├── views/           # Page components
│   │   ├── router/          # Router configuration
│   │   └── main.js          # Application entry point
│   ├── package.json         # Node.js dependencies
│   └── vite.config.js       # Vite configuration
├── start.sh                 # One-click startup script
└── README.md               # Project documentation
```

## Technology Stack

### Backend
- **Python 3** - Programming language
- **Flask** - Web framework
- **Paramiko** - SSH library
- **Psutil** - System monitoring library

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Build tool
- **Element Plus** - Vue 3 component library
- **Vue Router** - Routing management

## API Documentation

All backend APIs are RESTful and accessible under `/api/` prefix:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/change_password` - Change password
- `GET /api/auth/users` - Get user list
- `POST /api/auth/add_user` - Add new user
- `DELETE /api/auth/delete_user/<username>` - Delete user

### SSH Management
- `GET /api/ssh/config` - Get SSH configuration
- `POST /api/ssh/save_connection` - Save SSH connection
- `DELETE /api/ssh/delete_connection/<conn_name>` - Delete SSH connection
- `POST /api/ssh/connect` - Establish SSH connection
- `POST /api/ssh/disconnect` - Disconnect SSH connection
- `GET /api/ssh/connections` - Get active connections

### Script Management
- `GET /api/scripts/list` - List Python scripts
- `POST /api/scripts/run` - Run Python script
- `GET /api/scripts/content` - Get script content
- `POST /api/scripts/save` - Save script content
- `POST /api/scripts/delete` - Delete script

### Configuration
- `GET /api/config/monitor` - Get monitor configuration
- `POST /api/config/monitor` - Save monitor configuration

### System Information
- `GET /api/system/info` - Get system information

## Notes

1. The startup script automatically checks and installs required dependencies on first run
2. Frontend and backend can be deployed independently
3. All configuration data is stored in JSON files for easy management and migration
4. Use Ctrl+C to gracefully stop all services when using the startup script
5. For production deployment, consider using a production WSGI server for the backend
