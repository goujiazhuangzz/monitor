<template>
  <div class="config-manager">
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
      <el-tabs v-model="activeTab">
        <!-- 监控配置 -->
        <el-tab-pane label="监控配置" name="monitor">
          <el-card>
            <h3 style="margin-top: 0;">监控路径配置</h3>
            <el-form :model="monitorConfig" label-width="120px">
              <el-form-item label="监控路径">
                <el-input 
                  v-model="newMonitorPath" 
                  placeholder="请输入监控路径"
                  style="width: 300px; margin-right: 10px;"
                ></el-input>
                <el-button type="primary" @click="addMonitorPath">添加</el-button>
              </el-form-item>
            </el-form>
            
            <el-table :data="monitorConfig.monitor_paths" style="width: 100%">
              <el-table-column label="监控路径">
                <template #default="scope">
                  {{ scope.row }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button 
                    size="small" 
                    type="danger" 
                    @click="removeMonitorPath(scope.$index)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <h3 style="margin-top: 30px;">排除模式配置</h3>
            <el-form label-width="120px">
              <el-form-item label="排除模式">
                <el-input 
                  v-model="newExcludePattern" 
                  placeholder="请输入排除模式"
                  style="width: 300px; margin-right: 10px;"
                ></el-input>
                <el-button type="primary" @click="addExcludePattern">添加</el-button>
              </el-form-item>
            </el-form>
            
            <el-table :data="monitorConfig.exclude_patterns" style="width: 100%">
              <el-table-column label="排除模式">
                <template #default="scope">
                  {{ scope.row }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="scope">
                  <el-button 
                    size="small" 
                    type="danger" 
                    @click="removeExcludePattern(scope.$index)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div style="margin-top: 30px; text-align: center;">
              <el-button type="success" @click="saveMonitorConfig">保存配置</el-button>
            </div>
          </el-card>
        </el-tab-pane>
        
        <!-- SSH配置 -->
        <el-tab-pane label="SSH配置" name="ssh">
          <el-card>
            <h3 style="margin-top: 0;">SSH连接配置</h3>
            <el-button @click="showAddSSHDialog" type="primary" style="float: right; margin-left: 10px;">新增连接</el-button>
            <el-button @click="loadSSHConfig" style="float: right;">刷新</el-button>
            <div style="clear: both;"></div>
            
            <el-table :data="sshConfig.connections" style="width: 100%">
              <el-table-column prop="name" label="连接名称"></el-table-column>
              <el-table-column prop="host" label="主机地址"></el-table-column>
              <el-table-column prop="port" label="端口" width="80"></el-table-column>
              <el-table-column prop="username" label="用户名"></el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <div class="action-buttons">
                    <el-button size="small" type="warning" @click="editSSHConnection(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="deleteSSHConnection(scope.row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>
        
        <!-- 认证配置 -->
        <el-tab-pane label="认证配置" name="auth">
          <el-card>
            <h3 style="margin-top: 0;">用户管理</h3>
            <el-table :data="users" style="width: 100%">
              <el-table-column prop="username" label="用户名"></el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <div class="action-buttons">
                    <el-button size="small" type="warning" @click="changeUserPassword(scope.row)">修改密码</el-button>
                    <el-button size="small" type="danger" @click="deleteUser(scope.row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <div style="margin-top: 20px;">
              <el-button @click="handleShowAddUserDialog" type="primary">新增用户</el-button>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <!-- 新增/编辑SSH连接对话框 -->
    <el-dialog 
      v-model="showSSHDialog" 
      :title="editingSSH ? '编辑SSH连接' : '新增SSH连接'" 
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
          <el-button @click="showSSHDialog = false">取消</el-button>
          <el-button type="primary" @click="saveSSHConnection">保存</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 新增用户对话框 -->
    <el-dialog 
      v-model="showAddUserDialogFlag" 
      title="新增用户" 
      width="400px"
    >
      <el-form :model="userForm">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username"></el-input>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="userForm.password" type="password" show-password></el-input>
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="userForm.confirmPassword" type="password" show-password></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddUserDialogFlag = false">取消</el-button>
          <el-button type="primary" @click="addUser">保存</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 修改用户密码对话框 -->
    <el-dialog 
      v-model="showChangeUserPasswordDialog" 
      title="修改用户密码" 
      width="400px"
    >
      <el-form :model="changePasswordForm">
        <el-form-item label="用户名">
          <el-input v-model="changePasswordForm.username" disabled></el-input>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="changePasswordForm.newPassword" type="password" show-password></el-input>
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="changePasswordForm.confirmPassword" type="password" show-password></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showChangeUserPasswordDialog = false">取消</el-button>
          <el-button type="primary" @click="saveUserPassword">保存</el-button>
        </span>
      </template>
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
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

export default {
  name: 'ConfigManager',
  setup() {
    const router = useRouter()
    
    // 响应式数据
    const activeMenu = ref('config')
    const activeTab = ref('monitor')
    const username = ref('admin')
    const showChangePasswordDialog = ref(false)
    const showSSHDialog = ref(false)
    const showAddUserDialogFlag = ref(false)
    const showChangeUserPasswordDialog = ref(false)
    const editingSSH = ref(null)
    
    // 配置数据
    const monitorConfig = reactive({
      monitor_paths: [],
      exclude_patterns: []
    })
    
    const sshConfig = reactive({
      connections: []
    })
    
    const users = ref([])
    
    // 表单数据
    const newMonitorPath = ref('')
    const newExcludePattern = ref('')
    
    const sshForm = reactive({
      name: '',
      host: '',
      port: 22,
      username: '',
      auth_method: 'password',
      password: '',
      key_file: ''
    })
    
    const userForm = reactive({
      username: '',
      password: '',
      confirmPassword: ''
    })
    
    const changePasswordForm = reactive({
      username: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    // 方法定义
    const loadMonitorConfig = async () => {
      try {
        const response = await fetch('/api/config/monitor')
        const data = await response.json()
        monitorConfig.monitor_paths = data.monitor_paths || []
        monitorConfig.exclude_patterns = data.exclude_patterns || []
      } catch (error) {
        console.error('加载监控配置失败:', error)
      }
    }
    
    const saveMonitorConfig = async () => {
      try {
        const configData = {
          monitor_paths: monitorConfig.monitor_paths,
          exclude_patterns: monitorConfig.exclude_patterns
        }
        
        const response = await fetch('/api/config/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configData)
        })
        
        const data = await response.json()
        if (data.success) {
          // 保存成功
        }
      } catch (error) {
        console.error('保存监控配置失败:', error)
      }
    }
    
    const addMonitorPath = () => {
      if (newMonitorPath.value && !monitorConfig.monitor_paths.includes(newMonitorPath.value)) {
        monitorConfig.monitor_paths.push(newMonitorPath.value)
        newMonitorPath.value = ''
      }
    }
    
    const removeMonitorPath = (index) => {
      monitorConfig.monitor_paths.splice(index, 1)
    }
    
    const addExcludePattern = () => {
      if (newExcludePattern.value && !monitorConfig.exclude_patterns.includes(newExcludePattern.value)) {
        monitorConfig.exclude_patterns.push(newExcludePattern.value)
        newExcludePattern.value = ''
      }
    }
    
    const removeExcludePattern = (index) => {
      monitorConfig.exclude_patterns.splice(index, 1)
    }
    
    const loadSSHConfig = async () => {
      try {
        const response = await fetch('/api/ssh/config')
        const data = await response.json()
        sshConfig.connections = data.connections || []
      } catch (error) {
        console.error('加载SSH配置失败:', error)
      }
    }
    
    const showAddSSHDialog = () => {
      editingSSH.value = null
      sshForm.name = ''
      sshForm.host = ''
      sshForm.port = 22
      sshForm.username = ''
      sshForm.auth_method = 'password'
      sshForm.password = ''
      sshForm.key_file = ''
      showSSHDialog.value = true
    }
    
    const editSSHConnection = (connection) => {
      editingSSH.value = connection
      sshForm.name = connection.name
      sshForm.host = connection.host
      sshForm.port = connection.port
      sshForm.username = connection.username
      sshForm.auth_method = connection.auth_method || 'password'
      sshForm.password = connection.password || ''
      sshForm.key_file = connection.key_file || ''
      showSSHDialog.value = true
    }
    
    const saveSSHConnection = async () => {
      try {
        const connectionData = { ...sshForm }
        
        const response = await fetch('/api/ssh/save_connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connectionData)
        })
        
        const data = await response.json()
        if (data.success) {
          showSSHDialog.value = false
          loadSSHConfig()
        }
      } catch (error) {
        console.error('保存SSH连接失败:', error)
      }
    }
    
    const deleteSSHConnection = async (connection) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除连接 "${connection.name}" 吗?`,
          '确认操作',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const response = await fetch(`/api/ssh/delete_connection/${connection.name}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        if (data.success) {
          loadSSHConfig()
        }
      } catch {
        // 用户取消操作
      }
    }
    
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/auth/users')
        const data = await response.json()
        users.value = data.users || []
      } catch (error) {
        console.error('加载用户列表失败:', error)
      }
    }
    
    const handleShowAddUserDialog = () => {
      userForm.username = ''
      userForm.password = ''
      userForm.confirmPassword = ''
      showAddUserDialogFlag.value = true
    }
    
    const addUser = async () => {
      if (userForm.password !== userForm.confirmPassword) {
        return
      }
      
      try {
        const userData = {
          username: userForm.username,
          password: userForm.password
        }
        
        const response = await fetch('/api/auth/add_user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
        
        const data = await response.json()
        if (data.success) {
          showAddUserDialogFlag.value = false
          loadUsers()
        }
      } catch (error) {
        console.error('添加用户失败:', error)
      }
    }
    
    const deleteUser = async (user) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除用户 "${user.username}" 吗?`,
          '确认操作',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const response = await fetch(`/api/auth/delete_user/${user.username}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        if (data.success) {
          loadUsers()
        }
      } catch {
        // 用户取消操作
      }
    }
    
    const changeUserPassword = (user) => {
      changePasswordForm.username = user.username
      changePasswordForm.newPassword = ''
      changePasswordForm.confirmPassword = ''
      showChangeUserPasswordDialog.value = true
    }
    
    const saveUserPassword = async () => {
      if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
        return
      }
      
      try {
        const userData = {
          username: changePasswordForm.username,
          new_password: changePasswordForm.newPassword
        }
        
        const response = await fetch('/api/auth/change_user_password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
        
        const data = await response.json()
        if (data.success) {
          showChangeUserPasswordDialog.value = false
        }
      } catch (error) {
        console.error('修改用户密码失败:', error)
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
      loadMonitorConfig()
      loadSSHConfig()
      loadUsers()
    })
    
    // 返回数据和方法
    return {
      // 数据
      activeMenu,
      activeTab,
      username,
      showChangePasswordDialog,
      showSSHDialog,
      showAddUserDialogFlag,
      showChangeUserPasswordDialog,
      editingSSH,
      monitorConfig,
      sshConfig,
      users,
      newMonitorPath,
      newExcludePattern,
      sshForm,
      userForm,
      changePasswordForm,
      passwordForm,
      
      // 方法
      loadMonitorConfig,
      saveMonitorConfig,
      addMonitorPath,
      removeMonitorPath,
      addExcludePattern,
      removeExcludePattern,
      loadSSHConfig,
      showAddSSHDialog,
      editSSHConnection,
      saveSSHConnection,
      deleteSSHConnection,
      loadUsers,
      handleShowAddUserDialog,
      addUser,
      deleteUser,
      changeUserPassword,
      saveUserPassword,
      changePassword,
      logout,
      navigateTo
    }
  }
}
</script>

<style scoped>
.config-manager {
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

.dialog-footer {
  text-align: right;
}
</style>