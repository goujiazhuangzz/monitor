# Python脚本监控工具

一个现代化的基于Web的Python脚本监控和管理工具，支持本地脚本管理和SSH远程服务器连接。

## 目录

- [项目架构](#项目架构)
- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [手动安装](#手动安装)
- [使用说明](#使用说明)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [API文档](#api文档)
- [注意事项](#注意事项)

## 项目架构

本项目采用现代化的前后端分离架构：

```
monitor/
├── backend/          # 后端服务（Python Flask API）
├── frontend/         # 前端界面（Vue 3 + Element Plus）
├── start.sh         # 一键启动脚本
└── README.md        # 项目说明文档
```

## 功能特性

1. **SSH连接管理** - 管理多个SSH连接，支持密码和密钥认证
2. **WebSSH终端** - 在浏览器中直接使用SSH终端，支持颜色显示
3. **本地脚本管理** - 管理本地Python脚本文件，支持执行和查看输出
4. **系统监控** - 实时显示系统资源使用情况（CPU、内存、磁盘）
5. **配置管理** - 统一管理监控路径、SSH连接和用户认证配置

## 环境要求

### 后端要求
- Python 3.6+
- pip包管理器

### 前端要求
- Node.js 12+
- npm包管理器

## 快速开始

### 使用启动脚本（推荐）

```bash
# 克隆项目后，进入项目目录
cd monitor

# 运行启动脚本（会自动检查并安装依赖）
./start.sh
```

脚本将：
1. 检查并安装后端Python依赖
2. 检查并安装前端Node.js依赖
3. 启动后端服务（默认：http://127.0.0.1:5000）
4. 启动前端服务（默认：http://localhost:3000）

## 手动安装

### 后端设置

```bash
# 进入后端目录
cd backend

# （可选）创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows系统使用: venv\Scripts\activate

# 安装Python依赖
pip install -r requirements.txt

# 启动后端服务
python run.py
```

后端服务运行在 `http://127.0.0.1:5000`

### 前端设置

```bash
# 进入前端目录
cd frontend

# 安装前端依赖
npm install

# 启动前端开发服务器
npm run dev
```

前端服务运行在 `http://localhost:3000`

## 使用说明

1. 启动服务后，访问前端地址 `http://localhost:3000`
2. 使用默认账号登录：
   - 用户名: `admin`
   - 密码: `123456`
3. 登录后可以配置SSH连接、管理脚本、查看系统信息等

## 项目结构

```
monitor/
├── backend/                    # 后端源代码
│   ├── app/                   # Flask应用
│   │   ├── api/              # API接口
│   │   ├── models/           # 数据模型
│   │   ├── utils/            # 工具函数
│   │   └── __init__.py       # 应用初始化
│   ├── run.py                # 应用入口
│   ├── requirements.txt      # Python依赖
│   └── 配置文件               # JSON配置文件
├── frontend/                 # 前端源代码
│   ├── src/                  # Vue源代码
│   │   ├── assets/          # 静态资源
│   │   ├── components/      # Vue组件
│   │   ├── views/           # 页面组件
│   │   ├── router/          # 路由配置
│   │   └── main.js          # 应用入口
│   ├── package.json         # Node.js依赖
│   └── vite.config.js       # Vite配置
├── start.sh                 # 一键启动脚本
└── README.md               # 项目说明文档
```

## 技术栈

### 后端
- **Python 3** - 编程语言
- **Flask** - Web框架
- **Paramiko** - SSH库
- **Psutil** - 系统监控库

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **Vite** - 构建工具
- **Element Plus** - Vue 3组件库
- **Vue Router** - 路由管理

## API文档

所有后端API都是RESTful风格，可通过`/api/`前缀访问：

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/change_password` - 修改密码
- `GET /api/auth/users` - 获取用户列表
- `POST /api/auth/add_user` - 添加用户
- `DELETE /api/auth/delete_user/<username>` - 删除用户

### SSH管理
- `GET /api/ssh/config` - 获取SSH配置
- `POST /api/ssh/save_connection` - 保存SSH连接
- `DELETE /api/ssh/delete_connection/<conn_name>` - 删除SSH连接
- `POST /api/ssh/connect` - 建立SSH连接
- `POST /api/ssh/disconnect` - 断开SSH连接
- `GET /api/ssh/connections` - 获取活动连接

### 脚本管理
- `GET /api/scripts/list` - 列出Python脚本
- `POST /api/scripts/run` - 运行Python脚本
- `GET /api/scripts/content` - 获取脚本内容
- `POST /api/scripts/save` - 保存脚本内容
- `POST /api/scripts/delete` - 删除脚本

### 配置管理
- `GET /api/config/monitor` - 获取监控配置
- `POST /api/config/monitor` - 保存监控配置

### 系统信息
- `GET /api/system/info` - 获取系统信息

## 注意事项

1. 首次运行时，启动脚本会自动检查并安装所需依赖
2. 前端和后端可以独立部署
3. 所有配置信息保存在JSON文件中，便于管理和迁移
4. 使用启动脚本时，按Ctrl+C可以优雅地停止所有服务
5. 生产环境部署时，建议使用生产级WSGI服务器运行后端服务

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

```
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

```
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
```
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
```
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