# Python脚本监控工具

一个功能强大且易于使用的Python脚本监控工具。该工具提供Web界面，用于启动、停止、监控和查看本地或通过SSH连接的远程服务器上运行的Python脚本日志。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 功能特点

- 实时监控所有运行中的Python进程
- 一键启动和停止Python脚本
- 查看详细的进程信息和资源使用情况
- 为运行中的脚本提供实时日志流
- 通过SSH连接远程机器进行脚本管理
- 基于Web的用户界面，便于访问
- 可配置的监控路径和排除模式
- 系统资源监控（CPU、内存、磁盘使用情况）
- 交互式SSH控制台用于远程服务器管理

## 环境要求

- Python 3.6+
- pip（Python包管理器）

## 安装和快速开始

### 方法一：使用启动脚本（推荐）

```bash
./run_monitor.sh
```

### 方法二：手动安装

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 运行监控工具：
```bash
python run.py
```

启动应用程序后，打开浏览器并访问 `http://localhost:5000`

## 使用说明

1. 启动监控工具后，通过浏览器访问 `http://localhost:5000`
2. "本地脚本管理"标签页显示运行中的脚本和配置的监控路径中的所有Python脚本
3. 使用"启动"按钮启动脚本
4. 使用"停止"按钮终止正在运行的脚本
5. 点击"查看日志"查看脚本日志和进程信息
6. 使用"流式日志"功能实时监控日志
7. 在"SSH远程连接"标签页配置SSH连接以管理远程脚本
8. 使用交互式SSH控制台进行远程服务器管理
9. 在"配置管理"标签页配置监控路径和排除模式

## 配置说明

### 监控配置

可以通过 [monitor_config.json](monitor_config.json) 文件配置监控器：

- `monitor_paths`：扫描Python脚本的路径列表
- `exclude_patterns`：从监控中排除文件的模式

配置示例：
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

### SSH配置

SSH连接在 [ssh_config.json](ssh_config.json) 文件中配置：

配置示例：
```json
{
  "connections": [
    {
      "name": "生产服务器",
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

## 项目结构

```
.
├── run.py                  # 应用主入口点
├── run_monitor.sh          # 启动脚本
├── requirements.txt        # Python依赖项
├── monitor_config.json     # 监控配置
├── ssh_config.json         # SSH配置
├── app/                    # 应用源代码
│   ├── __init__.py         # 应用初始化
│   ├── api/                # API接口
│   │   ├── process_api.py  # 进程管理API
│   │   ├── script_api.py   # 脚本管理API
│   │   ├── ssh_api.py      # SSH连接API
│   │   ├── system_api.py   # 系统信息API
│   │   ├── config_api.py   # 配置API
│   │   └── ssh_websocket.py# SSH WebSocket处理器
│   ├── models/             # 数据模型
│   │   ├── process_logger.py # 进程日志模型
│   │   └── ssh_connection.py # SSH连接模型
│   ├── utils/              # 工具函数
│   │   ├── config_loader.py  # 配置加载工具
│   │   └── process_manager.py# 进程管理工具
│   ├── static/             # 静态文件
│   │   ├── css/            # 样式表
│   │   │   └── style.css   # 主样式表
│   │   └── js/             # JavaScript文件
│   │       └── main.js     # 主JavaScript逻辑
│   └── templates/          # HTML模板
│       └── index.html      # 主界面
├── script_logs/            # 脚本日志文件（自动创建）
└── README.md               # 英文说明文件
└── README_zh.md            # 本文件（中文说明文件）
```

## API接口

- `/api/processes` - 获取所有运行中的Python进程
- `/api/scripts` - 获取监控路径中的所有Python脚本
- `/api/start` - 启动Python脚本
- `/api/stop` - 根据PID停止运行中的脚本
- `/api/logs/<pid>` - 获取特定进程的日志
- `/api/logs/stream/<pid>` - 使用服务器发送事件实时流式传输日志
- `/api/ssh/config` - 获取或更新SSH配置
- `/api/ssh/connect` - 建立SSH连接
- `/api/ssh/disconnect` - 断开SSH会话
- `/api/ssh/system_info` - 通过SSH获取远程系统信息
- `/api/system/info` - 获取本地系统资源信息
- `/api/config/monitor` - 获取或更新监控配置
- `/ws/ssh_shell/<conn_id>` - SSH shell的WebSocket端点

## 用户界面

Web界面分为三个主要标签页：

1. **本地脚本管理**
   - 系统信息面板（可折叠）
   - 运行中的脚本表格及控制按钮
   - 所有脚本表格（带分页功能）
   - 日志查看器（支持实时流式日志）

2. **SSH远程连接**
   - SSH连接配置表单
   - 已保存的连接列表（带连接/断开按钮）
   - 连接状态指示器
   - 远程系统信息显示
   - 交互式SSH控制台

3. **配置管理**
   - 监控路径配置
   - 排除模式配置

## 重要说明

- 该工具只能管理配置路径中的Python脚本
- 出于安全原因，请以普通用户权限运行此工具
- 日志查看功能显示进程信息和资源使用情况，而不是手动启动进程的标准输出日志
- SSH功能需要适当的网络连接和身份验证
- SSH控制台会过滤ANSI转义序列以提高可读性

## 依赖项

- [Flask 2.3.2](https://pypi.org/project/Flask/2.3.2/) - Web框架
- [psutil 5.9.5](https://pypi.org/project/psutil/5.9.5/) - 进程和系统工具
- [paramiko 3.3.1](https://pypi.org/project/paramiko/3.3.1/) - SSH协议库
- [flask-sock 0.5.2](https://pypi.org/project/flask-sock/0.5.2/) - Flask的WebSocket支持

## 界面截图

![主界面](screenshots/main_interface.png)
![SSH管理](screenshots/ssh_management.png)
![日志流](screenshots/log_streaming.png)

*注意：截图仅用于演示，实际界面可能有所不同。*