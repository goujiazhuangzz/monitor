#!/bin/bash

# Project startup script
# Used to start both backend and frontend services

set -e  # Exit on error

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "=================================="
echo "Python Script Monitor Startup Script"
echo "=================================="

# Check and install backend dependencies
setup_backend() {
    echo "Checking backend dependencies..."
    
    if [ ! -d "$BACKEND_DIR" ]; then
        echo "Error: Backend directory does not exist: $BACKEND_DIR"
        exit 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Check if Python is installed
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        echo "Error: Python not found, please install Python 3.6+"
        exit 1
    fi
    
    # Check if pip is installed
    if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
        echo "Warning: pip not found, will try to use python -m pip"
        PIP_CMD="python -m pip"
    else
        PIP_CMD="pip"
    fi
    
    # Install Python dependencies
    if [ -f "requirements.txt" ]; then
        echo "Installing Python dependencies..."
        $PIP_CMD install -r requirements.txt
    else
        echo "Installing basic Python dependencies..."
        $PIP_CMD install flask paramiko psutil
    fi
    
    echo "Backend dependencies check completed"
}

# Check and install frontend dependencies
setup_frontend() {
    echo "Checking frontend dependencies..."
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        echo "Error: Frontend directory does not exist: $FRONTEND_DIR"
        exit 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js not found, please install Node.js 12+"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo "Error: npm not found, please install npm"
        exit 1
    fi
    
    # Check and install frontend dependencies
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    else
        echo "Frontend dependencies already exist"
    fi
    
    echo "Frontend dependencies check completed"
}

# Start backend service
start_backend() {
    echo "Starting backend service..."
    cd "$BACKEND_DIR"
    
    # Start backend service in background
    python run.py &
    BACKEND_PID=$!
    
    # Wait for backend service to start
    sleep 3
    
    echo "Backend service started (PID: $BACKEND_PID)"
    echo "Backend service address: http://127.0.0.1:5000"
}

# Start frontend service
start_frontend() {
    echo "Starting frontend service..."
    cd "$FRONTEND_DIR"
    
    # Start frontend service in background
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for frontend service to start
    sleep 5
    
    echo "Frontend service started (PID: $FRONTEND_PID)"
    echo "Frontend service address: http://localhost:3000"
}

# Gracefully shutdown services
cleanup() {
    echo ""
    echo "Shutting down services..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "Backend service shut down"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "Frontend service shut down"
    fi
    
    exit 0
}

# Capture exit signals
trap cleanup EXIT INT TERM

# Main program
main() {
    echo "Starting setup and launching services..."
    
    setup_backend
    setup_frontend
    
    start_backend
    start_frontend
    
    echo ""
    echo "=================================="
    echo "Services started successfully!"
    echo "Backend service address: http://127.0.0.1:5000"
    echo "Frontend service address: http://localhost:3000"
    echo "Press Ctrl+C to stop all services"
    echo "=================================="
    
    # Wait for any process to end
    wait $BACKEND_PID $FRONTEND_PID
}

# Execute main program
main