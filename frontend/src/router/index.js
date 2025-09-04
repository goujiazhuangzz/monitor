import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import SSHConnections from '../views/SSHConnections.vue'
import SystemInfo from '../views/SystemInfo.vue'
import LocalScripts from '../views/LocalScripts.vue'
import ConfigManager from '../views/ConfigManager.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/ssh_connections',
    name: 'SSHConnections',
    component: SSHConnections
  },
  {
    path: '/system_info',
    name: 'SystemInfo',
    component: SystemInfo
  },
  {
    path: '/local_scripts',
    name: 'LocalScripts',
    component: LocalScripts
  },
  {
    path: '/config_manager',
    name: 'ConfigManager',
    component: ConfigManager
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 添加路由守卫
router.beforeEach((to, from, next) => {
  // 如果访问的不是登录页，则检查是否已登录
  if (to.path !== '/login') {
    // 这里应该检查用户是否已登录（例如检查cookie或localStorage）
    // 为简化起见，我们暂时跳过这个检查
    next()
  } else {
    next() // 访问登录页，直接放行
  }
})

export default router