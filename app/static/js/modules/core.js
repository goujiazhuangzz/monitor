// 核心模块
class CoreModule {
    // Tab切换功能
    switchTab(tabName) {
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
    showNotification(message, type) {
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

    // 自动滚动按钮事件
    toggleAutoScroll() {
        const autoScrollBtn = document.getElementById('autoScrollBtn');
        autoScrollBtn.classList.toggle('active');
        if (autoScrollBtn.classList.contains('active')) {
            autoScrollBtn.textContent = '自动滚动';
            // 滚动到底部
            const logContainer = document.getElementById('logContent');
            logContainer.scrollTop = logContainer.scrollHeight;
        } else {
            autoScrollBtn.textContent = '自动滚动(关)';
        }
    }

    // 修改密码功能
    openChangePasswordModal() {
        document.getElementById('changePasswordModal').style.display = 'block';
    }

    closeChangePasswordModal() {
        document.getElementById('changePasswordModal').style.display = 'none';
    }

    submitChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showNotification('所有密码字段都必须填写', 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showNotification('新密码和确认密码不匹配', 'error');
            return;
        }

        fetch('/api/auth/change_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                // 清空密码字段
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmNewPassword').value = '';
                // 关闭弹窗
                this.closeChangePasswordModal();
            } else {
                showNotification(data.error, 'error');
            }
        })
        .catch(error => {
            showNotification('修改密码时出错: ' + error, 'error');
        });
    }

    // 初始化核心模块
    init() {
        // 绑定Tab切换事件
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // 绑定自动滚动按钮事件
        document.getElementById('autoScrollBtn').addEventListener('click', () => this.toggleAutoScroll());

        // 绑定修改密码相关事件
        document.getElementById('changePasswordBtn').addEventListener('click', () => this.openChangePasswordModal());
        document.getElementById('submitChangePassword').addEventListener('click', () => this.submitChangePassword());
    }
}

// 创建核心模块实例
const coreModule = new CoreModule();

// 全局通知函数
function showNotification(message, type) {
    coreModule.showNotification(message, type);
}

// 全局关闭修改密码弹窗函数
function closeChangePasswordModal() {
    coreModule.closeChangePasswordModal();
}

// 全局关闭SSH配置弹窗函数
function closeSSHConfig() {
    sshManagerModule.closeSSHConfig();
}

// 全局关闭控制台函数
function closeConsole() {
    sshManagerModule.closeConsole();
}

// 全局发送命令函数
function sendCommand() {
    sshManagerModule.sendCommand();
}

// 全局切换调试模式函数
function toggleDebugMode() {
    sshManagerModule.toggleDebugMode();
}

// 全局发送调试命令函数
function sendDebugCommand(command) {
    sshManagerModule.sendDebugCommand(command);
}

// DOM加载完成后初始化所有模块
document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有模块
    coreModule.init();
    systemInfoModule.init();
    processManagerModule.init();
    scriptManagerModule.init();
    sshManagerModule.init();
    configManagerModule.init();
});