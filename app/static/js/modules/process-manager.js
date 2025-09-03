// 进程管理模块
class ProcessManagerModule {
    constructor() {
        this.currentLogPid = null;
        this.eventSource = null;
    }

    // 获取运行中的进程
    getRunningProcesses() {
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
                            <button class="btn btn-view" onclick="processManagerModule.viewLogs(${process.pid})">查看日志</button>
                            <button class="btn btn-stream" onclick="processManagerModule.streamLogs(${process.pid})">实时日志</button>
                            <button class="btn btn-stop" onclick="processManagerModule.stopScript(${process.pid})">停止</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching processes:', error);
            });
    }

    // 查看日志
    viewLogs(pid) {
        this.currentLogPid = pid;
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
    streamLogs(pid) {
        // 设置当前PID
        this.currentLogPid = pid;

        const logContainer = document.getElementById('logContent');
        logContainer.textContent = '连接到实时日志流...\n';

        // 关闭现有的连接
        if (this.eventSource) {
            this.eventSource.close();
        }

        // 建立新的SSE连接
        this.eventSource = new EventSource(`/api/logs/stream/${pid}`);

        this.eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.end) {
                logContainer.textContent += '\n[进程已结束]\n';
                processManagerModule.eventSource.close();
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

        this.eventSource.onerror = function(err) {
            logContainer.textContent += '\n[连接错误]\n';
            console.error('EventSource failed:', err);
            // 关闭连接以避免重复错误
            if (processManagerModule.eventSource) {
                processManagerModule.eventSource.close();
            }
        };
    }

    // 停止脚本
    stopScript(pid) {
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
                this.getRunningProcesses();
            } else {
                showNotification('错误: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error stopping script:', error);
            showNotification('停止脚本时出错', 'error');
        });
    }

    // 初始化进程管理模块
    init() {
        // 获取初始运行进程
        this.getRunningProcesses();

        // 绑定事件监听器
        document.getElementById('refreshRunning').addEventListener('click', () => this.getRunningProcesses());
        document.getElementById('refreshLogsBtn').addEventListener('click', () => {
            if (this.currentLogPid) {
                this.viewLogs(this.currentLogPid);
            }
        });
        document.getElementById('streamLogsBtn').addEventListener('click', () => {
            if (this.currentLogPid) {
                this.streamLogs(this.currentLogPid);
            } else {
                const logContainer = document.getElementById('logContent');
                logContainer.textContent = '请先选择一个进程来查看实时日志';
            }
        });

        // 每10秒自动刷新一次运行进程
        setInterval(() => this.getRunningProcesses(), 10000);
    }
}

// 创建进程管理模块实例
const processManagerModule = new ProcessManagerModule();