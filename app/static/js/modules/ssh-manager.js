// SSH管理模块
class SSHManagerModule {
    constructor() {
        this.sshConnections = {};
        this.currentConsoleConnId = null;
        this.consoleWebSocket = null;
        this.debugMode = false;
    }

    // 加载已保存的SSH连接
    loadSavedConnections() {
        fetch('/api/ssh/config')
            .then(response => {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                return response.json();
            })
            .then(config => {
                const connectionsDiv = document.getElementById('savedConnections');
                connectionsDiv.innerHTML = '';

                if (!config.connections || config.connections.length === 0) {
                    connectionsDiv.innerHTML = '<p>没有保存的连接</p>';
                    return;
                }

                config.connections.forEach((conn, index) => {
                    const connDiv = document.createElement('div');
                    connDiv.className = 'ssh-connection-card';
                    connDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4>${conn.name}</h4>
                                <p>${conn.host}:${conn.port} (${conn.username})</p>
                            </div>
                            <div>
                                <button class="btn btn-connect" id="connect-btn-${conn.name}" onclick="sshManagerModule.connectToServer('${conn.name}')">连接</button>
                                <button class="btn btn-disconnect" id="disconnect-btn-${conn.name}" onclick="sshManagerModule.disconnectFromServer('${conn.name}')" style="display: none;">断开</button>
                                <button class="btn btn-console" onclick="sshManagerModule.openConsole('${conn.name}')">控制台</button>
                                <button class="btn btn-disconnect" onclick="sshManagerModule.deleteConnection('${conn.name}')">删除</button>
                            </div>
                        </div>
                        <div id="ssh-status-${conn.name}" class="ssh-connection-status disconnected">
                            状态: 未连接
                        </div>
                        <div id="ssh-system-info-${conn.name}" class="ssh-system-info" style="display: none;">
                            <!-- 系统信息将在这里显示 -->
                        </div>
                    `;
                    connectionsDiv.appendChild(connDiv);

                    // 检查连接状态
                    this.checkConnectionStatus(conn.name);
                });
            })
            .catch(error => {
                console.error('Error loading connections:', error);
                showNotification('加载连接时出错', 'error');
            });
    }

    // 检查SSH连接状态
    checkConnectionStatus(connName) {
        fetch('/api/ssh/system_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({conn_id: connName})
        })
        .then(response => response.json())
        .then(data => {
            const statusDiv = document.getElementById(`ssh-status-${connName}`);
            const systemInfoDiv = document.getElementById(`ssh-system-info-${connName}`);
            const connectBtn = document.getElementById(`connect-btn-${connName}`);
            const disconnectBtn = document.getElementById(`disconnect-btn-${connName}`);

            if (data.success) {
                // 连接成功
                statusDiv.className = 'ssh-connection-status connected';
                statusDiv.innerHTML = '状态: 已连接';

                // 显示断开按钮，隐藏连接按钮
                if (connectBtn && disconnectBtn) {
                    connectBtn.style.display = 'none';
                    disconnectBtn.style.display = 'inline-block';
                }

                // 显示系统信息
                const sysInfo = data.system_info;
                let systemInfoHTML = '<div class="ssh-system-info-item"><span class="ssh-system-info-label">CPU:</span> ' + 
                                    sysInfo.cpu.cores + ' 核心, 使用率: ' + sysInfo.cpu.usage + '</div>';
                systemInfoHTML += '<div class="ssh-system-info-item"><span class="ssh-system-info-label">内存:</span> ' + 
                                 sysInfo.memory.total + ', 已用: ' + sysInfo.memory.used + ' (' + sysInfo.memory.usage_percent + ')</div>';

                if (sysInfo.disk && sysInfo.disk.length > 0) {
                    systemInfoHTML += '<div class="ssh-system-info-item"><span class="ssh-system-info-label">磁盘:</span></div>';
                    sysInfo.disk.forEach(disk => {
                        systemInfoHTML += `<div class="ssh-system-info-item" style="margin-left: 20px;">
                                            ${disk.device} (${disk.mount_point}): ${disk.used}/${disk.size} (${disk.use_percent})
                                          </div>`;
                    });
                }

                systemInfoDiv.innerHTML = systemInfoHTML;
                systemInfoDiv.style.display = 'block';
            } else {
                // 连接失败或未连接
                statusDiv.className = 'ssh-connection-status disconnected';
                statusDiv.innerHTML = '状态: 未连接';

                // 显示连接按钮，隐藏断开按钮
                if (connectBtn && disconnectBtn) {
                    connectBtn.style.display = 'inline-block';
                    disconnectBtn.style.display = 'none';
                }

                systemInfoDiv.style.display = 'none';
            }
        })
        .catch(error => {
            // 连接失败或未连接
            const statusDiv = document.getElementById(`ssh-status-${connName}`);
            const systemInfoDiv = document.getElementById(`ssh-system-info-${connName}`);
            const connectBtn = document.getElementById(`connect-btn-${connName}`);
            const disconnectBtn = document.getElementById(`disconnect-btn-${connName}`);

            statusDiv.className = 'ssh-connection-status disconnected';
            statusDiv.innerHTML = '状态: 未连接';

            // 显示连接按钮，隐藏断开按钮
            if (connectBtn && disconnectBtn) {
                connectBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'none';
            }

            systemInfoDiv.style.display = 'none';
        });
    }

    // 连接到服务器
    connectToServer(connName) {
        fetch('/api/ssh/config')
            .then(response => response.json())
            .then(config => {
                const conn = config.connections.find(c => c.name === connName);
                if (!conn) {
                    showNotification('未找到连接配置', 'error');
                    return;
                }

                const connData = {
                    host: conn.host,
                    port: conn.port,
                    username: conn.username,
                    password: conn.password,
                    key_file: conn.key_file,
                    conn_id: connName
                };

                return fetch('/api/ssh/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(connData)
                });
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message, 'success');
                    // 更新连接状态显示
                    setTimeout(() => {
                        this.checkConnectionStatus(connName);
                    }, 1000);
                } else {
                    showNotification('错误: ' + data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error connecting to server:', error);
                showNotification('连接到服务器时出错', 'error');
            });
    }

    // 断开服务器连接
    disconnectFromServer(connName) {
        fetch('/api/ssh/disconnect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({conn_id: connName})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                // 更新连接状态显示
                this.checkConnectionStatus(connName);
            } else {
                showNotification('错误: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error disconnecting from server:', error);
            showNotification('断开服务器连接时出错', 'error');
        });
    }

    // 删除连接
    deleteConnection(connName) {
        if (!confirm(`确定要删除连接 "${connName}" 吗?`)) {
            return;
        }

        fetch('/api/ssh/config')
            .then(response => response.json())
            .then(config => {
                // 过滤掉要删除的连接
                config.connections = config.connections.filter(c => c.name !== connName);

                // 保存更新后的配置
                return fetch('/api/ssh/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(config)
                });
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message, 'success');
                    this.loadSavedConnections();
                } else {
                    showNotification('错误: ' + data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting connection:', error);
                showNotification('删除连接时出错', 'error');
            });
    }

    // 打开SSH配置弹窗
    openSSHConfig() {
        // 清空表单
        document.getElementById('sshConfigForm').reset();
        document.getElementById('connId').value = '';
        document.getElementById('sshConfigTitle').textContent = 'SSH连接配置';

        // 显示弹窗
        document.getElementById('sshConfigModal').style.display = 'block';

        // 设置认证方式显示
        const authMethod = document.getElementById('authMethod').value;
        if (authMethod === 'password') {
            document.getElementById('passwordField').style.display = 'block';
            document.getElementById('keyFileField').style.display = 'none';
        } else {
            document.getElementById('passwordField').style.display = 'none';
            document.getElementById('keyFileField').style.display = 'block';
        }
    }

    // 关闭SSH配置弹窗
    closeSSHConfig() {
        document.getElementById('sshConfigModal').style.display = 'none';
    }

    // 测试SSH连接
    testConnection() {
        const connName = document.getElementById('connName').value;
        const sshHost = document.getElementById('sshHost').value;
        const sshPort = document.getElementById('sshPort').value;
        const sshUsername = document.getElementById('sshUsername').value;
        const authMethod = document.getElementById('authMethod').value;
        const sshPassword = document.getElementById('sshPassword').value;
        const sshKeyFile = document.getElementById('sshKeyFile').value;

        if (!connName || !sshHost || !sshUsername) {
            showNotification('连接名称、主机地址和用户名为必填项', 'error');
            return;
        }

        const connectionData = {
            name: connName,
            host: sshHost,
            port: parseInt(sshPort),
            username: sshUsername,
            auth_method: authMethod
        };

        if (authMethod === 'password') {
            if (!sshPassword) {
                showNotification('密码不能为空', 'error');
                return;
            }
            connectionData.password = sshPassword;
        } else {
            if (!sshKeyFile) {
                showNotification('密钥文件路径不能为空', 'error');
                return;
            }
            connectionData.key_file = sshKeyFile;
        }

        fetch('/api/ssh/test_connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // 注意：这里不添加认证检查，因为测试连接应该在保存前进行
            },
            body: JSON.stringify(connectionData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
            } else {
                showNotification(`连接测试失败: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            showNotification(`连接测试时出错: ${error}`, 'error');
        });
    }

    // 保存SSH连接
    saveConnection() {
        const connName = document.getElementById('connName').value;
        const sshHost = document.getElementById('sshHost').value;
        const sshPort = document.getElementById('sshPort').value;
        const sshUsername = document.getElementById('sshUsername').value;
        const authMethod = document.getElementById('authMethod').value;
        const sshPassword = document.getElementById('sshPassword').value;
        const sshKeyFile = document.getElementById('sshKeyFile').value;

        if (!connName || !sshHost || !sshUsername) {
            showNotification('连接名称、主机地址和用户名为必填项', 'error');
            return;
        }

        const connectionData = {
            name: connName,
            host: sshHost,
            port: parseInt(sshPort),
            username: sshUsername,
            auth_method: authMethod
        };

        if (authMethod === 'password') {
            if (!sshPassword) {
                showNotification('密码不能为空', 'error');
                return;
            }
            connectionData.password = sshPassword;
        } else {
            if (!sshKeyFile) {
                showNotification('密钥文件路径不能为空', 'error');
                return;
            }
            connectionData.key_file = sshKeyFile;
        }

        fetch('/api/ssh/save_connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
        })
        .then(response => {
            // 检查是否未认证
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('连接配置已保存', 'success');
                this.closeSSHConfig(); // 关闭弹窗
                this.loadSavedConnections(); // 刷新连接列表
            } else {
                showNotification(`保存连接失败: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            showNotification(`保存连接时出错: ${error}`, 'error');
        });
    }

    // 打开控制台
    openConsole(connName) {
        // 设置当前连接ID
        this.currentConsoleConnId = connName;

        // 显示控制台弹窗
        document.getElementById('consoleModal').style.display = 'block';
        document.getElementById('consoleTitle').textContent = `SSH控制台 - ${connName}`;
        document.getElementById('consoleOutput').textContent = '连接中...\n';

        // 建立WebSocket连接
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/ssh_shell/${connName}`;

        // 关闭已存在的连接
        if (this.consoleWebSocket) {
            this.consoleWebSocket.close();
        }

        this.consoleWebSocket = new WebSocket(wsUrl);

        this.consoleWebSocket.onopen = function(event) {
            document.getElementById('consoleOutput').textContent += '连接成功!\n';
            // 滚动到底部
            const consoleOutput = document.getElementById('consoleOutput');
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };

        this.consoleWebSocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.output) {
                    // 过滤ANSI转义序列
                    const cleanOutput = data.output.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
                    document.getElementById('consoleOutput').textContent += cleanOutput;
                    // 滚动到底部
                    const consoleOutput = document.getElementById('consoleOutput');
                    consoleOutput.scrollTop = consoleOutput.scrollHeight;
                } else if (data.error) {
                    document.getElementById('consoleOutput').textContent += '[错误]: ' + data.error + '\n';
                    // 滚动到底部
                    const consoleOutput = document.getElementById('consoleOutput');
                    consoleOutput.scrollTop = consoleOutput.scrollHeight;
                }
            } catch (e) {
                // 如果不是JSON格式，直接显示
                // 过滤ANSI转义序列
                const cleanOutput = event.data.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
                document.getElementById('consoleOutput').textContent += cleanOutput;
                // 滚动到底部
                const consoleOutput = document.getElementById('consoleOutput');
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
        };

        this.consoleWebSocket.onerror = function(error) {
            document.getElementById('consoleOutput').textContent += '[连接错误]\n';
            console.error('WebSocket error:', error);
            // 滚动到底部
            const consoleOutput = document.getElementById('consoleOutput');
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };

        this.consoleWebSocket.onclose = function(event) {
            document.getElementById('consoleOutput').textContent += '[连接已关闭]\n';
            // 滚动到底部
            const consoleOutput = document.getElementById('consoleOutput');
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };
    }

    // 关闭控制台
    closeConsole() {
        // 关闭WebSocket连接
        if (this.consoleWebSocket) {
            this.consoleWebSocket.close();
        }

        // 隐藏控制台弹窗
        document.getElementById('consoleModal').style.display = 'none';
    }

    // 发送命令到控制台
    sendCommand() {
        const commandInput = document.getElementById('consoleCommand');
        const command = commandInput.value;

        // 检查是否已认证
        fetch('/api/auth/check', {
            method: 'GET'
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            // 如果已认证，继续发送命令
            return response.json().then(() => {
                if (this.consoleWebSocket && this.consoleWebSocket.readyState === WebSocket.OPEN) {
                    this.consoleWebSocket.send(JSON.stringify({command: command}));
                    commandInput.value = '';
                } else {
                    document.getElementById('consoleOutput').textContent += '[错误]: WebSocket未连接\n';
                }
            });
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
            window.location.href = '/login';
        });
    }

    // 切换调试模式
    toggleDebugMode() {
        // 检查是否已认证
        fetch('/api/auth/check', {
            method: 'GET'
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            // 如果已认证，继续执行调试模式切换
            return response.json().then(() => {
                this.debugMode = !this.debugMode;
                const debugSection = document.getElementById('debugSection');
                if (this.debugMode) {
                    debugSection.style.display = 'block';
                } else {
                    debugSection.style.display = 'none';
                }
            });
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
            window.location.href = '/login';
        });
    }

    // 发送调试命令
    sendDebugCommand(command) {
        // 检查是否已认证
        fetch('/api/auth/check', {
            method: 'GET'
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            // 如果已认证，继续发送调试命令
            return response.json().then(() => {
                if (this.consoleWebSocket && this.consoleWebSocket.readyState === WebSocket.OPEN) {
                    this.consoleWebSocket.send(command);
                } else {
                    document.getElementById('consoleOutput').textContent += '[错误]: WebSocket未连接\n';
                }
            });
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
            window.location.href = '/login';
        });
    }

    // 初始化SSH管理模块
    init() {
        // 加载初始连接
        this.loadSavedConnections();

        // 绑定事件监听器
        document.getElementById('addSSHConnection').addEventListener('click', () => this.openSSHConfig());
        document.getElementById('testConnection').addEventListener('click', () => this.testConnection());
        document.getElementById('saveConnection').addEventListener('click', () => this.saveConnection());
        document.getElementById('refreshConnections').addEventListener('click', () => this.loadSavedConnections());

        // 认证方式切换事件
        document.getElementById('authMethod').addEventListener('change', function() {
            const authMethod = this.value;
            if (authMethod === 'password') {
                document.getElementById('passwordField').style.display = 'block';
                document.getElementById('keyFileField').style.display = 'none';
            } else {
                document.getElementById('passwordField').style.display = 'none';
                document.getElementById('keyFileField').style.display = 'block';
            }
        });

        // 控制台命令输入事件
        document.getElementById('consoleCommand').addEventListener('keypress', function(e) {
            if (e.keyCode === 13) {
                sshManagerModule.sendCommand();
            }
        });
    }
}

// 创建SSH管理模块实例
const sshManagerModule = new SSHManagerModule();