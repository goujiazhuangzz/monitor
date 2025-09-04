// 全局变量
let currentLogPid = null;
let eventSource = null;
let sshConnections = {};
let currentConsoleConnId = null;
let consoleWebSocket = null;
let debugMode = false;
let allScripts = [];
let currentPage = 1;
const scriptsPerPage = 10;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化各模块
    initializeModules();
    
    // 绑定核心事件监听器
    bindCoreEventListeners();
});

// 初始化各模块
function initializeModules() {
    // 初始化系统信息模块
    if (typeof systemInfoModule !== 'undefined') {
        systemInfoModule.init();
    }
    
    // 初始化进程管理模块
    if (typeof processManagerModule !== 'undefined') {
        processManagerModule.init();
    }
    
    // 初始化脚本管理模块
    if (typeof scriptManagerModule !== 'undefined') {
        scriptManagerModule.init();
    }
    
    // 初始化配置管理模块
    if (typeof configManagerModule !== 'undefined') {
        configManagerModule.init();
    }
    
    // 初始化SSH管理模块
    if (typeof sshManagerModule !== 'undefined') {
        sshManagerModule.init();
    }
}

// 绑定核心事件监听器
function bindCoreEventListeners() {
    // Tab切换事件
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

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
function loadProcessLogs(pid) {
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