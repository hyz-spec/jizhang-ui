<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#4F46E5"/>
            <path d="M24 12V36M12 24H36" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <h1 class="login-title">个人财务管家</h1>
        <p class="login-subtitle">科学管理，智慧生活</p>
      </div>

      <div class="login-tabs">
        <button
          class="login-tab"
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'"
        >登录</button>
        <button
          class="login-tab"
          :class="{ active: activeTab === 'register' }"
          @click="activeTab = 'register'"
        >注册</button>
      </div>

      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="loginForm.username"
            type="text"
            class="input-field"
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="loginForm.password"
            type="password"
            class="input-field"
            placeholder="请输入密码"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <span v-if="loading">登录中...</span>
          <span v-else>登 录</span>
        </button>
      </form>

      <form v-else @submit.prevent="handleRegister" class="login-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="registerForm.username"
            type="text"
            class="input-field"
            placeholder="请输入用户名（3-50个字符）"
            required
            minlength="3"
            maxlength="50"
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="registerForm.password"
            type="password"
            class="input-field"
            placeholder="请输入密码（至少6位）"
            required
            minlength="6"
          />
        </div>
        <div class="form-group">
          <label class="form-label">昵称（选填）</label>
          <input
            v-model="registerForm.nickname"
            type="text"
            class="input-field"
            placeholder="请输入昵称"
          />
        </div>
        <div class="form-group">
          <label class="form-label">邮箱（选填）</label>
          <input
            v-model="registerForm.email"
            type="email"
            class="input-field"
            placeholder="请输入邮箱"
          />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <span v-if="loading">注册中...</span>
          <span v-else>注 册</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authAPI } from '../api/index.js'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('login')
const loading = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  nickname: '',
  email: ''
})

async function handleLogin() {
  loading.value = true
  try {
    const res = await authAPI.login(loginForm.value)
    authStore.setAuth(res.data)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  loading.value = true
  try {
    const res = await authAPI.register(registerForm.value)
    authStore.setAuth(res.data)
    ElMessage.success('注册成功')
    router.push('/')
  } catch (e) {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.login-tabs {
  display: flex;
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 4px;
  margin-bottom: 24px;
}

.login-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.login-tab.active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.login-form {
  margin-top: 16px;
}

.btn-block {
  width: 100%;
  justify-content: center;
  padding: 12px;
  font-size: 15px;
  margin-top: 8px;
}
</style>
