// 配置管理模块
class ConfigManagerModule {
    // 加载监控配置
    loadMonitorConfig() {
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
    saveMonitorConfig() {
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
                this.loadMonitorConfig();
            } else {
                showNotification('错误: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error saving monitor config:', error);
            showNotification('保存监控配置时出错', 'error');
        });
    }

    // 初始化配置管理模块
    init() {
        // 加载初始配置
        this.loadMonitorConfig();

        // 绑定事件监听器
        document.getElementById('saveMonitorConfig').addEventListener('click', () => this.saveMonitorConfig());
        document.getElementById('loadMonitorConfig').addEventListener('click', () => this.loadMonitorConfig());
    }
}

// 创建配置管理模块实例
const configManagerModule = new ConfigManagerModule();