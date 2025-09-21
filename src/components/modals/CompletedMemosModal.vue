<template>
  <div class="completed-memos-modal" :data-theme="isDark ? 'dark' : 'light'" :style="{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }">
    <div class="modal-content" :style="{ backgroundColor: isDark ? '#2a2a2a' : 'white', color: isDark ? '#e0e0e0' : 'inherit' }">
      <div class="modal-header" :style="{
        background: isDark ? 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottomColor: isDark ? '#434343' : '#e8e8e8'
      }">
        <span>📋 已完成的待办</span>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="modal-body custom-scrollbar">
        <div class="completed-memo-content custom-scrollbar">
      <div v-if="dynamicCompletedMemos.length === 0" class="empty-state">
        <div class="empty-icon">✓</div>
        <p>还没有已完成的待办</p>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">数据数量: {{ dynamicCompletedMemos.length }}</p>
      </div>
      <div v-else class="completed-memo-list custom-scrollbar">
        <div
          v-for="memo in dynamicCompletedMemos"
          :key="memo.id"
          class="completed-memo-item"
          @dblclick="viewCompletedMemoDetail(memo)"
        >
          <div class="completed-memo-header">
            <div class="completed-memo-title">{{ memo.title }}</div>
            <div class="completed-memo-meta">
              <span class="quadrant-tag" :class="memo.quadrant">{{
                getQuadrantName(memo.quadrant)
              }}</span>
              <span class="completed-time">{{
                formatCompletedTime(memo.completedTime)
              }}</span>
            </div>
          </div>
          <div class="completed-memo-actions">
            <n-button
              size="small"
              @click="uncompleteTask(memo.id)"
              type="warning"
              secondary
            >
              恢复
            </n-button>
            <n-button
              size="small"
              @click="deleteCompletedMemo(memo.id)"
              type="error"
              secondary
            >
              删除
            </n-button>
          </div>
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
        <button
          v-if="dynamicCompletedMemos.length > 0"
          @click="clearCompletedMemos"
          class="error-btn"
          :style="{
            backgroundColor: isDark ? '#dc3545' : '#dc3545',
            color: '#ffffff',
            borderColor: '#dc3545'
          }"
          @mouseenter="handleDangerButtonHover"
          @mouseleave="handleDangerButtonLeave"
        >
          清空已完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

// 定义props
const props = defineProps<{
  completedMemos: Array<any>
  getQuadrantName: (quadrant: string) => string
  formatCompletedTime: (timestamp?: number) => string
  getCompletedMemos?: () => Array<any>
}>()

// 定义emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'viewDetail', memo: any): void
  (e: 'uncomplete', id: number): void
  (e: 'delete', id: number): void
  (e: 'clearCompleted'): void
}>()

// 主题状态
const isDark = ref(false)

// 动态获取已完成待办列表
const dynamicCompletedMemos = computed(() => {
  // 检查是否是独立窗口模式
  const hash = window.location.hash
  
  if (hash.includes('modal=completed-memos')) {
    // 独立窗口模式，优先使用本地数据，如果没有则尝试解析URL参数
    if (localCompletedMemos.value && localCompletedMemos.value.length > 0) {
      // 独立窗口模式 - 使用localCompletedMemos.value
      return localCompletedMemos.value
    }
    
    // 尝试从URL参数获取数据
    try {
      const urlParams = new URLSearchParams(hash.substring(1))
      const dataParam = urlParams.get('data')
      
      if (dataParam) {
        const data = JSON.parse(decodeURIComponent(dataParam))
        if (data.completedMemos && data.completedMemos.length > 0) {
          // 独立窗口模式 - 从URL解析数据
          return data.completedMemos
        }
      }
    } catch (error) {
      console.error('解析URL参数失败:', error)
    }
    
    // 独立窗口模式 - 返回空数组
    return []
  }
  
  // 普通模式，使用 props 数据
  if (props.getCompletedMemos) {
    const result = props.getCompletedMemos()
    // 普通模式 - getCompletedMemos()结果
    return result
  }
  return props.completedMemos || []
})

// 本地已完成待办列表（用于独立窗口模式）
const localCompletedMemos = ref<Array<any>>([])

// 监听窗口消息，用于独立窗口模式
const handleMessage = (event: MessageEvent) => {
  // CompletedMemosModal 接收到消息
  if (event.data && event.data.type === 'refreshCompletedMemos') {
    // 接收到刷新已完成待办列表的通知
    // 重新获取已完成待办列表
    if (props.getCompletedMemos) {
      localCompletedMemos.value = props.getCompletedMemos()
      // 刷新后的已完成待办数量
    } else {
      // 如果没有 getCompletedMemos 函数，尝试从主窗口获取数据
      if (window.opener && window.opener.postMessage) {
        window.opener.postMessage({ type: 'getCompletedMemos' }, '*')
      }
    }
  } else if (event.data && event.data.type === 'completedMemosData') {
    // 接收到主窗口返回的已完成待办数据
    localCompletedMemos.value = event.data.completedMemos || []
  }
}

// 在独立窗口模式下，从 URL 参数获取数据
onMounted(() => {
  // 初始化主题状态
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
  // 检查是否是独立窗口模式
  const hash = window.location.hash
  // CompletedMemosModal onMounted
  
  if (hash.includes('modal=completed-memos')) {
    // 独立窗口模式，开始解析数据
    // 添加消息监听器
    window.addEventListener('message', handleMessage)
    
    // 从 URL 参数获取数据
    try {
      // 解析 hash 中的参数
      const hashContent = hash.substring(1) // 移除 #
      console.log('hash内容:', hashContent)
      
      // 查找 data 参数
      const dataMatch = hashContent.match(/data=([^&]*)/)
      console.log('dataMatch:', dataMatch)
      
      if (dataMatch && dataMatch[1]) {
        const dataParam = decodeURIComponent(dataMatch[1])
        console.log('解码后的dataParam:', dataParam)
        
        const data = JSON.parse(dataParam)
        console.log('解析后的数据:', data)
        console.log('数据中的completedMemos长度:', data.completedMemos?.length || 0)
        
        if (data.completedMemos) {
          localCompletedMemos.value = data.completedMemos
          console.log('成功设置localCompletedMemos，长度:', localCompletedMemos.value.length)
        }
      } else {
        console.log('未找到data参数')
      }
    } catch (error) {
      console.error('解析已完成待办数据失败:', error)
    }
    
    // 如果 URL 数据不可用，尝试使用 props
    if (localCompletedMemos.value.length === 0 && props.getCompletedMemos) {
      console.log('URL数据为空，尝试使用props数据')
      localCompletedMemos.value = props.getCompletedMemos()
    }
  }
  
  // 添加自定义事件监听器，用于监听任务状态变化
  window.addEventListener('completedMemoUpdated', handleCompletedMemoUpdate)
  
  console.log('最终localCompletedMemos长度:', localCompletedMemos.value.length)
  console.log('最终dynamicCompletedMemos长度:', dynamicCompletedMemos.value.length)
})

// 处理已完成待办更新事件
const handleCompletedMemoUpdate = () => {
  console.log('处理已完成待办更新事件')
  // 重新获取已完成待办列表
  if (props.getCompletedMemos) {
    const newMemos = props.getCompletedMemos()
    localCompletedMemos.value = newMemos
    console.log('更新后的已完成待办数量:', newMemos.length)
  }
}

// 组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  window.removeEventListener('completedMemoUpdated', handleCompletedMemoUpdate)
  console.log('清理事件监听器')
})

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

// 查看已完成待办详情
const viewCompletedMemoDetail = (memo: any) => {
  emit('viewDetail', memo)
}

// 恢复任务为未完成状态
const uncompleteTask = (id: number) => {
  emit('uncomplete', id)
}

// 删除已完成的待办
const deleteCompletedMemo = (id: number) => {
  emit('delete', id)
}

// 清空所有已完成的待办
const clearCompletedMemos = () => {
  emit('clearCompleted')
}

// 危险按钮hover效果处理
const handleDangerButtonHover = (event: MouseEvent) => {
  (event.target as HTMLElement).style.backgroundColor = '#c82333'
}

const handleDangerButtonLeave = (event: MouseEvent) => {
  (event.target as HTMLElement).style.backgroundColor = '#dc3545'
}
</script>

<style scoped>
/* 已完成待办模态框基础样式 */
.completed-memos-modal {
  width: 100vw;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
}

/* 深色主题支持 */
[data-theme='dark'] .completed-memos-modal {
  background: #1a1a1a;
}

.completed-memos-modal .modal-content {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 深色主题模态框内容 */
[data-theme='dark'] .completed-memos-modal .modal-content {
  background: #2a2a2a;
  color: #e0e0e0;
}

.completed-memos-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 深色主题头部 */
[data-theme='dark'] .completed-memos-modal .modal-header {
  border-bottom-color: #434343;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.completed-memos-modal .modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.completed-memos-modal .modal-header span {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.completed-memos-modal .close-btn {
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

.completed-memos-modal .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.completed-memos-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

/* 深色主题底部 */
[data-theme='dark'] .completed-memos-modal .modal-footer {
  border-top-color: #434343;
  background: #1f1f1f;
}

.completed-memos-modal .modal-btn {
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
[data-theme='dark'] .completed-memos-modal .modal-btn {
  background: #333;
  border-color: #555;
  color: #e0e0e0;
}

.completed-memos-modal .modal-btn:hover {
  background: #f5f5f5;
  border-color: #007bff;
}

/* 深色主题按钮悬停 */
[data-theme='dark'] .completed-memos-modal .modal-btn:hover {
  background: #444;
  border-color: #007bff;
}

.error-btn {
  padding: 8px 16px;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  background: #ff4d4f;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.error-btn:hover {
  background: #ff7875;
  border-color: #ff7875;
}

/* 已完成待办内容样式 */
.completed-memo-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.completed-memo-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  margin: 0;
}

.completed-memo-item {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.completed-memo-item:last-child {
  margin-bottom: 0;
}

.completed-memo-item:hover {
  background: rgba(255, 255, 255, 0.9);
}

[data-theme='dark'] .completed-memo-item {
  background: rgba(60, 60, 60, 0.8);
  border-color: #434343;
}

[data-theme='dark'] .completed-memo-item:hover {
  background: rgba(60, 60, 60, 0.9);
}

.completed-memo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.completed-memo-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-color);
  text-decoration: line-through;
  opacity: 0.8;
  flex: 1;
  margin-right: 12px;
  line-height: 1.4;
}

.completed-memo-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.completed-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.quadrant-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
}

.quadrant-tag.urgent-important {
  background: #ff4757;
}

.quadrant-tag.important-not-urgent {
  background: #3742fa;
}

.quadrant-tag.urgent-not-important {
  background: #ffa502;
}

.quadrant-tag.not-urgent-not-important {
  background: #2ed573;
}

.completed-memo-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.completed-memo-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.completed-memo-item:hover {
  background: rgba(255, 255, 255, 0.95) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

[data-theme='dark'] .completed-memo-item:hover {
  background: rgba(60, 60, 60, 0.95) !important;
}

</style>
