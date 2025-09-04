<template>
  <div class="system-info">
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
        <h3 style="margin-top: 0;">系统信息</h3>
        <div v-if="loading" class="loading">
          <el-progress type="circle" :percentage="0" status="success"></el-progress>
          <span>正在加载系统信息...</span>
        </div>
        <div v-else>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card class="info-card">
                <div slot="header">CPU使用率</div>
                <el-progress 
                  type="circle" 
                  :percentage="cpuPercent" 
                  :status="cpuPercent > 80 ? 'exception' : 'success'"
                  :width="120"
                ></el-progress>
                <p class="progress-text">{{ cpuPercent.toFixed(1) }}%</p>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card class="info-card">
                <div slot="header">内存使用率</div>
                <el-progress 
                  type="circle" 
                  :percentage="memoryPercent" 
                  :status="memoryPercent > 80 ? 'exception' : 'success'"
                  :width="120"
                ></el-progress>
                <p class="progress-text">{{ memoryPercent.toFixed(1) }}%</p>
                <p class="memory-info">
                  {{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryTotal) }}
                </p>
              </el-card>
            </el-col>
          </el-row>
          
          <el-card style="margin-top: 20px;">
            <div slot="header">磁盘使用情况</div>
            <el-table :data="diskInfo" style="width: 100%">
              <el-table-column prop="device" label="设备"></el-table-column>
              <el-table-column prop="mountpoint" label="挂载点"></el-table-column>
              <el-table-column prop="total" label="总容量">
                <template #default="scope">
                  {{ formatBytes(scope.row.total) }}
                </template>
              </el-table-column>
              <el-table-column prop="used" label="已使用">
                <template #default="scope">
                  {{ formatBytes(scope.row.used) }}
                </template>
              </el-table-column>
              <el-table-column prop="free" label="可用空间">
                <template #default="scope">
                  {{ formatBytes(scope.row.free) }}
                </template>
              </el-table-column>
              <el-table-column prop="percent" label="使用率">
                <template #default="scope">
                  <el-progress 
                    :percentage="scope.row.percent" 
                    :status="scope.row.percent > 80 ? 'exception' : 'success'"
                    :show-text="false"
                    style="width: 100%;"
                  ></el-progress>
                  <span>{{ scope.row.percent.toFixed(1) }}%</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-card>
    </div>
    
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'SystemInfo',
  setup() {
    const router = useRouter()
    
    // 响应式数据
    const activeMenu = ref('system')
    const username = ref('admin')
    const showChangePasswordDialog = ref(false)
    const loading = ref(true)
    
    // 系统信息数据
    const cpuPercent = ref(0)
    const memoryPercent = ref(0)
    const memoryTotal = ref(0)
    const memoryUsed = ref(0)
    const memoryFree = ref(0)
    const diskInfo = ref([])
    
    // 表单数据
    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    let refreshInterval = null
    
    // 方法定义
    const loadSystemInfo = async () => {
      try {
        const response = await fetch('/api/system/info')
        const data = await response.json()
        
        if (data.success) {
          const systemInfo = data.system_info
          
          // 更新CPU信息
          cpuPercent.value = systemInfo.cpu.percent
          
          // 更新内存信息
          memoryPercent.value = systemInfo.memory.percent
          memoryTotal.value = systemInfo.memory.total
          memoryUsed.value = systemInfo.memory.used
          memoryFree.value = systemInfo.memory.free
          
          // 更新磁盘信息
          diskInfo.value = systemInfo.disks
        }
        
        loading.value = false
      } catch (error) {
        console.error('加载系统信息失败:', error)
        loading.value = false
      }
    }
    
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
      loadSystemInfo()
      // 每5秒刷新一次系统信息
      refreshInterval = setInterval(loadSystemInfo, 5000)
    })
    
    onUnmounted(() => {
      // 清除定时器
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    })
    
    // 返回数据和方法
    return {
      // 数据
      activeMenu,
      username,
      showChangePasswordDialog,
      loading,
      cpuPercent,
      memoryPercent,
      memoryTotal,
      memoryUsed,
      memoryFree,
      diskInfo,
      passwordForm,
      
      // 方法
      loadSystemInfo,
      formatBytes,
      changePassword,
      logout,
      navigateTo
    }
  }
}
</script>

<style scoped>
.system-info {
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

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading span {
  margin-top: 10px;
  color: #909399;
}

.info-card {
  text-align: center;
}

.progress-text {
  margin-top: 10px;
  font-size: 18px;
  font-weight: bold;
}

.memory-info {
  margin-top: 10px;
  color: #909399;
}

.dialog-footer {
  text-align: right;
}
</style>