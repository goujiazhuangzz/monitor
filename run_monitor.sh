#!/bin/bash

# 检查是否安装了Python
if ! command -v python3 &> /dev/null
then
    echo "未找到python3，请先安装Python3"
    exit 1
fi

# 检查是否安装了pip
if ! command -v pip3 &> /dev/null
then
    echo "未找到pip3，请先安装pip3"
    exit 1
fi

# 检查是否已安装依赖
if ! python3 -c "import flask" 2>/dev/null; then
    echo "正在安装Flask..."
    pip3 install Flask
fi

if ! python3 -c "import psutil" 2>/dev/null; then
    echo "正在安装psutil..."
    pip3 install psutil
fi

if ! python3 -c "import paramiko" 2>/dev/null; then
    echo "正在安装paramiko..."
    pip3 install paramiko
fi

if ! python3 -c "import flask_sock" 2>/dev/null; then
    echo "正在安装flask-sock..."
    pip3 install flask-sock
fi

# 或者使用requirements.txt安装所有依赖
if [ -f "requirements.txt" ]; then
    echo "正在通过requirements.txt安装依赖..."
    pip3 install -r requirements.txt
fi

# 创建templates目录（如果不存在）
if [ ! -d "templates" ]; then
    echo "创建templates目录..."
    mkdir templates
fi

# 启动监控工具
echo "启动监控工具..."
echo "请在浏览器中访问: http://localhost:5000"
python3 monitor.py