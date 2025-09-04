<template>
  <div class="local-scripts">
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
        <h3 style="margin-top: 0;">本地脚本管理</h3>
        <el-button @click="handleShowAddScriptDialog" type="primary" style="float: right; margin-left: 10px;">新增脚本</el-button>
        <el-button @click="loadScripts" style="float: right;">刷新</el-button>
        <div style="clear: both;"></div>
        
        <el-table :data="scripts" style="width: 100%">
          <el-table-column prop="name" label="脚本名称"></el-table-column>
          <el-table-column prop="path" label="脚本路径"></el-table-column>
          <el-table-column prop="last_modified" label="最后修改时间" width="180"></el-table-column>
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="runScript(scope.row)">运行</el-button>
                <el-button size="small" type="success" @click="viewScript(scope.row)">查看</el-button>
                <el-button size="small" type="warning" @click="editScript(scope.row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteScript(scope.row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
    
    <!-- 新增/编辑脚本对话框 -->
    <el-dialog 
      v-model="showScriptDialogFlag" 
      :title="editingScript ? '编辑脚本' : '新增脚本'" 
      width="600px"
    >
      <el-form :model="scriptForm" label-width="100px">
        <el-form-item label="脚本名称">
          <el-input v-model="scriptForm.name"></el-input>
        </el-form-item>
        <el-form-item label="脚本路径">
          <el-input v-model="scriptForm.path"></el-input>
        </el-form-item>
        <el-form-item label="脚本内容">
          <el-input 
            v-model="scriptForm.content" 
            type="textarea" 
            :rows="10"
            placeholder="请输入脚本内容"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showScriptDialogFlag = false">取消</el-button>
          <el-button type="primary" @click="saveScript">保存</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 脚本运行输出对话框 -->
    <el-dialog 
      v-model="showOutputDialog" 
      :title="'脚本运行输出 - ' + currentScriptName" 
      width="800px"
    >
      <div class="output-container">
        <div ref="outputContent" class="output-content"></div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showOutputDialog = false">关闭</el-button>
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
  name: 'LocalScripts',
  setup() {
    const router = useRouter()
    
    // 响应式数据
    const activeMenu = ref('local')
    const username = ref('admin')
    const showChangePasswordDialog = ref(false)
    const showScriptDialogFlag = ref(false)
    const showOutputDialog = ref(false)
    const editingScript = ref(null)
    const currentScriptName = ref('')
    const outputContent = ref(null)
    const scripts = ref([])
    
    // 表单数据
    const scriptForm = reactive({
      name: '',
      path: '',
      content: ''
    })
    
    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    // 方法定义
    const loadScripts = async () => {
      try {
        const response = await fetch('/api/scripts/list')
        const data = await response.json()
        scripts.value = data.scripts || []
      } catch (error) {
        console.error('加载脚本列表失败:', error)
      }
    }
    
    const handleShowAddScriptDialog = () => {
      editingScript.value = null
      scriptForm.name = ''
      scriptForm.path = ''
      scriptForm.content = ''
      showScriptDialogFlag.value = true
    }
    
    const editScript = async (script) => {
      try {
        const response = await fetch(`/api/scripts/content?path=${encodeURIComponent(script.path)}`)
        const data = await response.json()
        
        if (data.success) {
          editingScript.value = script
          scriptForm.name = script.name
          scriptForm.path = script.path
          scriptForm.content = data.content
          showScriptDialogFlag.value = true
        }
      } catch (error) {
        console.error('加载脚本内容失败:', error)
      }
    }
    
    const saveScript = async () => {
      try {
        const scriptData = {
          name: scriptForm.name,
          path: scriptForm.path,
          content: scriptForm.content
        }
        
        const response = await fetch('/api/scripts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scriptData)
        })
        
        const data = await response.json()
        if (data.success) {
          showScriptDialogFlag.value = false
          loadScripts()
        }
      } catch (error) {
        console.error('保存脚本失败:', error)
      }
    }
    
    const runScript = async (script) => {
      try {
        currentScriptName.value = script.name
        showOutputDialog.value = true
        
        // 清空输出内容
        if (outputContent.value) {
          outputContent.value.innerHTML = ''
        }
        
        const response = await fetch('/api/scripts/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: script.path })
        })
        
        const data = await response.json()
        if (data.success) {
          // 显示输出内容
          if (outputContent.value) {
            outputContent.value.textContent = data.output || '脚本执行完成，无输出'
          }
        } else {
          // 显示错误信息
          if (outputContent.value) {
            outputContent.value.textContent = '错误: ' + data.error
          }
        }
      } catch (error) {
        console.error('运行脚本失败:', error)
        if (outputContent.value) {
          outputContent.value.textContent = '错误: ' + error.message
        }
      }
    }
    
    const viewScript = async (script) => {
      try {
        const response = await fetch(`/api/scripts/content?path=${encodeURIComponent(script.path)}`)
        const data = await response.json()
        
        if (data.success) {
          editingScript.value = script
          scriptForm.name = script.name
          scriptForm.path = script.path
          scriptForm.content = data.content
          showScriptDialogFlag.value = true
        }
      } catch (error) {
        console.error('查看脚本失败:', error)
      }
    }
    
    const deleteScript = async (script) => {
      try {
        await ElMessageBox.confirm(
          `确定要删除脚本 "${script.name}" 吗?`,
          '确认操作',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
        
        const response = await fetch('/api/scripts/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: script.path })
        })
        
        const data = await response.json()
        if (data.success) {
          loadScripts()
        }
      } catch {
        // 用户取消操作或删除失败
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
      loadScripts()
    })
    
    // 返回数据和方法
    return {
      // 数据
      activeMenu,
      username,
      showChangePasswordDialog,
      showScriptDialogFlag,
      showOutputDialog,
      editingScript,
      currentScriptName,
      outputContent,
      scripts,
      scriptForm,
      passwordForm,
      
      // 方法
      loadScripts,
      handleShowAddScriptDialog,
      editScript,
      saveScript,
      runScript,
      viewScript,
      deleteScript,
      changePassword,
      logout,
      navigateTo
    }
  }
}
</script>

<style scoped>
.local-scripts {
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

.output-container {
  height: 400px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: auto;
  background-color: #f5f7fa;
}

.output-content {
  padding: 15px;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.dialog-footer {
  text-align: right;
}
</style>