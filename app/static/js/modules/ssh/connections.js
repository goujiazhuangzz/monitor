const { createApp, ref, reactive, onMounted, onBeforeUnmount, computed, provide, inject } = Vue;
const { ElButton, ElTabs, ElTabPane, ElDialog, ElForm, ElFormItem, ElInput, ElCard, 
        ElRow, ElCol, ElProgress, ElTable, ElTableColumn, ElTag, ElMessageBox } = ElementPlus;

// SSH连接组件
const SSHConnections = {
    template: `
        <div>
            <el-card>
                <h3 style="margin-top: 0;">已保存的连接</h3>
                <el-button @click="addConnection" type="primary" style="float: right; margin-left: 10px;">新增</el-button>
                <el-button @click="loadSavedConnections" style="float: right;">刷新</el-button>
                <div style="clear: both;"></div>
                <el-table :data="savedConnections" style="width: 100%">
                    <el-table-column prop="name" label="连接名称"></el-table-column>
                    <el-table-column prop="host" label="主机地址"></el-table-column>
                    <el-table-column prop="port" label="端口" width="80"></el-table-column>
                    <el-table-column prop="username" label="用户名"></el-table-column>
                    <el-table-column label="状态" width="120">
                        <template #default="scope">
                            <el-tag :type="scope.row.connected ? 'success' : 'danger'">
                                {[{ getConnectionStatusText(scope.row.connected) }]}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="300">
                        <template #default="scope">
                            <div class="action-buttons">
                                <el-button size="small" type="primary" 
                                           @click="connectToServer(scope.row.name)"
                                           v-if="!scope.row.connected">连接</el-button>
                                <el-button size="small" type="warning" 
                                           @click="disconnectFromServer(scope.row.name)"
                                           v-else>断开</el-button>
                                <el-button size="small" type="success" 
                                           @click="openConsole(scope.row.name)">控制台</el-button>
                                <el-button size="small" type="danger" 
                                           @click="deleteConnection(scope.row.name)">删除</el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>
            
            <!-- 新增连接对话框 -->
            <el-dialog 
                v-model="showAddConnectionDialogLocal" 
                title="新增SSH连接" 
                width="600px"
                @update:modelValue="handleDialogUpdate"
            >
                <el-form :model="sshForm" label-width="100px">
                    <el-row :gutter="20">
                        <el-col :span="12">
                            <el-form-item label="连接名称">
                                <el-input v-model="sshForm.name"></el-input>
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item label="主机地址">
                                <el-input v-model="sshForm.host"></el-input>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    
                    <el-row :gutter="20">
                        <el-col :span="12">
                            <el-form-item label="端口">
                                <el-input v-model="sshForm.port" type="number"></el-input>
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item label="用户名">
                                <el-input v-model="sshForm.username"></el-input>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    
                    <el-row :gutter="20">
                        <el-col :span="12">
                            <el-form-item label="认证方式">
                                <el-select v-model="sshForm.auth_method" style="width: 100%;">
                                    <el-option label="密码" value="password"></el-option>
                                    <el-option label="密钥文件" value="key_file"></el-option>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item label="密码" v-if="sshForm.auth_method === 'password'">
                                <el-input v-model="sshForm.password" type="password" show-password></el-input>
                            </el-form-item>
                            <el-form-item label="密钥文件" v-else>
                                <el-input v-model="sshForm.key_file"></el-input>
                            </el-form-item>
                        </el-col>
                    </el-row>
                </el-form>
                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="handleDialogUpdate(false)">取消</el-button>
                        <el-button type="primary" @click="saveNewConnection">保存</el-button>
                    </span>
                </template>
            </el-dialog>
            
            <!-- SSH控制台对话框 -->
            <el-dialog 
                v-model="showConsoleDialog" 
                :title="'SSH控制台 - ' + currentConnectionName" 
                width="900px"
                @update:modelValue="handleConsoleDialogUpdate"
                :fullscreen="consoleFullscreen"
            >
                <div class="console-container">
                    <div class="console-header">
                        <div>{{ currentConnectionName }}</div>
                        <div class="console-status">
                            状态: 
                            <span v-if="connectionStatus === 'connecting'" style="color: #ff9800;">连接中...</span>
                            <span v-else-if="connectionStatus === 'connected'" style="color: #4caf50;">已连接</span>
                            <span v-else-if="connectionStatus === 'disconnected'" style="color: #f44336;">已断开</span>
                            <span v-else-if="connectionStatus === 'error'" style="color: #f44336;">错误</span>
                            <span v-else>未知</span>
                        </div>
                    </div>
                    
                    <div class="console-toolbar">
                        <el-button size="small" @click="clearConsole">清屏</el-button>
                        <el-dropdown @command="sendQuickCommand" size="small">
                            <el-button size="small">
                                快速命令<i class="el-icon-arrow-down el-icon--right"></i>
                            </el-button>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item 
                                        v-for="cmd in quickCommands" 
                                        :key="cmd.command" 
                                        :command="cmd.command">
                                        {{ cmd.label }}
                                    </el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                        <el-button size="small" @click="toggleFullscreen">
                            {{ consoleFullscreen ? '退出全屏' : '全屏' }}
                        </el-button>
                    </div>
                    
                    <div ref="consoleOutput" class="console-output"></div>
                    
                    <div class="console-input-container">
                        <el-input 
                            ref="consoleInput"
                            v-model="consoleCommand" 
                            @keyup.enter="sendCommand"
                            @keyup.up.down="handleKeyUp"
                            placeholder="输入命令并按回车执行"
                            class="console-input"
                        ></el-input>
                    </div>
                </div>
            </el-dialog>
        </div>
    `,
    setup(props, { emit }) {
        const sshForm = reactive({
            name: '',
            host: '',
            port: 22,
            username: '',
            auth_method: 'password',
            password: '',
            key_file: ''
        });
        
        const showAddConnectionDialogLocal = ref(false);
        const showConsoleDialog = ref(false);
        const consoleFullscreen = ref(false);
        const currentConnectionName = ref('');
        const consoleCommand = ref('');
        const consoleOutput = ref(null);
        const consoleInput = ref(null);
        const websocket = ref(null);
        const savedConnections = ref([]);
        const connectionStatus = ref('disconnected'); // connecting, connected, disconnected, error
        const commandHistory = ref([]); // 命令历史记录
        const commandHistoryIndex = ref(-1); // 命令历史记录索引
        
        const loadSavedConnections = async () => {
            try {
                // 获取保存的连接配置
                const configResponse = await fetch('/api/ssh/config');
                const config = await configResponse.json();
                
                // 获取当前活动的连接
                const connectionsResponse = await fetch('/api/ssh/connections');
                const activeConnections = await connectionsResponse.json();
                
                // 合并配置和连接状态
                const connectionsWithStatus = (config.connections || []).map(conn => {
                    const isActive = activeConnections.includes(conn.name);
                    return {
                        ...conn,
                        connected: isActive
                    };
                });
                
                savedConnections.value = connectionsWithStatus;
            } catch (error) {
                console.error('加载SSH连接失败:', error);
            }
        };
        
        const getConnectionStatusText = (connected) => {
            return connected ? '已连接' : '未连接';
        };
        
        const addConnection = () => {
            // 清空表单
            Object.assign(sshForm, {
                name: '',
                host: '',
                port: 22,
                username: '',
                auth_method: 'password',
                password: '',
                key_file: ''
            });
            showAddConnectionDialogLocal.value = true;
        };
        
        const handleDialogUpdate = (value) => {
            showAddConnectionDialogLocal.value = value;
        };
        
        const handleConsoleDialogUpdate = (value) => {
            showConsoleDialog.value = value;
            // 关闭对话框时断开WebSocket连接并清理状态
            if (!value && websocket.value) {
                websocket.value.close();
                websocket.value = null;
                currentConnectionName.value = '';
                connectionStatus.value = 'disconnected';
            }
        };
        
        const openConsole = async (connName) => {
            try {
                // 设置当前连接名称
                currentConnectionName.value = connName;
                
                // 检查连接是否已建立
                const response = await fetch('/api/ssh/config');
                const config = await response.json();
                const conn = config.connections.find(c => c.name === connName);
                
                if (!conn) {
                    customEmit('show-notification', { message: '未找到连接配置', type: 'error' });
                    return;
                }
                
                // 如果连接未建立，先建立连接
                if (!conn.connected) {
                    const connectResponse = await fetch('/api/ssh/connect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            host: conn.host,
                            port: conn.port,
                            username: conn.username,
                            password: conn.password,
                            key_file: conn.key_file,
                            conn_id: connName
                        })
                    });
                    
                    const connectData = await connectResponse.json();
                    if (!connectData.success) {
                        customEmit('show-notification', { message: `连接失败: ${connectData.error}`, type: 'error' });
                        currentConnectionName.value = ''; // 清空连接名称
                        return;
                    }
                }
                
                // 初始化WebSocket连接
                initWebSocket(connName);
                
                // 显示控制台对话框
                showConsoleDialog.value = true;
            } catch (error) {
                customEmit('show-notification', { message: '打开控制台时出错', type: 'error' });
                currentConnectionName.value = ''; // 清空连接名称
            }
        };
        
        const initWebSocket = (connName) => {
            // 清空控制台输出
            if (consoleOutput.value) {
                consoleOutput.value.textContent = '';
            }
            
            // 设置连接状态
            connectionStatus.value = 'connecting';
            
            // 创建WebSocket连接
            const wsUrl = `ws://${window.location.host}/ws/ssh_shell/${connName}`;
            websocket.value = new WebSocket(wsUrl);
            
            websocket.value.onopen = () => {
                connectionStatus.value = 'connected';
                appendToConsole(`\x1b[32m已连接到 ${currentConnectionName.value}\x1b[0m\n`);
                // 发送初始命令以获取提示符
                setTimeout(() => {
                    if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
                        websocket.value.send('\n');
                    }
                }, 500);
            };
            
            websocket.value.onmessage = (event) => {
                try {
                    // 尝试解析JSON格式的消息
                    const data = JSON.parse(event.data);
                    if (data.output) {
                        // 只显示output字段
                        appendToConsole(data.output);
                    } else if (data.error) {
                        // 显示错误信息
                        appendToConsole(`\x1b[31m错误: ${data.error}\x1b[0m\n`);
                    } else {
                        // 如果没有output或error字段，显示原始数据
                        appendToConsole(event.data);
                    }
                } catch (e) {
                    // 如果不是JSON格式，直接显示原始数据
                    appendToConsole(event.data);
                }
            };
            
            websocket.value.onclose = () => {
                connectionStatus.value = 'disconnected';
                appendToConsole('\n\x1b[31m连接已断开\x1b[0m\n');
            };
            
            websocket.value.onerror = (error) => {
                connectionStatus.value = 'error';
                appendToConsole(`\n\x1b[31m连接错误: ${error.message}\x1b[0m\n`);
            };
        };
        
        const appendToConsole = (text) => {
            if (consoleOutput.value) {
                // 创建一个新的div元素来包含消息
                const messageDiv = document.createElement('div');
                messageDiv.className = 'console-message';
                
                // 处理ANSI颜色代码
                let formattedText = text;
                
                // 处理粗体
                formattedText = formattedText.replace(/\x1b\[1m(.*?)\x1b\[0m/g, '<span class="ansi-bold">$1</span>');
                
                // 处理各种颜色（带结束标签）
                formattedText = formattedText.replace(/\x1b\[30m(.*?)\x1b\[0m/g, '<span class="ansi-black">$1</span>');
                formattedText = formattedText.replace(/\x1b\[31m(.*?)\x1b\[0m/g, '<span class="ansi-red">$1</span>');
                formattedText = formattedText.replace(/\x1b\[32m(.*?)\x1b\[0m/g, '<span class="ansi-green">$1</span>');
                formattedText = formattedText.replace(/\x1b\[33m(.*?)\x1b\[0m/g, '<span class="ansi-yellow">$1</span>');
                formattedText = formattedText.replace(/\x1b\[34m(.*?)\x1b\[0m/g, '<span class="ansi-blue">$1</span>');
                formattedText = formattedText.replace(/\x1b\[35m(.*?)\x1b\[0m/g, '<span class="ansi-magenta">$1</span>');
                formattedText = formattedText.replace(/\x1b\[36m(.*?)\x1b\[0m/g, '<span class="ansi-cyan">$1</span>');
                formattedText = formattedText.replace(/\x1b\[37m(.*?)\x1b\[0m/g, '<span class="ansi-white">$1</span>');
                
                // 处理无关闭标签的颜色代码
                formattedText = formattedText.replace(/\x1b\[30m/g, '<span class="ansi-black">');
                formattedText = formattedText.replace(/\x1b\[31m/g, '<span class="ansi-red">');
                formattedText = formattedText.replace(/\x1b\[32m/g, '<span class="ansi-green">');
                formattedText = formattedText.replace(/\x1b\[33m/g, '<span class="ansi-yellow">');
                formattedText = formattedText.replace(/\x1b\[34m/g, '<span class="ansi-blue">');
                formattedText = formattedText.replace(/\x1b\[35m/g, '<span class="ansi-magenta">');
                formattedText = formattedText.replace(/\x1b\[36m/g, '<span class="ansi-cyan">');
                formattedText = formattedText.replace(/\x1b\[37m/g, '<span class="ansi-white">');
                formattedText = formattedText.replace(/\x1b\[1m/g, '<span class="ansi-bold">');
                formattedText = formattedText.replace(/\x1b\[0m/g, '</span>');
                
                // 处理换行符
                formattedText = formattedText.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>');
                
                // 设置格式化后的文本
                messageDiv.innerHTML = formattedText;
                
                // 将消息添加到控制台输出区域
                consoleOutput.value.appendChild(messageDiv);
                
                // 滚动到底部
                consoleOutput.value.scrollTop = consoleOutput.value.scrollHeight;
            }
        };
        
        const sendCommand = () => {
            if (websocket.value && websocket.value.readyState === WebSocket.OPEN && consoleCommand.value.trim()) {
                websocket.value.send(consoleCommand.value + '\n');
                addToCommandHistory(consoleCommand.value);
                consoleCommand.value = '';
            }
        };
        
        const clearConsole = () => {
            if (consoleOutput.value) {
                consoleOutput.value.innerHTML = '';
            }
        };
        
        const addToCommandHistory = (command) => {
            if (!commandHistory.value.includes(command)) {
                commandHistory.value.unshift(command);
                if (commandHistory.value.length > 50) { // 限制历史记录数量
                    commandHistory.value.pop();
                }
            }
            commandHistoryIndex.value = -1;
        };
        
        const handleKeyUp = (event) => {
            if (commandHistory.value.length === 0) return;
            
            if (event.key === 'ArrowUp') {
                commandHistoryIndex.value = Math.min(commandHistoryIndex.value + 1, commandHistory.value.length - 1);
                consoleCommand.value = commandHistory.value[commandHistoryIndex.value] || '';
            } else if (event.key === 'ArrowDown') {
                commandHistoryIndex.value = Math.max(commandHistoryIndex.value - 1, -1);
                consoleCommand.value = commandHistoryIndex.value >= 0 ? 
                    commandHistory.value[commandHistoryIndex.value] : '';
            }
        };
        
        const toggleFullscreen = () => {
            consoleFullscreen.value = !consoleFullscreen.value;
        };
        
        // 快速命令功能
        const sendQuickCommand = (command) => {
            if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
                websocket.value.send(command + '\n');
                addToCommandHistory(command);
            }
        };
        
        // 常用调试命令
        const quickCommands = [
            { label: 'ls -la', command: 'ls -la' },
            { label: 'pwd', command: 'pwd' },
            { label: 'df -h', command: 'df -h' },
            { label: 'free -m', command: 'free -m' },
            { label: 'ps aux', command: 'ps aux' },
            { label: 'top', command: 'top -b -n 1' },
            { label: 'uname -a', command: 'uname -a' },
            { label: 'clear', command: 'clear' }
        ];
        
        // 为新增连接单独创建保存函数
        const saveNewConnection = async () => {
            try {
                const connectionData = { ...sshForm };
                const response = await fetch('/api/ssh/save_connection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(connectionData)
                });
                
                const data = await response.json();
                if (data.success) {
                    customEmit('show-notification', { message: data.message, type: 'success' });
                    loadSavedConnections();
                    // 关闭对话框
                    showAddConnectionDialogLocal.value = false;
                } else {
                    customEmit('show-notification', { message: `保存连接失败: ${data.error}`, type: 'error' });
                }
            } catch (error) {
                customEmit('show-notification', { message: '保存连接时出错', type: 'error' });
            }
        };
        
        const testConnection = async () => {
            try {
                const testData = { ...sshForm };
                const response = await fetch('/api/ssh/test_connection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testData)
                });
                
                const data = await response.json();
                if (data.success) {
                    customEmit('show-notification', { message: data.message, type: 'success' });
                } else {
                    customEmit('show-notification', { message: `连接测试失败: ${data.error}`, type: 'error' });
                }
            } catch (error) {
                customEmit('show-notification', { message: '连接测试时出错', type: 'error' });
            }
        };
        
        const connectToServer = async (connName) => {
            try {
                const response = await fetch('/api/ssh/config');
                const config = await response.json();
                const conn = config.connections.find(c => c.name === connName);
                
                if (!conn) {
                    customEmit('show-notification', { message: '未找到连接配置', type: 'error' });
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
                
                const connectResponse = await fetch('/api/ssh/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(connData)
                });
                
                const data = await connectResponse.json();
                if (data.success) {
                    customEmit('show-notification', { message: data.message, type: 'success' });
                    // 等待一小段时间再刷新连接状态，确保后端已更新
                    setTimeout(() => {
                        loadSavedConnections(); // 刷新连接状态
                    }, 500);
                } else {
                    customEmit('show-notification', { message: `连接失败: ${data.error}`, type: 'error' });
                }
            } catch (error) {
                customEmit('show-notification', { message: '连接时出错', type: 'error' });
            }
        };
        
        const disconnectFromServer = async (connName) => {
            try {
                const response = await fetch('/api/ssh/disconnect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conn_id: connName })
                });
                
                const data = await response.json();
                if (data.success) {
                    customEmit('show-notification', { message: data.message, type: 'success' });
                    // 等待一小段时间再刷新连接状态，确保后端已更新
                    setTimeout(() => {
                        loadSavedConnections(); // 刷新连接状态
                    }, 500);
                } else {
                    customEmit('show-notification', { message: `断开连接失败: ${data.error}`, type: 'error' });
                }
            } catch (error) {
                customEmit('show-notification', { message: '断开连接时出错', type: 'error' });
            }
        };
        
        const deleteConnection = async (connName) => {
            try {
                await ElMessageBox.confirm(
                    `确定要删除连接 "${connName}" 吗?`,
                    '确认操作',
                    {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning',
                    }
                );
                
                const response = await fetch(`/api/ssh/delete_connection/${connName}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                if (data.success) {
                    customEmit('show-notification', { message: data.message, type: 'success' });
                    loadSavedConnections();
                } else {
                    customEmit('show-notification', { message: `删除连接失败: ${data.error}`, type: 'error' });
                }
            } catch {
                // 用户取消操作
            }
        };
        
        onMounted(() => {
            loadSavedConnections();
        });
        
        // 创建一个全局事件监听器来处理通知
        const customEmit = (event, data) => {
            if (event === 'show-notification') {
                const customEvent = new CustomEvent('show-notification', {
                    detail: data
                });
                window.dispatchEvent(customEvent);
            }
        };
        
        return {
            sshForm,
            savedConnections,
            showAddConnectionDialogLocal,
            showConsoleDialog,
            consoleFullscreen,
            currentConnectionName,
            consoleCommand,
            consoleOutput,
            consoleInput,
            connectionStatus,
            commandHistory,
            commandHistoryIndex,
            quickCommands,
            loadSavedConnections,
            getConnectionStatusText,
            addConnection,
            saveNewConnection,
            testConnection,
            connectToServer,
            disconnectFromServer,
            deleteConnection,
            openConsole,
            handleDialogUpdate,
            handleConsoleDialogUpdate,
            sendCommand,
            clearConsole,
            sendQuickCommand,
            handleKeyUp,
            toggleFullscreen,
            customEmit
        };
    }
};

// 主应用
const app = createApp({
    components: {
        'ssh-connections': SSHConnections
    },
    setup() {
        const activeMenu = ref('ssh');
        const showChangePasswordDialog = ref(false);
        const showAddConnectionDialog = ref(false);
        const passwordForm = reactive({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        const passwordFormRef = ref(null);
        const notification = reactive({
            message: '',
            type: 'info'
        });
        let notificationTimeout = ref(null);
        
        const showNotification = (data) => {
            notification.message = data.message;
            notification.type = data.type;
            
            // 清除之前的定时器
            if (notificationTimeout.value) {
                clearTimeout(notificationTimeout.value);
            }
            
            // 3秒后自动隐藏通知
            notificationTimeout.value = setTimeout(() => {
                notification.message = '';
            }, 3000);
        };
        
        const hideNotification = () => {
            notification.message = '';
            if (notificationTimeout.value) {
                clearTimeout(notificationTimeout.value);
            }
        };
        
        const changePassword = async () => {
            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                showNotification({ message: '新密码和确认密码不一致', type: 'error' });
                return;
            }
            
            try {
                const response = await fetch('/api/auth/change_password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        old_password: passwordForm.oldPassword,
                        new_password: passwordForm.newPassword
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    showNotification({ message: data.message, type: 'success' });
                    showChangePasswordDialog.value = false;
                    // 清空表单
                    passwordForm.oldPassword = '';
                    passwordForm.newPassword = '';
                    passwordForm.confirmPassword = '';
                } else {
                    showNotification({ message: `修改密码失败: ${data.error}`, type: 'error' });
                }
            } catch (error) {
                showNotification({ message: '修改密码时出错', type: 'error' });
            }
        };
        
        const navigateTo = (menu) => {
            activeMenu.value = menu;
            switch(menu) {
                case 'system':
                    window.location.href = '/system_info';
                    break;
                case 'local':
                    window.location.href = '/local_scripts';
                    break;
                case 'ssh':
                    window.location.href = '/ssh_connections';
                    break;
                case 'config':
                    window.location.href = '/config_manager';
                    break;
            }
        };
        
        // 监听全局通知事件
        onMounted(() => {
            window.addEventListener('show-notification', (event) => {
                showNotification(event.detail);
            });
        });
        
        return {
            activeMenu,
            showChangePasswordDialog,
            showAddConnectionDialog,
            passwordForm,
            passwordFormRef,
            notification,
            showNotification,
            hideNotification,
            changePassword,
            navigateTo
        };
    }
});

app.config.compilerOptions.delimiters = ['{[{', '}]}'];
app.use(ElementPlus);
app.component('ssh-connections', SSHConnections);
app.mount('#app');