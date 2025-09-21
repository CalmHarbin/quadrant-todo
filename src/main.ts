import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  // 导入通用组件
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  // 导入表单组件
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NCheckbox,
  NButton,
  // 导入布局组件
  NSpace,
  NDivider,
  NStatistic,
  NUpload,
  // 导入主题
  // darkTheme,
  // lightTheme
} from 'naive-ui'
import App from './App.vue'

// TODO: 添加全局样式和字体
import './style.css'

const app = createApp(App)

// 安装 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 全局注册 Naive UI 组件
app.component('NConfigProvider', NConfigProvider)
app.component('NMessageProvider', NMessageProvider)
app.component('NDialogProvider', NDialogProvider)
app.component('NNotificationProvider', NNotificationProvider)
app.component('NForm', NForm)
app.component('NFormItem', NFormItem)
app.component('NInput', NInput)
app.component('NSelect', NSelect)
app.component('NCheckbox', NCheckbox)
app.component('NButton', NButton)
app.component('NSpace', NSpace)
app.component('NDivider', NDivider)
app.component('NStatistic', NStatistic)
app.component('NUpload', NUpload)

// 挂载应用
app.mount('#app')

// TODO: 添加全局错误处理
app.config.errorHandler = (err, _vm, info) => {
  console.error('Global error:', err, info)
}