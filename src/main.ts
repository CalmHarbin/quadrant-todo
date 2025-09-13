import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  // 导入通用组件
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  // 导入主题
  darkTheme,
  lightTheme
} from 'naive-ui'
import App from './App.vue'

// TODO: 添加全局样式和字体
import './style.css'

const app = createApp(App)

// 安装 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 挂载应用
app.mount('#app')

// TODO: 添加全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err, info)
}