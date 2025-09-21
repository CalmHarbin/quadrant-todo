<template>
  <div class="drag-help-modal" :data-theme="isDark ? 'dark' : 'light'" :style="{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }">
    <div class="modal-content" :style="{ backgroundColor: isDark ? '#2a2a2a' : 'white', color: isDark ? '#e0e0e0' : 'inherit' }">
      <div class="modal-header" :style="{ 
        background: isDark ? 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottomColor: isDark ? '#434343' : '#e8e8e8'
      }">
        <span>📚 系统功能说明</span>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="drag-help-content custom-scrollbar">
      <div class="help-section">
        <h3>🎯 四象限管理方法</h3>
        <div class="help-scenarios">
          <div class="scenario">
            <div class="scenario-icon">🔥</div>
            <div class="scenario-content">
              <strong>重要且紧急</strong><br />
              需要立即处理的事情，优先级最高
            </div>
          </div>
          <div class="scenario">
            <div class="scenario-icon">📈</div>
            <div class="scenario-content">
              <strong>重要不紧急</strong><br />
              需要规划安排，长期目标和计划
            </div>
          </div>
          <div class="scenario">
            <div class="scenario-icon">⏰</div>
            <div class="scenario-content">
              <strong>紧急不重要</strong><br />
              可以委托或快速处理的事情
            </div>
          </div>
          <div class="scenario">
            <div class="scenario-icon">😴</div>
            <div class="scenario-content">
              <strong>不重要不紧急</strong><br />
              闲时处理或考虑删除的事情
            </div>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h3>⚙️ 基本操作</h3>
        <div class="help-steps">
          <div class="help-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>新增待办</strong><br />
              点击各象限右上角的
              <strong>+</strong> 按钮，填写标题和内容
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>编辑待办</strong><br />
              双击待办卡片即可编辑，支持图片粘贴
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>拖拽排序</strong><br />
              直接拖拽待办卡片可改变顺序或移动到其他象限
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <strong>完成待办</strong><br />
              勾选复选框标记为已完成，24小时后自动归档
            </div>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h3>🚀 高级功能</h3>
        <div class="visual-hints">
          <div class="hint-item">
            <div class="hint-card">📋</div>
            <span
              ><strong>已完成待办：</strong
              >查看和管理已完成的任务，支持恢复和删除</span
            >
          </div>
          <div class="hint-item">
            <div class="hint-card">📁</div>
            <span
              ><strong>数据管理：</strong
              >压缩包导入导出、数据统计和清理</span
            >
          </div>
          <div class="hint-item">
            <div class="hint-card">⚙️</div>
            <span
              ><strong>系统设置：</strong
              >更改数据存储目录和应用配置</span
            >
          </div>
          <div class="hint-item">
            <div class="hint-card">🌙</div>
            <span
              ><strong>主题切换：</strong
              >点击月亮/太阳图标切换深色模式</span
            >
          </div>
          <div class="hint-item">
            <div class="hint-card">🖼️</div>
            <span
              ><strong>图片处理：</strong
              >支持图片预览、调整大小、复制等功能</span
            >
          </div>
          <div class="hint-item">
            <div class="hint-card">🪟</div>
            <span
              ><strong>窗口模式：</strong
              >支持桌面小组件模式和普通窗口模式切换</span
            >
          </div>
        </div>
      </div>

      <div class="help-section">
        <h3>🖼️ 图片处理功能</h3>
        <div class="help-steps">
          <div class="help-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>图片粘贴</strong><br />
              在编辑框中按 Ctrl+V 直接粘贴图片
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>图片调整</strong><br />
              点击图片显示调整手柄，拖拽调整大小（按Shift保持宽高比）
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>图片预览</strong><br />
              双击图片打开全屏预览，支持缩放、拖拽、旋转
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <strong>图片复制</strong><br />
              右键图片可复制到剪贴板
            </div>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h3>🪟 窗口模式功能</h3>
        <div class="help-steps">
          <div class="help-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>桌面小组件模式</strong><br />
              点击右上角"⋯"按钮选择"切换到桌面小组件"
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>固定到桌面</strong><br />
              在小组件模式下可固定到桌面，始终显示
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>窗口折叠</strong><br />
              点击标题栏⬆️按钮可折叠窗口，只显示标题栏
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <strong>快捷键</strong><br />
              Ctrl+Shift+T 恢复隐藏的窗口
            </div>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h3>💾 数据管理功能</h3>
        <div class="help-steps">
          <div class="help-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>压缩包导出</strong><br />
              导出包含数据和图片的完整压缩包
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>压缩包导入</strong><br />
              从压缩包恢复完整数据，包括图片
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>数据统计</strong><br />
              查看各象限待办数量、完成情况等统计信息
            </div>
          </div>
          <div class="help-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <strong>存储目录管理</strong><br />
              自定义数据存储位置，便于备份和迁移
            </div>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h3>实用技巧</h3>
        <ul class="tips-list">
          <li>新增的待办会自动显示在象限顶部</li>
          <li>拖拽时靠近列表边缘会自动滚动</li>
          <li>在待办内容中可以直接粘贴图片</li>
          <li>使用右上角"移动"按钮可快速转移象限</li>
          <li>已完成的待办在页面上显示24小时后自动归档</li>
          <li>支持数据导入导出，方便备份和迁移</li>
          <li>双击图片可全屏预览，支持缩放和拖拽</li>
          <li>桌面小组件模式适合作为桌面便签使用</li>
          <li>窗口可折叠为标题栏，节省桌面空间</li>
          <li>图片支持右键复制，方便在其他应用中使用</li>
        </ul>
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
        }">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 定义emits
const emit = defineEmits<{
  (e: 'close'): void
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

// 监听主题变化
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'theme') {
    isDark.value = e.newValue === 'dark'
  }
}

// 轮询检查主题变化（用于独立窗口模式）
let themeCheckInterval: ReturnType<typeof setInterval> | null = null

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
  // 监听localStorage变化
  window.addEventListener('storage', handleStorageChange)
  
  // 轮询检查主题变化（每500ms检查一次）
  themeCheckInterval = setInterval(() => {
    const currentTheme = localStorage.getItem('theme')
    if (currentTheme === 'dark' && !isDark.value) {
      isDark.value = true
    } else if (currentTheme === 'light' && isDark.value) {
      isDark.value = false
    }
  }, 500)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  if (themeCheckInterval) {
    clearInterval(themeCheckInterval)
  }
})
</script>

<style scoped>
/* 系统功能说明模态框基础样式 */
.drag-help-modal {
  width: 100vw;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
}

/* 暗黑主题样式 - 使用更具体的选择器 */
.drag-help-modal[data-theme='dark'] {
  background: #1a1a1a !important;
}

.drag-help-modal .modal-content {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 深色主题模态框内容 */
.drag-help-modal[data-theme='dark'] .modal-content {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
}

.drag-help-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 深色主题头部 */
.drag-help-modal[data-theme='dark'] .modal-header {
  border-bottom-color: #434343 !important;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
}

.drag-help-modal .modal-header span {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.drag-help-modal .close-btn {
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

.drag-help-modal .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.drag-help-modal .modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.drag-help-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

/* 深色主题底部 */
.drag-help-modal[data-theme='dark'] .modal-footer {
  border-top-color: #434343 !important;
  background: #333333 !important;
}

.drag-help-modal .modal-btn {
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
.drag-help-modal[data-theme='dark'] .modal-btn {
  background: #404040 !important;
  border-color: #555555 !important;
  color: #e0e0e0 !important;
}

.drag-help-modal .modal-btn:hover {
  background: #f5f5f5;
  border-color: #007bff;
}

/* 深色主题按钮悬停 */
.drag-help-modal[data-theme='dark'] .modal-btn:hover {
  background: #555555 !important;
  border-color: #007bff !important;
}

/* 系统功能说明内容样式 */
.drag-help-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  line-height: 1.6;
}

.help-section {
  margin-bottom: 32px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.drag-help-content .help-section:last-child {
  margin-bottom: 0;
}

.help-section h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 2px solid #40a9ff;
  padding-bottom: 12px;
}

.help-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(64, 169, 255, 0.05);
  border-radius: 8px;
  border-left: 4px solid #40a9ff;
}

.step-number {
  background: #40a9ff;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
  font-size: 14px;
}

.help-scenarios {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.scenario {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.scenario-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.scenario-content {
  font-size: 14px;
}

.visual-hints {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.01);
  border-radius: 6px;
}

.hint-indicator {
  width: 60px;
  height: 3px;
  border-radius: 2px;
}

.drop-indicator-demo {
  background: linear-gradient(90deg, #40a9ff, #1890ff);
  animation: pulse 1s ease-in-out infinite alternate;
  box-shadow: 0 0 6px rgba(64, 169, 255, 0.4);
}

.hint-card {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
}

.dragging-demo {
  background: rgba(64, 169, 255, 0.1);
  border: 2px solid #40a9ff;
  opacity: 0.4;
  transform: scale(0.98);
}

.pressed-demo {
  background: rgba(64, 169, 255, 0.15);
  border: 2px solid #40a9ff;
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(64, 169, 255, 0.3);
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  padding-bottom: 0;
}

.tips-list li {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-color);
}

.tips-list li:last-child {
  margin-bottom: 0;
}

.drag-help-modal[data-theme='dark'] .help-step {
  background: rgba(64, 169, 255, 0.1) !important;
}

.drag-help-modal[data-theme='dark'] .scenario {
  background: rgba(255, 255, 255, 0.02) !important;
}

.drag-help-modal[data-theme='dark'] .hint-item {
  background: rgba(255, 255, 255, 0.01) !important;
}

</style>
