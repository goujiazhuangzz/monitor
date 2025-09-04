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
- 用户认证和管理功能
- 响应式现代Web界面
- 模块化架构，便于维护

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

### 方法三：使用自定义端口运行

```bash
python run.py -p 8080
```

## 使用说明

1. 启动监控工具后，通过浏览器访问 `http://localhost:5000`
2. 使用默认凭据登录（admin/123456）- 首次登录后请更改密码
3. "系统信息"标签页显示CPU、内存和磁盘使用情况
4. "本地脚本管理"标签页显示运行中的脚本和配置的监控路径中的所有Python脚本
5. 使用"启动"按钮启动脚本
6. 使用"停止"按钮终止正在运行的脚本
7. 点击"查看日志"查看脚本日志和进程信息
8. 使用"流式日志"功能实时监控日志
9. 在"SSH远程连接"标签页配置SSH连接以管理远程脚本
10. 使用交互式SSH控制台进行远程服务器管理
11. 在"配置管理"标签页配置监控路径和排除模式
12. 在用户菜单中更改密码

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

### 认证配置

默认登录凭据：
- 用户名：`admin`
- 密码：`123456`

出于安全原因，请在首次登录后立即更改密码。

## 项目结构

```
.
├── run.py                  # 应用主入口点
├── run_monitor.sh          # 启动脚本
├── requirements.txt        # Python依赖项
├── monitor_config.json     # 监控配置
├── ssh_config.json         # SSH配置
├── auth_config.json        # 认证配置
├── app/                    # 应用源代码
│   ├── __init__.py         # 应用初始化
│   ├── api/                # API接口
│   │   ├── auth_api.py     # 认证API
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
│   │   ├── auth.py         # 认证工具
│   │   ├── config_loader.py  # 配置加载工具
│   │   └── process_manager.py# 进程管理工具
│   ├── static/             # 静态文件
│   │   ├── css/            # 样式表
│   │   │   ├── modules/    # 模块化CSS文件
│   │   │   └── style.css   # 主样式表
│   │   └── js/             # JavaScript文件
│   │       ├── modules/    # 模块化JavaScript文件
│   │       └── main.js     # 主JavaScript逻辑
│   └── templates/          # HTML模板
│       ├── modules/        # 模块化HTML模板
│       ├── index.html      # 主界面
│       └── login.html      # 登录页面
├── script_logs/            # 脚本日志文件（自动创建）
└── README.md               # 英文说明文件
└── README_zh.md            # 本文件（中文说明文件）
```

## API接口

### 认证接口
- `/login` - 登录页面
- `/api/auth/login` - 登录API端点
- `/api/auth/status` - 检查认证状态
- `/api/auth/change_password` - 更改用户密码
- `/logout` - 登出

### 进程管理
- `/api/processes` - 获取所有运行中的Python进程
- `/api/kill` - 根据PID杀死运行中的进程

### 脚本管理
- `/api/scripts` - 获取监控路径中的所有Python脚本
- `/api/start` - 启动Python脚本
- `/api/stop` - 根据PID停止运行中的脚本
- `/api/logs/<pid>` - 获取特定进程的日志
- `/api/logs/stream/<pid>` - 使用服务器发送事件实时流式传输日志

### SSH管理
- `/api/ssh/config` - 获取或更新SSH配置
- `/api/ssh/connect` - 建立SSH连接
- `/api/ssh/disconnect` - 断开SSH会话
- `/api/ssh/system_info` - 通过SSH获取远程系统信息
- `/api/ssh/test_connection` - 测试SSH连接
- `/api/ssh/save_connection` - 保存SSH连接配置
- `/api/ssh/execute` - 在SSH连接上执行命令

### 系统信息
- `/api/system/info` - 获取本地系统资源信息

### 配置管理
- `/api/config/monitor` - 获取或更新监控配置

### WebSocket端点
- `/ws/ssh_shell/<conn_id>` - SSH shell的WebSocket端点

## 用户界面

Web界面分为四个主要标签页：

1. **系统信息**
   - CPU、内存和磁盘使用情况监控
   - CPU和内存占用最高的进程列表
   - 可直接从界面杀死进程
   - 自动刷新和手动刷新选项

2. **本地脚本管理**
   - 系统信息面板（可折叠）
   - 运行中的脚本表格及控制按钮
   - 所有脚本表格（带分页功能）
   - 日志查看器（支持实时流式日志）

3. **SSH远程连接**
   - SSH连接配置表单
   - 已保存的连接列表（带连接/断开按钮）
   - 连接状态指示器
   - 远程系统信息显示
   - 交互式SSH控制台

4. **配置管理**
   - 监控路径配置
   - 排除模式配置

## 重要说明

- 该工具只能管理配置路径中的Python脚本
- 出于安全原因，请以普通用户权限运行此工具
- 日志查看功能显示进程信息和资源使用情况，而不是手动启动进程的标准输出日志
- SSH功能需要适当的网络连接和身份验证
- SSH控制台会过滤ANSI转义序列以提高可读性
- 首次登录后应立即更改默认凭据

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

## 故障排除

### 常见问题

1. **端口已被占用**：
   - 使用不同端口：`python run.py -p 8080`
   - 在macOS上，如果使用端口5000，请禁用AirPlay接收器

2. **启动脚本时权限被拒绝**：
   - 确保运行监控工具的用户具有适当权限
   - 检查要运行的脚本的文件权限

3. **SSH连接问题**：
   - 验证与远程服务器的网络连接
   - 检查SSH凭据和防火墙设置
   - 确保远程服务器已启用SSH

4. **脚本未出现在界面中**：
   - 检查监控配置路径
   - 验证排除模式是否过滤了您的脚本
   - 重启监控工具以刷新脚本列表



## 许可证

该项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- 感谢所有帮助改进此工具的贡献者
- 特别感谢为本项目提供库支持的开源社区