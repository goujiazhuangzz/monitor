// 系统信息模块
class SystemInfoModule {
    constructor() {
        this.autoRefreshSystemInfoInterval = null;
        this.isSystemInfoCollapsed = false;
    }

    // 获取系统信息
    getSystemInfo() {
        fetch('/api/system/info')
            .then(response => {
                // 检查是否未认证
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                return response.json();
            })
            .then(data => {
                // 检查数据是否有效
                if (!data) {
                    console.error('Error fetching system info: Empty response');
                    return;
                }
                
                // 检查是否有错误信息
                if (data.error) {
                    console.error('Error fetching system info:', data.error);
                    return;
                }

                try {
                    // 更新CPU信息
                    document.getElementById('cpuPercent').textContent = data.cpu.percent.toFixed(1) + '%';
                    document.getElementById('cpuCount').textContent = data.cpu.count;
                    document.getElementById('cpuProgress').style.width = data.cpu.percent + '%';
                    document.getElementById('cpuProgressText').textContent = data.cpu.percent.toFixed(1) + '%';

                    // 更新内存信息
                    const memoryUsedGB = (data.memory.used / (1024**3)).toFixed(2);
                    const memoryTotalGB = (data.memory.total / (1024**3)).toFixed(2);
                    document.getElementById('memoryPercent').textContent = data.memory.percent.toFixed(1) + '%';
                    document.getElementById('memoryUsed').textContent = memoryUsedGB + ' GB';
                    document.getElementById('memoryTotal').textContent = memoryTotalGB + ' GB';
                    document.getElementById('memoryProgress').style.width = data.memory.percent + '%';
                    document.getElementById('memoryProgressText').textContent = data.memory.percent.toFixed(1) + '%';

                    // 更新CPU进程列表
                    const cpuProcessesBody = document.getElementById('cpuProcesses');
                    if (cpuProcessesBody) {
                        cpuProcessesBody.innerHTML = '';
                        if (data.top_processes && data.top_processes.cpu) {
                            data.top_processes.cpu.forEach(proc => {
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td>${proc.pid}</td>
                                    <td>${proc.name}</td>
                                    <td>${proc.cpu_percent !== null ? proc.cpu_percent.toFixed(1) : 'N/A'}</td>
                                    <td><button class="btn btn-stop" onclick="systemInfoModule.killProcess(${proc.pid})">杀掉</button></td>
                                `;
                                cpuProcessesBody.appendChild(row);
                            });
                        }
                    }

                    // 更新内存进程列表
                    const memoryProcessesBody = document.getElementById('memoryProcesses');
                    if (memoryProcessesBody) {
                        memoryProcessesBody.innerHTML = '';
                        if (data.top_processes && data.top_processes.memory) {
                            data.top_processes.memory.forEach(proc => {
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td>${proc.pid}</td>
                                    <td>${proc.name}</td>
                                    <td>${proc.memory_percent !== null ? proc.memory_percent.toFixed(1) : 'N/A'}</td>
                                    <td><button class="btn btn-stop" onclick="systemInfoModule.killProcess(${proc.pid})">杀掉</button></td>
                                `;
                                memoryProcessesBody.appendChild(row);
                            });
                        }
                    }

                    // 更新磁盘信息部分
                    const diskInfoContainer = document.getElementById('diskInfoContainer');
                    if (diskInfoContainer) {
                        diskInfoContainer.innerHTML = '';
                        
                        if (data.disks && data.disks.length > 0) {
                            data.disks.forEach(disk => {
                                const diskItem = document.createElement('div');
                                diskItem.className = 'info-item';
                                
                                const usedGB = (disk.used / (1024**3)).toFixed(2);
                                const totalGB = (disk.total / (1024**3)).toFixed(2);
                                const percent = disk.percent.toFixed(1);
                                
                                diskItem.innerHTML = `
                                    <div class="disk-header">
                                        <span class="info-label">${disk.device} (${disk.mountpoint})</span>
                                    </div>
                                    <div class="disk-usage-text">${usedGB} GB / ${totalGB} GB (${percent}%)</div>
                                    <div class="disk-progress-container">
                                        <div class="disk-progress-bar">
                                            <div class="disk-progress-fill" style="width: ${percent}%"></div>
                                        </div>
                                    </div>
                                `;
                                diskInfoContainer.appendChild(diskItem);
                            });
                        } else {
                            // 如果没有磁盘数据，显示提示信息
                            diskInfoContainer.innerHTML = '<div class="info-item">暂无磁盘信息</div>';
                        }
                    }
                } catch (e) {
                    console.error('Error updating system info UI:', e);
                }
            })
            .catch(error => {
                console.error('Error fetching system info:', error);
                // 显示错误信息
                const diskInfoContainer = document.getElementById('diskInfoContainer');
                if (diskInfoContainer) {
                    diskInfoContainer.innerHTML = '<div class="info-item">获取磁盘信息失败</div>';
                }
            });
    }

    // 切换系统信息自动刷新
    toggleAutoRefreshSystemInfo() {
        const button = document.getElementById('autoRefreshSystemInfo');
        if (this.autoRefreshSystemInfoInterval) {
            clearInterval(this.autoRefreshSystemInfoInterval);
            this.autoRefreshSystemInfoInterval = null;
            button.classList.remove('active');
            button.textContent = '自动刷新';
        } else {
            this.autoRefreshSystemInfoInterval = setInterval(() => this.getSystemInfo(), 5000);
            button.classList.add('active');
            button.textContent = '停止刷新';
        }
    }

    // 切换系统信息显示/隐藏
    toggleSystemInfo() {
        const content = document.getElementById('systemInfoContent');
        const button = document.getElementById('toggleSystemInfo');

        this.isSystemInfoCollapsed = !this.isSystemInfoCollapsed;

        if (this.isSystemInfoCollapsed) {
            content.classList.add('collapsed');
            button.textContent = '展开';
        } else {
            content.classList.remove('collapsed');
            button.textContent = '折叠';
        }
    }

    // 杀掉进程功能
    killProcess(pid) {
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
                this.getSystemInfo();
            } else {
                showNotification(`杀掉进程失败: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            showNotification(`杀掉进程时出错: ${error}`, 'error');
        });
    }

    // 初始化系统信息模块
    init() {
        // 获取初始系统信息
        this.getSystemInfo();

        // 绑定事件监听器
        const refreshBtn = document.getElementById('refreshSystemInfo');
        const autoRefreshBtn = document.getElementById('autoRefreshSystemInfo');
        const toggleBtn = document.getElementById('toggleSystemInfo');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.getSystemInfo());
        }
        if (autoRefreshBtn) {
            autoRefreshBtn.addEventListener('click', () => this.toggleAutoRefreshSystemInfo());
        }
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSystemInfo());
        }
    }
}

// 创建系统信息模块实例
const systemInfoModule = new SystemInfoModule();