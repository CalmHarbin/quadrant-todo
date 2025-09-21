<template>
  <div class="settings-modal" :data-theme="isDark ? 'dark' : 'light'" :style="{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }">
    <div class="modal-content" :style="{ backgroundColor: isDark ? '#2a2a2a' : 'white', color: isDark ? '#e0e0e0' : 'inherit' }">
      <div class="modal-header" :style="{
        background: isDark ? 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottomColor: isDark ? '#434343' : '#e8e8e8'
      }">
        <span>⚙️ 应用设置</span>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="settings-content custom-scrollbar">
          <!-- 版本信息 -->
          <div class="settings-section">
            <h3>📟 版本信息</h3>
            <div class="version-info">
              <p><strong>应用名称：</strong>四象限TODO</p>
              <p><strong>应用版本：</strong>{{ appVersion }}</p>
              <p><strong>构建时间：</strong>{{ buildTime }}</p>
            </div>
          </div>

          <div class="divider"></div>

          <!-- 数据存储目录 -->
          <div class="settings-section">
            <h3>📁 数据存储目录</h3>
            <div class="data-path-section">
              <p><strong>当前目录：</strong></p>
              <div class="current-path">
                <n-input
                  :value="currentDataPath"
                  readonly
                  placeholder="获取中..."
                />
              </div>
              <div class="button-group">
                <n-button @click="selectNewDataDirectory" style="cursor: pointer !important;">
                  📂 选择新目录
                </n-button>
                <n-button
                  @click="openDataDirectory"
                  v-if="currentDataPath"
                  style="cursor: pointer !important;"
                >
                  🖼️ 打开目录
                </n-button>
              </div>
              <p class="setting-description">
                您可以更改数据存储位置，数据将被迁移到新位置。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer" :style="{ 
        backgroundColor: isDark ? '#333333' : '#fafafa',
        borderTopColor: isDark ? '#434343' : '#e8e8e8'
      }">
        <button @click="closeModal" class="modal-btn" :style="{
          backgroundColor: isDark ? '#404040' : '#ffffff',
          color: isDark ? '#e0e0e0' : '#333333',
          borderColor: isDark ? '#555555' : '#d9d9d9'
        }">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NInput } from 'naive-ui'

// 定义props
defineProps<{
  appVersion: string
  buildTime: string
  currentDataPath: string
}>()

// 定义emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'selectDataDirectory'): void
  (e: 'openDataDirectory'): void
}>()

// 主题状态
const isDark = ref(false)

// 关闭模态框
const closeModal = () => {
  // 如果在独立窗口中，直接关闭窗口
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.closeModalWindow()
  } else {
    // 如果在普通页面中，发出关闭事件
    emit('close')
  }
}

// 选择新的数据存储目录
const selectNewDataDirectory = () => {
  emit('selectDataDirectory')
}

// 打开数据存储目录
const openDataDirectory = () => {
  emit('openDataDirectory')
}

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
})
</script>

<style scoped>
/* 模态框基础样式 */
/* 应用设置模态框基础样式 */
.settings-modal {
  width: 100vw;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
}

/* 深色主题支持 */
[data-theme='dark'] .settings-modal {
  background: #1a1a1a;
}

.settings-modal .modal-content {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 深色主题模态框内容 */
[data-theme='dark'] .settings-modal .modal-content {
  background: #2a2a2a;
  color: #e0e0e0;
}

.settings-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 深色主题头部 */
[data-theme='dark'] .settings-modal .modal-header {
  border-bottom-color: #434343;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.settings-modal .modal-header span {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.settings-modal .close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: white;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-modal .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.settings-modal .modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  position: relative;
}

.settings-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

/* 深色主题底部 */
[data-theme='dark'] .settings-modal .modal-footer {
  border-top-color: #434343;
  background: #1f1f1f;
}

.settings-modal .modal-btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

/* 深色主题按钮 */
[data-theme='dark'] .settings-modal .modal-btn {
  background: #333;
  border-color: #555;
  color: #e0e0e0;
}

.settings-modal .modal-btn:hover {
  background: #f5f5f5;
  border-color: #007bff;
}

/* 深色主题按钮悬停 */
[data-theme='dark'] .settings-modal .modal-btn:hover {
  background: #444;
  border-color: #007bff;
}

/* 应用设置内容样式 */
.settings-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  background: white;
}

.settings-section {
  padding: 20px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.version-info {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  font-size: 14px;
  line-height: 1.7;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.version-info::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

[data-theme='dark'] .settings-content {
  background: #2a2a2a;
}

[data-theme='dark'] .version-info {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .data-path-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .settings-section {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .settings-section h3 {
  color: #e2e8f0;
}

[data-theme='dark'] .current-path .n-input {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  color: #e2e8f0 !important;
}

.version-info p {
  margin: 0 0 8px 0;
}

.version-info p:last-child {
  margin-bottom: 0;
}

.data-path-section {
  line-height: 1.7;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.data-path-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
}

.data-path-section p {
  margin: 0 0 16px 0;
  font-size: 14px;
}

/* 分割线样式 */
.divider {
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(102, 126, 234, 0.3) 50%, transparent 100%);
  margin: 24px 0;
  border-radius: 1px;
}

/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
}

.button-group .n-button {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3) !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
}

.button-group .n-button * {
  cursor: pointer !important;
}

/* 确保按钮及其所有子元素都显示小手 */
.button-group .n-button,
.button-group .n-button > *,
.button-group .n-button .n-button__content,
.button-group .n-button .n-button__content > * {
  cursor: pointer !important;
}

.button-group .n-button:hover {
  background: linear-gradient(135deg, #43a3f5 0%, #00e5f2 100%) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4) !important;
  cursor: pointer !important;
}

.current-path {
  margin-bottom: 16px;
  width: 100%;
  box-sizing: border-box;
}

.current-path .n-input {
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(10px) !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

.current-path .n-input:focus {
  border-color: #667eea !important;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
}

.setting-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-top: 8px !important;
}

[data-theme='dark'] .setting-description {
  color: #bbb;
}


/* 响应式设计 */
@media (max-width: 768px) {
  .settings-modal .modal-content {
    width: 95vw;
    min-width: 320px;
    max-width: 95vw;
    height: 90vh;
    max-height: 90vh;
    margin: 5vh auto;
  }
  
  .settings-content {
    padding: 12px 16px;
  }
  
  .settings-section {
    padding: 12px 0;
  }
  
  .settings-modal .modal-header {
    padding: 16px;
  }
  
  .settings-modal .modal-footer {
    padding: 16px;
  }
  
  .button-group {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .settings-modal .modal-content {
    width: 100vw;
    height: 100vh;
    max-height: 100vh;
    margin: 0;
    border-radius: 0;
  }
  
  .settings-modal .modal-header {
    border-radius: 0;
  }
  
  .settings-modal .modal-footer {
    border-radius: 0;
  }
}
</style>
