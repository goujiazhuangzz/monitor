<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Python脚本监控工具</h2>
      <el-form :model="loginForm" @submit.native.prevent="handleLogin">
        <el-form-item>
          <el-input 
            v-model="loginForm.username" 
            placeholder="用户名" 
            prefix-icon="el-icon-user"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="密码" 
            prefix-icon="el-icon-lock"
            autocomplete="off"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleLogin" 
            :loading="loading"
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    
    // 响应式数据
    const loading = ref(false)
    const errorMessage = ref('')
    
    const loginForm = reactive({
      username: '',
      password: ''
    })
    
    // 方法定义
    const handleLogin = async () => {
      if (!loginForm.username || !loginForm.password) {
        errorMessage.value = '用户名和密码不能为空'
        return
      }
      
      loading.value = true
      errorMessage.value = ''
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginForm)
        })
        
        const data = await response.json()
        if (data.success) {
          // 登录成功，跳转到SSH连接页面
          router.push('/ssh_connections')
        } else {
          errorMessage.value = data.error || '登录失败'
        }
      } catch (error) {
        errorMessage.value = '网络错误，请稍后重试'
      } finally {
        loading.value = false
      }
    }
    
    // 返回数据和方法
    return {
      // 数据
      loginForm,
      loading,
      errorMessage,
      
      // 方法
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
}

.login-box {
  width: 400px;
  padding: 30px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  text-align: center;
}

.login-box h2 {
  margin-bottom: 30px;
  color: #303133;
}

.error-message {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 10px;
}
</style>