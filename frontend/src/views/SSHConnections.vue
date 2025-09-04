<template>
  <div class="ssh-connections">
    <div class="header">
      <h1>Python脚本监控工具</h1>
      <div class="user-info">
        <span>欢迎, {{ username }}!</span>
        <el-button type="primary" @click="showChangePasswordDialog = true">修改密码</el-button>
        <el-button type="danger" @click="logout">注销</el-button>
      </div>
    </div>
    
    <div class="menu">
      <div 
        class="menu-item" 
        :class="{ active: activeMenu === 'system' }" 
        @click="navigateTo('system')"
      >
        系统信息
      </div>
      <div 
        class="menu-item" 
        :class="{ active: activeMenu === 'local' }" 
        @click="navigateTo('local')"
      >
        本地脚本管理
      </div>
      <div 
        class="menu-item" 
        :class="{ active: activeMenu === 'ssh' }" 
        @click="navigateTo('ssh')"
      >
        SSH远程连接
      </div>
      <div 
        class="menu-item" 
        :class="{ active: activeMenu === 'config' }" 
        @click="navigateTo('config')"
      >
        配置管理
      </div>
    </div>
    
    <div class="content">
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
                {{ getConnectionStatusText(scope.row.connected) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="300">
            <template #default="scope">
              <div class="action-buttons">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="connectToServer(scope.row.name)"
                  v-if="!scope.row.connected"
                >
                  连接
                </el-button>
                <el-button 
                  size="small" 
                  type="warning" 
                  @click="disconnectFromServer(scope.row.name)"
                  v-else
                >
                  断开
                </el-button>
                <el-button 
                  size="small" 
                  type="success" 
                  @click="openConsole(scope.row.name)"
                >
                  控制台
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteConnection(scope.row.name)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
    
    <!-- 新增连接对话框 -->
    <el-dialog 
      v-model="showAddConnectionDialog" 
      title="新增SSH连接" 
      width="600px"
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
          <el-button @click="showAddConnectionDialog = false">取消</el-button>
          <el-button type="primary" @click="saveNewConnection">保存</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- SSH控制台对话框 -->
    <el-dialog 
      v-model="showConsoleDialog" 
      :title="'SSH控制台 - ' + currentConnectionName" 
      width="900px"
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
    
    <!-- 修改密码对话框 -->
    <el-dialog v-model="showChangePasswordDialog" title="修改密码" width="400px">
      <el-form :model="passwordForm">
        <el-form-item label="原密码">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password></el-input>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password></el-input>
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showChangePasswordDialog = false">取消</el-button>
          <el-button type="primary" @click="changePassword">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { 
  ElMessageBox,
  ElButton,
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElRow,
  ElCol,
  ElSelect,
  ElOption,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem
} from 'element-plus'
import { useRouter } from 'vue-router'

export default {
  name: 'SSHConnections',
  components: {
    ElButton,
    ElCard,
    ElTable,
    ElTableColumn,
    ElTag,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElRow,
    ElCol,
    ElSelect,
    ElOption,
    ElDropdown,
    ElDropdownMenu,
    ElDropdownItem
  },
  setup() {
    const router = useRouter()
    
    // 响应式数据
    const activeMenu = ref('ssh')
    const username = ref('admin') // 这里应该从会话或API获取
    const showAddConnectionDialog = ref(false)
    const showConsoleDialog = ref(false)
    const showChangePasswordDialog = ref(false)
    const consoleFullscreen = ref(false)
    const currentConnectionName = ref('')
    const consoleCommand = ref('')
    const consoleOutput = ref(null)
    const consoleInput = ref(null)
    const websocket = ref(null)
    const savedConnections = ref([])
    const connectionStatus = ref('disconnected')
    const commandHistory = ref([])
    const commandHistoryIndex = ref(-1)
    
    // 表单数据
    const sshForm = reactive({
      name: '',
      host: '',
      port: 22,
      username: '',
      auth_method: 'password',
      password: '',
      key_file: ''
    })
    
    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    // 快速命令
    const quickCommands = [
      { label: 'ls -la', command: 'ls -la' },
      { label: 'pwd', command: 'pwd' },
      { label: 'df -h', command: 'df -h' },
      { label: 'free -m', command: 'free -m' },
      { label: 'ps aux', command: 'ps aux' },
      { label: 'top', command: 'top -b -n 1' },
      { label: 'uname -a', command: 'uname -a' },
      { label: 'clear', command: 'clear' }
    ]
    
    // 方法定义
    const loadSavedConnections = async () => {
      try {
        // 获取保存的连接配置
        const configResponse = await fetch('/api/ssh/config')
        const config = await configResponse.json()
        
        // 获取当前活动的连接
        const connectionsResponse = await fetch('/api/ssh/connections')
        const activeConnections = await connectionsResponse.json()
        
        // 合并配置和连接状态
        const connectionsWithStatus = (config.connections || []).map(conn => {
          const isActive = activeConnections.includes(conn.name)
          return {
            ...conn,
            connected: isActive
          }
        })
        
        savedConnections.value = connectionsWithStatus
      } catch (error) {
        console.error('加载SSH连接失败:', error)
      }
    }
    
    const getConnectionStatusText = (connected) => {
      return connected ? '已连接' : '未连接'
    }
    
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
      })
      showAddConnectionDialog.value = true
    }
    
    const openConsole = async (connName) => {
      try {
        // 设置当前连接名称
        currentConnectionName.value = connName
        
        // 检查连接是否已建立
        const response = await fetch('/api/ssh/config')
        const config = await response.json()
        const conn = config.connections.find(c => c.name === connName)
        
        if (!conn) {
          // 显示错误通知
          return
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
          })
          
          const connectData = await connectResponse.json()
          if (!connectData.success) {
            currentConnectionName.value = '' // 清空连接名称
            return
          }
        }
        
        // 初始化WebSocket连接
        initWebSocket(connName)
        
        // 显示控制台对话框
        showConsoleDialog.value = true
      } catch (error) {
        currentConnectionName.value = '' // 清空连接名称
      }
    }
    
    const initWebSocket = (connName) => {
      // 清空控制台输出
      if (consoleOutput.value) {
        consoleOutput.value.textContent = ''
      }
      
      // 设置连接状态
      connectionStatus.value = 'connecting'
      
      // 创建WebSocket连接
      const wsUrl = `ws://localhost:5000/ws/ssh_shell/${connName}`
      websocket.value = new WebSocket(wsUrl)
      
      websocket.value.onopen = () => {
        connectionStatus.value = 'connected'
        appendToConsole('\x1b[32m已连接到 ' + currentConnectionName.value + '\x1b[0m\n')
        // 发送初始命令以获取提示符
        setTimeout(() => {
          if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
            websocket.value.send('\n')
          }
        }, 500)
      }
      
      websocket.value.onmessage = (event) => {
        try {
          // 尝试解析JSON格式的消息
          const data = JSON.parse(event.data)
          if (data.output) {
            // 只显示output字段
            appendToConsole(data.output)
          } else if (data.error) {
            // 显示错误信息
            appendToConsole('\x1b[31m错误: ' + data.error + '\x1b[0m\n')
          } else {
            // 如果没有output或error字段，显示原始数据
            appendToConsole(event.data)
          }
        } catch (e) {
          // 如果不是JSON格式，直接显示原始数据
          appendToConsole(event.data)
        }
      }
      
      websocket.value.onclose = () => {
        connectionStatus.value = 'disconnected'
        appendToConsole('\n\x1b[31m连接已断开\x1b[0m\n')
      }
      
      websocket.value.onerror = (error) => {
        connectionStatus.value = 'error'
        appendToConsole('\n\x1b[31m连接错误: ' + error.message + '\x1b[0m\n')
      }
    }
    
    const appendToConsole = (text) => {
      if (consoleOutput.value) {
        // 创建一个新的div元素来包含消息
        const messageDiv = document.createElement('div')
        messageDiv.className = 'console-message'
        
        // 处理ANSI颜色代码
        let formattedText = text
        
        // 处理粗体
        formattedText = formattedText.replace(/\x1b\[1m(.*?)\x1b\[0m/g, '<span class="ansi-bold">$1</span>')
        
        // 处理各种颜色（带结束标签）
        formattedText = formattedText.replace(/\x1b\[30m(.*?)\x1b\[0m/g, '<span class="ansi-black">$1</span>')
        formattedText = formattedText.replace(/\x1b\[31m(.*?)\x1b\[0m/g, '<span class="ansi-red">$1</span>')
        formattedText = formattedText.replace(/\x1b\[32m(.*?)\x1b\[0m/g, '<span class="ansi-green">$1</span>')
        formattedText = formattedText.replace(/\x1b\[33m(.*?)\x1b\[0m/g, '<span class="ansi-yellow">$1</span>')
        formattedText = formattedText.replace(/\x1b\[34m(.*?)\x1b\[0m/g, '<span class="ansi-blue">$1</span>')
        formattedText = formattedText.replace(/\x1b\[35m(.*?)\x1b\[0m/g, '<span class="ansi-magenta">$1</span>')
        formattedText = formattedText.replace(/\x1b\[36m(.*?)\x1b\[0m/g, '<span class="ansi-cyan">$1</span>')
        formattedText = formattedText.replace(/\x1b\[37m(.*?)\x1b\[0m/g, '<span class="ansi-white">$1</span>')
        
        // 处理无关闭标签的颜色代码
        formattedText = formattedText.replace(/\x1b\[30m/g, '<span class="ansi-black">')
        formattedText = formattedText.replace(/\x1b\[31m/g, '<span class="ansi-red">')
        formattedText = formattedText.replace(/\x1b\[32m/g, '<span class="ansi-green">')
        formattedText = formattedText.replace(/\x1b\[33m/g, '<span class="ansi-yellow">')
        formattedText = formattedText.replace(/\x1b\[34m/g, '<span class="ansi-blue">')
        formattedText = formattedText.replace(/\x1b\[35m/g, '<span class="ansi-magenta">')
        formattedText = formattedText.replace(/\x1b\[36m/g, '<span class="ansi-cyan">')
        formattedText = formattedText.replace(/\x1b\[37m/g, '<span class="ansi-white">')
        formattedText = formattedText.replace(/\x1b\[1m/g, '<span class="ansi-bold">')
        formattedText = formattedText.replace(/\x1b\[0m/g, '</span>')
        
        // 处理换行符
        formattedText = formattedText.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>')
        
        // 设置格式化后的文本
        messageDiv.innerHTML = formattedText
        
        // 将消息添加到控制台输出区域
        consoleOutput.value.appendChild(messageDiv)
        
        // 滚动到底部
        consoleOutput.value.scrollTop = consoleOutput.value.scrollHeight
      }
    }
    
    const sendCommand = () => {
      if (websocket.value && websocket.value.readyState === WebSocket.OPEN && consoleCommand.value.trim()) {
        websocket.value.send(consoleCommand.value + '\n')
        addToCommandHistory(consoleCommand.value)
        consoleCommand.value = ''
      }
    }
    
    const clearConsole = () => {
      if (consoleOutput.value) {
        consoleOutput.value.innerHTML = ''
      }
    }
    
    const addToCommandHistory = (command) => {
      if (!commandHistory.value.includes(command)) {
        commandHistory.value.unshift(command)
        if (commandHistory.value.length > 50) { // 限制历史记录数量
          commandHistory.value.pop()
        }
      }
      commandHistoryIndex.value = -1
    }
    
    const handleKeyUp = (event) => {
      if (commandHistory.value.length === 0) return
      
      if (event.key === 'ArrowUp') {
        commandHistoryIndex.value = Math.min(commandHistoryIndex.value + 1, commandHistory.value.length - 1)
        consoleCommand.value = commandHistory.value[commandHistoryIndex.value] || ''
      } else if (event.key === 'ArrowDown') {
        commandHistoryIndex.value = Math.max(commandHistoryIndex.value - 1, -1)
        consoleCommand.value = commandHistoryIndex.value >= 0 ? 
          commandHistory.value[commandHistoryIndex.value] : ''
      }
    }
    
    const toggleFullscreen = () => {
      consoleFullscreen.value = !consoleFullscreen.value
    }
    
    const sendQuickCommand = (command) => {
      if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
        websocket.value.send(command + '\n')
        addToCommandHistory(command)
      }
    }
    
    const saveNewConnection = async () => {
      try {
        const connectionData = { ...sshForm }
        const response = await fetch('/api/ssh/save_connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connectionData)
        })
        
        const data = await response.json()
        if (data.success) {
          loadSavedConnections()
          // 关闭对话框
          showAddConnectionDialog.value = false
        }
      } catch (error) {
        console.error('保存连接时出错:', error)
      }
    }
    
    const connectToServer = async (connName) => {
      try {
        const response = await fetch('/api/ssh/config')
        const config = await response.json()
        const conn = config.connections.find(c => c.name === connName)
        
        if (!conn) {
          return
        }
        
        const connData = {
          host: conn.host,
          port: conn.port,
          username: conn.username,
          password: conn.password,
          key_file: conn.key_file,
          conn_id: connName
        }
        
        const connectResponse = await fetch('/api/ssh/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connData)
        })
        
        const data = await connectResponse.json()
        if (data.success) {
          // 等待一小段时间再刷新连接状态，确保后端已更新
          setTimeout(() => {
            loadSavedConnections() // 刷新连接状态
          }, 500)
        }
      } catch (error) {
        console.error('连接时出错:', error)
      }
    }
    
    const disconnectFromServer = async (connName) => {
      try {
        const response = await fetch('/api/ssh/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conn_id: connName })
        })
        
        const data = await response.json()
        if (data.success) {
          // 等待一小段时间再刷新连接状态，确保后端已更新
          setTimeout(() => {
            loadSavedConnections() // 刷新连接状态
          }, 500)
        }
      } catch (error) {
        console.error('断开连接时出错:', error)
      }
    }
    
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
        )
        
        const response = await fetch(`/api/ssh/delete_connection/${connName}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        if (data.success) {
          loadSavedConnections()
        }
      } catch {
        // 用户取消操作
      }
    }
    
    const changePassword = async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        return
      }
      
      try {
        const response = await fetch('/api/auth/change_password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            old_password: passwordForm.oldPassword,
            new_password: passwordForm.newPassword
          })
        })
        
        const data = await response.json()
        if (data.success) {
          showChangePasswordDialog.value = false
          // 清空表单
          passwordForm.oldPassword = ''
          passwordForm.newPassword = ''
          passwordForm.confirmPassword = ''
        }
      } catch (error) {
        console.error('修改密码时出错:', error)
      }
    }
    
    const logout = () => {
      // 执行登出操作
      router.push('/login')
    }
    
    const navigateTo = (menu) => {
      activeMenu.value = menu
      switch(menu) {
        case 'system':
          router.push('/system_info')
          break
        case 'local':
          router.push('/local_scripts')
          break
        case 'ssh':
          router.push('/ssh_connections')
          break
        case 'config':
          router.push('/config_manager')
          break
      }
    }
    
    // 生命周期钩子
    onMounted(() => {
      loadSavedConnections()
    })
    
    // 返回数据和方法
    return {
      // 数据
      activeMenu,
      username,
      showAddConnectionDialog,
      showConsoleDialog,
      showChangePasswordDialog,
      consoleFullscreen,
      currentConnectionName,
      consoleCommand,
      consoleOutput,
      consoleInput,
      websocket,
      savedConnections,
      connectionStatus,
      commandHistory,
      commandHistoryIndex,
      sshForm,
      passwordForm,
      quickCommands,
      
      // 方法
      loadSavedConnections,
      getConnectionStatusText,
      addConnection,
      openConsole,
      initWebSocket,
      appendToConsole,
      sendCommand,
      clearConsole,
      addToCommandHistory,
      handleKeyUp,
      toggleFullscreen,
      sendQuickCommand,
      saveNewConnection,
      connectToServer,
      disconnectFromServer,
      deleteConnection,
      changePassword,
      logout,
      navigateTo
    }
  }
}
</script>

<style scoped>
.ssh-connections {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  color: #303133;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.menu {
  display: flex;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  padding: 10px;
}

.menu-item {
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
  margin-right: 10px;
}

.menu-item.active {
  background-color: #409eff;
  color: white;
}

.menu-item:hover:not(.active) {
  background-color: #f5f7fa;
}

.content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.action-buttons {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.console-container {
  display: flex;
  flex-direction: column;
  height: 500px;
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid #333;
}

.console-header {
  background-color: #2d2d2d;
  color: #ccc;
  padding: 8px 12px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.console-output {
  flex: 1;
  padding: 15px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.4;
  color: #ffffff;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background-color: #1e1e1e;
}

.console-message {
  margin-bottom: 4px;
  word-break: break-word;
  white-space: pre-wrap;
}

.console-message:last-child {
  margin-bottom: 0;
}

.console-toolbar {
  display: flex;
  gap: 10px;
  padding: 8px 12px;
  background-color: #252525;
  border-bottom: 1px solid #333;
}

.console-input-container {
  padding: 12px;
  background-color: #2d2d2d;
  border-top: 1px solid #333;
}

.console-input .el-input__inner {
  background-color: #1e1e1e;
  border: 1px solid #333;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 4px;
  transition: border-color 0.3s;
}

.console-input .el-input__inner:focus {
  border-color: #409eff;
  outline: none;
}

.dialog-footer {
  text-align: right;
}
</style>