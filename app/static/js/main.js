// 全局变量
let currentLogPid = null;
let eventSource = null;
let sshConnections = {};
let currentConsoleConnId = null;
let consoleWebSocket = null;
let debugMode = false;
let autoRefreshSystemInfoInterval = null;
let allScripts = [];
let currentPage = 1;
const scriptsPerPage = 10;
let isSystemInfoCollapsed = false;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化系统信息
    getSystemInfo();
    
    getRunningProcesses();
    getAllScripts();
    loadSavedConnections();
    loadMonitorConfig();
    
    // 设置刷新按钮事件
    document.getElementById('refreshSystemInfo').addEventListener('click', getSystemInfo);
    document.getElementById('autoRefreshSystemInfo').addEventListener('click', toggleAutoRefreshSystemInfo);
    document.getElementById('refreshRunning').addEventListener('click', getRunningProcesses);
    document.getElementById('refreshScripts').addEventListener('click', getAllScripts);
    document.getElementById('refreshConnections').addEventListener('click', loadSavedConnections);
    document.getElementById('refreshLogsBtn').addEventListener('click', function() {
        if (currentLogPid) {
            viewLogs(currentLogPid);
        }
    });
    
    // 保存连接按钮事件
    document.getElementById('saveConnection').addEventListener('click', saveConnection);
    
    // 实时日志按钮事件
    document.getElementById('streamLogsBtn').addEventListener('click', function() {
        if (currentLogPid) {
            streamLogs(currentLogPid);
        } else {
            const logContainer = document.getElementById('logContent');
            logContainer.textContent = '请先选择一个进程来查看实时日志';
        }
    });
    
    // 自动滚动按钮事件
    document.getElementById('autoScrollBtn').addEventListener('click', function() {
        this.classList.toggle('active');
        if (this.classList.contains('active')) {
            this.textContent = '自动滚动';
            // 滚动到底部
            const logContainer = document.getElementById('logContent');
            logContainer.scrollTop = logContainer.scrollHeight;
        } else {
            this.textContent = '自动滚动(关)';
        }
    });
    
    // 监控配置按钮事件
    document.getElementById('saveMonitorConfig').addEventListener('click', saveMonitorConfig);
    document.getElementById('loadMonitorConfig').addEventListener('click', loadMonitorConfig);
    
    // 控制台命令输入事件
    document.getElementById('consoleCommand').addEventListener('keypress', function(e) {
        if (e.keyCode === 13) {
            sendCommand();
        }
    });
    
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
    
    // Tab切换事件
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // 系统信息折叠事件
    document.getElementById('toggleSystemInfo').addEventListener('click', toggleSystemInfo);
    
    // SSH连接相关事件
    document.getElementById('addSSHConnection').addEventListener('click', openSSHConfig);
    document.getElementById('testConnection').addEventListener('click', testConnection);
    
    // 每10秒自动刷新一次运行进程
    setInterval(() => {
        getRunningProcesses();
    }, 10000);
});

// Tab切换功能
function switchTab(tabName) {
    // 隐藏所有tab内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 移除所有tab的active类
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 显示选中的tab内容
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // 为选中的tab添加active类
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
}

// 显示通知消息
function showNotification(message, type) {
    // 移除已存在的通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 插入到container的顶部
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    // 3秒后自动移除通知
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 获取系统信息
function getSystemInfo() {
    fetch('/api/system/info')
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data || data.error) {
                console.error('Error fetching system info:', data?.error || 'Unknown error');
                return;
            }
            
            // 更新CPU信息
            document.getElementById('cpuPercent').textContent = data.cpu.percent.toFixed(1) + '%';
            document.getElementById('cpuCount').textContent = data.cpu.count;
            document.getElementById('cpuProgress').style.width = data.cpu.percent + '%';
            
            // 更新内存信息
            const memoryUsedGB = (data.memory.used / (1024**3)).toFixed(2);
            const memoryTotalGB = (data.memory.total / (1024**3)).toFixed(2);
            document.getElementById('memoryPercent').textContent = data.memory.percent.toFixed(1) + '%';
            document.getElementById('memoryUsed').textContent = memoryUsedGB + ' GB';
            document.getElementById('memoryTotal').textContent = memoryTotalGB + ' GB';
            document.getElementById('memoryProgress').style.width = data.memory.percent + '%';
            
            // 更新CPU进程列表
            const cpuProcessesBody = document.getElementById('cpuProcesses');
            cpuProcessesBody.innerHTML = '';
            data.top_processes.cpu.forEach(proc => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${proc.pid}</td>
                    <td>${proc.name}</td>
                    <td>${proc.cpu_percent !== null ? proc.cpu_percent.toFixed(1) : 'N/A'}</td>
                    <td><button class="btn btn-stop" onclick="killProcess(${proc.pid})">杀掉</button></td>
                `;
                cpuProcessesBody.appendChild(row);
            });
            
            // 更新内存进程列表
            const memoryProcessesBody = document.getElementById('memoryProcesses');
            memoryProcessesBody.innerHTML = '';
            data.top_processes.memory.forEach(proc => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${proc.pid}</td>
                    <td>${proc.name}</td>
                    <td>${proc.memory_percent !== null ? proc.memory_percent.toFixed(1) : 'N/A'}</td>
                    <td><button class="btn btn-stop" onclick="killProcess(${proc.pid})">杀掉</button></td>
                `;
                memoryProcessesBody.appendChild(row);
            });
            
            // 更新磁盘信息
            const diskInfo = document.getElementById('diskInfo');
            diskInfo.innerHTML = '';
            data.disks.forEach(disk => {
                const diskElement = document.createElement('div');
                diskElement.className = 'info-item';
                const usedGB = (disk.used / (1024**3)).toFixed(2);
                const totalGB = (disk.total / (1024**3)).toFixed(2);
                const percent = disk.percent.toFixed(1);
                diskElement.innerHTML = `
                    <div><span class="info-label">${disk.device}</span> ${usedGB} GB / ${totalGB} GB (${percent}%)</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                `;
                diskInfo.appendChild(diskElement);
            });
        })
        .catch(error => {
            console.error('Error fetching system info:', error);
        });
}

// 切换系统信息自动刷新
function toggleAutoRefreshSystemInfo() {
    const button = document.getElementById('autoRefreshSystemInfo');
    if (autoRefreshSystemInfoInterval) {
        clearInterval(autoRefreshSystemInfoInterval);
        autoRefreshSystemInfoInterval = null;
        button.classList.remove('active');
        button.textContent = '自动刷新';
    } else {
        autoRefreshSystemInfoInterval = setInterval(getSystemInfo, 5000);
        button.classList.add('active');
        button.textContent = '停止刷新';
    }
}

// 切换系统信息显示/隐藏
function toggleSystemInfo() {
    const content = document.getElementById('systemInfoContent');
    const button = document.getElementById('toggleSystemInfo');
    
    isSystemInfoCollapsed = !isSystemInfoCollapsed;
    
    if (isSystemInfoCollapsed) {
        content.classList.add('collapsed');
        button.textContent = '展开';
    } else {
        content.classList.remove('collapsed');
        button.textContent = '折叠';
    }
}

// 获取运行中的进程
function getRunningProcesses() {
    fetch('/api/processes')
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(processes => {
            const tableBody = document.querySelector('#runningTable tbody');
            tableBody.innerHTML = '';
            
            if (processes.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="5">没有正在运行的Python脚本</td>';
                tableBody.appendChild(row);
                return;
            }
            
            processes.forEach(process => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${process.pid}</td>
                    <td>${process.script_name}</td>
                    <td>${process.script_path}</td>
                    <td>${process.start_time}</td>
                    <td>
                        <button class="btn btn-view" onclick="viewLogs(${process.pid})">查看日志</button>
                        <button class="btn btn-stream" onclick="streamLogs(${process.pid})">实时日志</button>
                        <button class="btn btn-stop" onclick="stopScript(${process.pid})">停止</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching processes:', error);
        });
}

// 获取所有脚本
function getAllScripts() {
    fetch('/api/scripts')
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(scripts => {
            allScripts = scripts;
            displayScriptsPage(1);
            setupScriptsPagination();
        })
        .catch(error => {
            console.error('Error fetching scripts:', error);
        });
}

// 显示脚本分页
function displayScriptsPage(page) {
    currentPage = page;
    const startIndex = (page - 1) * scriptsPerPage;
    const endIndex = startIndex + scriptsPerPage;
    const scriptsToShow = allScripts.slice(startIndex, endIndex);
    
    const tableBody = document.querySelector('#scriptsTable tbody');
    tableBody.innerHTML = '';
    
    if (scriptsToShow.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4">没有找到Python脚本</td>';
        tableBody.appendChild(row);
        return;
    }
    
    scriptsToShow.forEach(script => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${script.name}</td>
            <td>${script.relative_path}</td>
            <td>${script.path}</td>
            <td>
                <button class="btn btn-start" onclick="startScript('${script.path}')">启动</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // 更新分页信息
    const totalScripts = allScripts.length;
    const startScript = startIndex + 1;
    const endScript = Math.min(endIndex, totalScripts);
    document.getElementById('scriptsPaginationInfo').textContent = 
        `显示 ${startScript}-${endScript} 共 ${totalScripts} 个脚本`;
}

// 设置脚本分页控件
function setupScriptsPagination() {
    const totalPages = Math.ceil(allScripts.length / scriptsPerPage);
    const pagination = document.getElementById('scriptsPagination');
    pagination.innerHTML = '';
    
    // 上一页按钮
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.className = 'btn btn-pagination';
        prevButton.textContent = '上一页';
        prevButton.onclick = () => {
            currentPage--;
            displayScriptsPage(currentPage);
            setupScriptsPagination();
        };
        pagination.appendChild(prevButton);
    }
    
    // 页码按钮
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'btn btn-pagination' + (i === currentPage ? ' active' : '');
        pageButton.textContent = i;
        pageButton.onclick = () => {
            currentPage = i;
            displayScriptsPage(currentPage);
            setupScriptsPagination();
        };
        pagination.appendChild(pageButton);
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'btn btn-pagination';
        nextButton.textContent = '下一页';
        nextButton.onclick = () => {
            currentPage++;
            displayScriptsPage(currentPage);
            setupScriptsPagination();
        };
        pagination.appendChild(nextButton);
    }
}

// 启动脚本
function startScript(scriptPath) {
    fetch('/api/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({script_path: scriptPath})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            getRunningProcesses();
        } else {
            showNotification('错误: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error starting script:', error);
        showNotification('启动脚本时出错', 'error');
    });
}

// 停止脚本
function stopScript(pid) {
    if (!confirm('确定要停止进程 ' + pid + ' 吗?')) {
        return;
    }
    
    fetch('/api/stop', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({pid: pid})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            getRunningProcesses();
        } else {
            showNotification('错误: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error stopping script:', error);
        showNotification('停止脚本时出错', 'error');
    });
}

// 查看日志
function viewLogs(pid) {
    currentLogPid = pid;
    fetch(`/api/logs/${pid}`)
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(data => {
            const logContainer = document.getElementById('logContent');
            if (data.error) {
                logContainer.textContent = '错误: ' + data.error;
            } else {
                if (data.source === 'active' || data.source === 'file') {
                    logContainer.textContent = data.logs.join('\n');
                } else if (data.source === 'process_info') {
                    logContainer.innerHTML = `
进程信息:
PID: ${data.pid}
名称: ${data.name}
命令行: ${data.cmdline}
状态: ${data.status}
启动时间: ${data.create_time}
CPU使用率: ${data.cpu_percent}%
内存信息: ${JSON.stringify(data.memory_info)}

${data.logs.join('\n')}
                    `;
                }
                // 滚动到底部
                if (document.getElementById('autoScrollBtn').classList.contains('active')) {
                    logContainer.scrollTop = logContainer.scrollHeight;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching logs:', error);
            document.getElementById('logContent').textContent = '获取日志时出错: ' + error;
        });
}

// 实时日志功能
function streamLogs(pid) {
    // 设置当前PID
    currentLogPid = pid;
    
    const logContainer = document.getElementById('logContent');
    logContainer.textContent = '连接到实时日志流...\n';
    
    // 关闭现有的连接
    if (eventSource) {
        eventSource.close();
    }
    
    // 建立新的SSE连接
    eventSource = new EventSource(`/api/logs/stream/${pid}`);
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.end) {
            logContainer.textContent += '\n[进程已结束]\n';
            eventSource.close();
            return;
        }
        
        if (data.error) {
            logContainer.textContent += '\n[错误]: ' + data.error + '\n';
            return;
        }
        
        if (data.line) {
            logContainer.textContent += data.line + '\n';
            // 滚动到底部
            if (document.getElementById('autoScrollBtn').classList.contains('active')) {
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
    };
    
    eventSource.onerror = function(err) {
        logContainer.textContent += '\n[连接错误]\n';
        console.error('EventSource failed:', err);
        // 关闭连接以避免重复错误
        if (eventSource) {
            eventSource.close();
        }
    };
}

// 打开SSH配置弹窗
function openSSHConfig() {
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
function closeSSHConfig() {
    document.getElementById('sshConfigModal').style.display = 'none';
}

// 测试SSH连接
function testConnection() {
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
function saveConnection() {
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
            closeSSHConfig(); // 关闭弹窗
            loadSavedConnections(); // 刷新连接列表
        } else {
            showNotification(`保存连接失败: ${data.error}`, 'error');
        }
    })
    .catch(error => {
        showNotification(`保存连接时出错: ${error}`, 'error');
    });
}

// 加载已保存的SSH连接
function loadSavedConnections() {
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
                            <button class="btn btn-connect" id="connect-btn-${conn.name}" onclick="connectToServer('${conn.name}')">连接</button>
                            <button class="btn btn-disconnect" id="disconnect-btn-${conn.name}" onclick="disconnectFromServer('${conn.name}')" style="display: none;">断开</button>
                            <button class="btn btn-console" onclick="openConsole('${conn.name}')">控制台</button>
                            <button class="btn btn-disconnect" onclick="deleteConnection('${conn.name}')">删除</button>
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
                checkConnectionStatus(conn.name);
            });
        })
        .catch(error => {
            console.error('Error loading connections:', error);
            showNotification('加载连接时出错', 'error');
        });
}

// 检查SSH连接状态
function checkConnectionStatus(connName) {
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
function connectToServer(connName) {
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
                    checkConnectionStatus(connName);
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
function disconnectFromServer(connName) {
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
            checkConnectionStatus(connName);
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
function deleteConnection(connName) {
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
                loadSavedConnections();
            } else {
                showNotification('错误: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting connection:', error);
            showNotification('删除连接时出错', 'error');
        });
}

// 打开控制台
function openConsole(connName) {
    // 设置当前连接ID
    currentConsoleConnId = connName;
    
    // 显示控制台弹窗
    document.getElementById('consoleModal').style.display = 'block';
    document.getElementById('consoleTitle').textContent = `SSH控制台 - ${connName}`;
    document.getElementById('consoleOutput').textContent = '连接中...\n';
    
    // 建立WebSocket连接
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ssh_shell/${connName}`;
    
    // 关闭已存在的连接
    if (consoleWebSocket) {
        consoleWebSocket.close();
    }
    
    consoleWebSocket = new WebSocket(wsUrl);
    
    consoleWebSocket.onopen = function(event) {
        document.getElementById('consoleOutput').textContent += '连接成功!\n';
        // 滚动到底部
        const consoleOutput = document.getElementById('consoleOutput');
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };
    
    consoleWebSocket.onmessage = function(event) {
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
    
    consoleWebSocket.onerror = function(error) {
        document.getElementById('consoleOutput').textContent += '[连接错误]\n';
        console.error('WebSocket error:', error);
        // 滚动到底部
        const consoleOutput = document.getElementById('consoleOutput');
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };
    
    consoleWebSocket.onclose = function(event) {
        document.getElementById('consoleOutput').textContent += '[连接已关闭]\n';
        // 滚动到底部
        const consoleOutput = document.getElementById('consoleOutput');
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };
}

// 关闭控制台
function closeConsole() {
    // 关闭WebSocket连接
    if (consoleWebSocket) {
        consoleWebSocket.close();
    }
    
    // 隐藏控制台弹窗
    document.getElementById('consoleModal').style.display = 'none';
}

// 发送命令到控制台
function sendCommand() {
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
            if (consoleWebSocket && consoleWebSocket.readyState === WebSocket.OPEN) {
                consoleWebSocket.send(JSON.stringify({command: command}));
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
function toggleDebugMode() {
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
            debugMode = !debugMode;
            const debugSection = document.getElementById('debugSection');
            if (debugMode) {
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
function sendDebugCommand(command) {
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
            if (consoleWebSocket && consoleWebSocket.readyState === WebSocket.OPEN) {
                consoleWebSocket.send(command);
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

// 加载监控配置
function loadMonitorConfig() {
    fetch('/api/config/monitor')
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            return response.json();
        })
        .then(config => {
            document.getElementById('monitorPaths').value = config.monitor_paths.join('\n');
            document.getElementById('excludePatterns').value = config.exclude_patterns.join('\n');
            
            // 显示解析后的路径
            const resolvedPathsDiv = document.getElementById('resolvedPaths');
            resolvedPathsDiv.innerHTML = '<strong>解析后的路径:</strong><br>';
            config.monitor_paths.forEach(path => {
                let fullPath;
                if (path.startsWith('/') || path.includes(':\\')) {
                    fullPath = path; // 绝对路径
                } else {
                    fullPath = './' + path; // 相对路径
                }
                resolvedPathsDiv.innerHTML += `${fullPath}<br>`;
            });
        })
        .catch(error => {
            console.error('Error loading monitor config:', error);
            showNotification('加载监控配置时出错', 'error');
        });
}

// 保存监控配置
function saveMonitorConfig() {
    const monitorPaths = document.getElementById('monitorPaths').value
        .split('\n')
        .filter(path => path.trim() !== '');
    const excludePatterns = document.getElementById('excludePatterns').value
        .split('\n')
        .filter(pattern => pattern.trim() !== '');
    
    const config = {
        monitor_paths: monitorPaths,
        exclude_patterns: excludePatterns
    };
    
    fetch('/api/config/monitor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            loadMonitorConfig();
        } else {
            showNotification('错误: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error saving monitor config:', error);
        showNotification('保存监控配置时出错', 'error');
    });
}

// 杀掉进程功能
function killProcess(pid) {
    if (!confirm(`确定要杀掉进程 ${pid} 吗?`)) {
        return;
    }
    
    fetch('/api/kill', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({pid: pid})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(`进程 ${pid} 已成功杀掉`, 'success');
            // 刷新系统信息
            getSystemInfo();
        } else {
            showNotification(`杀掉进程失败: ${data.error}`, 'error');
        }
    })
    .catch(error => {
        showNotification(`杀掉进程时出错: ${error}`, 'error');
    });
}