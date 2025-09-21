<template>
  <div class="data-manage-modal" :data-theme="isDark ? 'dark' : 'light'" :style="{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }">
    <div class="modal-content" :style="{ backgroundColor: isDark ? '#2a2a2a' : 'white', color: isDark ? '#e0e0e0' : 'inherit' }">
      <div class="modal-header" :style="{
        background: isDark ? 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottomColor: isDark ? '#434343' : '#e8e8e8'
      }">
        <span>📁 数据管理</span>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="data-manage-content custom-scrollbar">
      <n-space vertical size="large">
        <!-- 数据导出 -->
        <div class="data-section" :style="{ color: isDark ? '#ffffff' : 'inherit' }">
          <h3 :style="{ color: isDark ? '#ffffff' : 'inherit' }">📤 数据导出</h3>
          <p :style="{ color: isDark ? '#e0e0e0' : 'inherit' }">将您的所有 TODO 数据和图片导出为压缩包，完整备份和迁移。</p>
          <n-space>
            <n-button type="primary" @click="exportPackage" :style="{
              color: isDark ? '#ffffff' : '#ffffff',
              fontWeight: '600'
            }">
              📦 导出压缩包
            </n-button>
          </n-space>
        </div>

        <n-divider />

        <!-- 数据导入 -->
        <div class="data-section" :style="{ color: isDark ? '#ffffff' : 'inherit' }">
          <h3 :style="{ color: isDark ? '#ffffff' : 'inherit' }">📥 数据导入</h3>
          <p :style="{ color: isDark ? '#e0e0e0' : 'inherit' }">从压缩包中恢复数据，支持图片恢复。</p>
          <n-space>
            <n-upload
              :show-file-list="false"
              @before-upload="handlePackageUpload"
              accept=".zip,.rar,.7z"
            >
              <n-button type="primary" :style="{
                color: isDark ? '#ffffff' : '#ffffff',
                fontWeight: '600'
              }">📦 导入压缩包</n-button>
            </n-upload>
          </n-space>
        </div>

        <n-divider />

        <!-- 数据统计 -->
        <div class="data-section" :style="{ color: isDark ? '#ffffff' : 'inherit' }">
          <h3 :style="{ color: isDark ? '#ffffff' : 'inherit' }">📊 数据统计</h3>
          <n-space>
            <n-statistic 
              label="总备忘录数" 
              :value="memos?.length || 0" 
              :label-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: '600' }"
              :value-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: 'bold', fontSize: '20px' }"
            />
            <n-statistic
              label="重要且紧急"
              :value="getQuadrantMemos ? getQuadrantMemos('urgent-important').length : 0"
              :label-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: '600' }"
              :value-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: 'bold', fontSize: '20px' }"
            />
            <n-statistic
              label="重要不紧急"
              :value="getQuadrantMemos ? getQuadrantMemos('important-not-urgent').length : 0"
              :label-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: '600' }"
              :value-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: 'bold', fontSize: '20px' }"
            />
            <n-statistic
              label="紧急不重要"
              :value="getQuadrantMemos ? getQuadrantMemos('urgent-not-important').length : 0"
              :label-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: '600' }"
              :value-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: 'bold', fontSize: '20px' }"
            />
            <n-statistic
              label="不重要不紧急"
              :value="getQuadrantMemos ? getQuadrantMemos('not-urgent-not-important').length : 0"
              :label-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: '600' }"
              :value-style="{ color: isDark ? '#ffffff' : 'inherit', fontWeight: 'bold', fontSize: '20px' }"
            />
          </n-space>
        </div>

        <n-divider />

        <!-- 图片清理 -->
        <div class="data-section" :style="{ color: isDark ? '#ffffff' : 'inherit' }">
          <h3 :style="{ color: isDark ? '#ffffff' : 'inherit' }">🖼️ 图片清理</h3>
          <p :style="{ color: isDark ? '#999' : '#666', fontSize: '12px', marginBottom: '8px' }">
            系统每天上午10点自动清理未被使用的图片文件，释放存储空间。启动时也会执行一次清理。
          </p>
          <div :style="{ color: isDark ? '#888' : '#888', fontSize: '11px', marginBottom: '12px' }">
            下次自动清理：{{ nextCleanupTime }}
          </div>
          
          <n-space>
            <n-button @click="() => cleanupUnusedImages(false)" :style="{
              color: isDark ? '#00ff88' : 'inherit',
              borderColor: isDark ? '#00ff88' : 'inherit',
              backgroundColor: isDark ? 'rgba(0, 255, 136, 0.1)' : 'inherit',
              fontWeight: '600'
            }">
              🧹 立即清理
            </n-button>
          </n-space>
        </div>

        <n-divider />

        <!-- 危险操作 -->
        <div class="data-section danger-section" :style="{ color: isDark ? '#ffffff' : 'inherit' }">
          <h3 :style="{ color: isDark ? '#ffffff' : 'inherit' }">⚠️ 危险操作</h3>
          <p :style="{ color: isDark ? '#e0e0e0' : 'inherit' }">请谨慎操作，此操作不可恢夏！</p>
          <n-button type="error" @click="confirmClearData" secondary>
            🗑️ 清空所有数据
          </n-button>
        </div>
      </n-space>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  NSpace, 
  NDivider, 
  NStatistic,
  NUpload,
  NButton,
  type UploadFileInfo
} from 'naive-ui'

// 定义props
const props = defineProps<{
  memos: Array<any>
  getQuadrantMemos: (quadrant: string) => Array<any>
  showMessage?: (message: string, type?: 'success' | 'error' | 'warning') => void
  loadMemos?: () => Promise<void>
}>()

// 主题状态
const isDark = ref(false)

// 自动清理相关状态
const nextCleanupTime = ref('')
let cleanupTimer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null = null

// 调试信息
console.log('DataManageModal - 接收到的memos:', props.memos)
console.log('DataManageModal - memos长度:', props.memos?.length || 0)
console.log('DataManageModal - getQuadrantMemos函数:', typeof props.getQuadrantMemos)

// 定义emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'dataCleared'): void
  (e: 'themeChanged', theme: string): void
}>()

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

// 压缩包导出功能
const exportPackage = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      // 获取主题设置并传递给导出函数
      const theme = localStorage.getItem('theme') || 'light'

      console.log('开始导出压缩包...')
      const result = await window.db.exportPackage(theme)

      if (result.success) {
        console.log('导出成功，数据大小:', result.data?.byteLength, 'bytes')

        // 创建下载链接
        const blob = new Blob([result.data!], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `四象限TODO_完整备份_${new Date().toISOString().split('T')[0]}.zip`
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        props.showMessage?.('压缩包导出成功！', 'success')
      } else {
        props.showMessage?.('导出失败: ' + result.error, 'error')
      }
    } else {
      props.showMessage?.('导出失败', 'error')
    }
  } catch (error) {
    console.error('Export package error:', error)
    props.showMessage?.('导出失败', 'error')
  }
}

// 压缩包导入功能
const importPackage = async (zipData: Uint8Array) => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      const result = await window.db.importPackage(zipData)
      if (result.success) {
        props.showMessage?.(`压缩包导入成功！共导入 ${result.imported} 条记录`, 'success')

        // 应用主题设置
        if (result.theme) {
          localStorage.setItem('theme', result.theme)
          emit('themeChanged', result.theme)
        }

        // 重新加载数据
        if (props.loadMemos) {
          await props.loadMemos()
        }

        // 导入后自动清理无用图片（延迟执行以确保数据已加载）
        setTimeout(async () => {
          try {
            const cleanupResult = await window.db.cleanupUnusedImages()
            if (
              cleanupResult.success &&
              cleanupResult.cleaned &&
              cleanupResult.cleaned > 0
            ) {
              props.showMessage?.(`清理了 ${cleanupResult.cleaned} 个无用图片文件`, 'success')
            }
          } catch (error) {
            console.warn('Auto cleanup after import failed:', error)
          }
        }, 1000)
      } else {
        props.showMessage?.('导入失败: ' + result.error, 'error')
      }
    } else {
      props.showMessage?.('导入失败：文件格式错误', 'error')
    }
  } catch (error) {
    console.error('Import package error:', error)
    props.showMessage?.('导入失败：文件格式错误', 'error')
  }
}

// 处理压缩包上传
const handlePackageUpload = async (data: { file: Required<UploadFileInfo>; fileList: Required<UploadFileInfo>[] }) => {
  const file = data.file.file
  if (!file) return false

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    await importPackage(buffer)
  } catch (error) {
    console.error('Package upload error:', error)
    props.showMessage?.('文件读取失败', 'error')
  }

  return false // 阻止默认上传行为
}

// 清理无用图片
const cleanupUnusedImages = async (silent: boolean = false) => {
  try {
    console.log('开始清理无用图片...')
    if (typeof window !== 'undefined' && window.db) {
      console.log('数据库接口可用，调用清理方法...')
      const result = await window.db.cleanupUnusedImages()
      console.log('清理结果:', result)
      
      if (result.success) {
        if (result.cleaned && result.cleaned > 0) {
          if (!silent) {
            props.showMessage?.(result.message || `清理完成，删除了 ${result.cleaned} 个无用图片`, 'success')
          } else {
            console.log(`静默清理完成，删除了 ${result.cleaned} 个无用图片`)
          }
        } else {
          if (!silent) {
            props.showMessage?.('没有发现无用图片', 'success')
          } else {
            console.log('静默清理：没有发现无用图片')
          }
        }
      } else {
        console.error('清理失败:', result.error)
        if (!silent) {
          props.showMessage?.('清理失败: ' + result.error, 'error')
        }
      }
    } else {
      console.error('数据库接口不可用')
      if (!silent) {
        props.showMessage?.('清理失败: 数据库不可用', 'error')
      }
    }
  } catch (error) {
    console.error('Cleanup images error:', error)
    if (!silent) {
      props.showMessage?.('清理失败: ' + String(error), 'error')
    }
  }
}

// 自动清理相关函数
const startAutoCleanup = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
  }
  
  // 启动时立即执行一次清理
  console.log('启动时执行自动清理...')
  cleanupUnusedImages(true)
  
  // 计算到明天上午10点的时间
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0) // 上午10点
  
  const timeUntil10AM = tomorrow.getTime() - now.getTime()
  
  // 设置定时器，在明天上午10点执行
  cleanupTimer = setTimeout(async () => {
    console.log('执行每日上午10点自动清理...')
    await cleanupUnusedImages(true) // 静默执行
    
    // 设置每天上午10点的重复定时器
    setDailyCleanupTimer()
  }, timeUntil10AM)
  
  updateNextCleanupTime()
}

// 设置每天上午10点的重复定时器
const setDailyCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
  }
  
  // 每24小时执行一次（每天上午10点）
  const intervalMs = 24 * 60 * 60 * 1000
  cleanupTimer = setInterval(async () => {
    console.log('执行每日上午10点自动清理...')
    await cleanupUnusedImages(true) // 静默执行
    updateNextCleanupTime()
  }, intervalMs)
  
  updateNextCleanupTime()
}

const stopAutoCleanup = () => {
  if (cleanupTimer) {
    // 尝试清除setTimeout
    try {
      clearTimeout(cleanupTimer as ReturnType<typeof setTimeout>)
    } catch (e) {
      // 如果失败，尝试清除setInterval
      try {
        clearInterval(cleanupTimer as ReturnType<typeof setInterval>)
      } catch (e) {
        console.warn('Failed to clear timer:', e)
      }
    }
    cleanupTimer = null
  }
  nextCleanupTime.value = ''
}

const updateNextCleanupTime = () => {
  const now = new Date()
  const nextTime = new Date(now)
  
  // 如果当前时间已经过了上午10点，则设置为明天上午10点
  if (now.getHours() >= 10) {
    nextTime.setDate(nextTime.getDate() + 1)
  }
  nextTime.setHours(10, 0, 0, 0) // 上午10点
  
  nextCleanupTime.value = nextTime.toLocaleString('zh-CN')
}

// 清空所有数据
const clearAllData = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      const result = await window.db.clearAllData()
      if (result.success) {
        props.showMessage?.('所有数据已清空', 'success')
        
        // 重新加载数据
        if (props.loadMemos) {
          await props.loadMemos()
        }

        // 重置主题
        emit('themeChanged', 'light')
        
        // 设置标记，表示刚清空了数据
        if (process.env.NODE_ENV === 'development') {
          localStorage.setItem('dataJustCleared', 'true');
        }

        // 通知父组件数据已清空
        emit('dataCleared')
      } else {
        props.showMessage?.('清空失败: ' + result.error, 'error')
      }
    } else {
      // Web 环境
      localStorage.removeItem('memos')
      localStorage.removeItem('theme')
      localStorage.removeItem('completedMemos')
      
      // 重新加载数据
      if (props.loadMemos) {
        await props.loadMemos()
      }
      
      emit('themeChanged', 'light')
      emit('dataCleared')
      props.showMessage?.('所有数据已清空', 'success')
    }
  } catch (error) {
    console.error('Clear all data error:', error)
    props.showMessage?.('清空失败', 'error')
  }
}

// 确认清空数据
const confirmClearData = () => {
  if (
    confirm(
      '警告！此操作将清空所有数据，且不可恢复！\n\n请在操作前先导出数据进行备份。\n\n确定要继续吗？'
    )
  ) {
    clearAllData()
  }
}

// 初始化主题和自动清理
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
  // 启动每日自动清理
  startAutoCleanup()
})

onUnmounted(() => {
  // 清理定时器
  stopAutoCleanup()
})
</script>

<style scoped>
/* 模态框基础样式 - 为独立窗口优化 */
.data-manage-modal {
  width: 100vw;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
}

/* 深色主题支持 */
[data-theme='dark'] .data-manage-modal {
  background: #1a1a1a;
}

.data-manage-modal .modal-content {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 深色主题模态框内容 */
[data-theme='dark'] .data-manage-modal .modal-content {
  background: #2a2a2a;
  color: #e0e0e0;
}

.data-manage-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 深色主题头部 */
[data-theme='dark'] .data-manage-modal .modal-header {
  border-bottom-color: #434343;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.data-manage-modal .modal-header span {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.data-manage-modal .close-btn {
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

.data-manage-modal .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.data-manage-modal .modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.data-manage-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

/* 深色主题底部 */
[data-theme='dark'] .data-manage-modal .modal-footer {
  border-top-color: #434343;
  background: #1f1f1f;
}

.data-manage-modal .modal-btn {
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
[data-theme='dark'] .data-manage-modal .modal-btn {
  background: #333;
  border-color: #555;
  color: #e0e0e0;
}

.data-manage-modal .modal-btn:hover {
  background: #f5f5f5;
  border-color: #007bff;
}

/* 深色主题按钮悬停 */
[data-theme='dark'] .data-manage-modal .modal-btn:hover {
  background: #444;
  border-color: #007bff;
}

/* 数据管理模态框样式 */
.data-manage-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.data-section {
  padding: 16px 0;
}

.data-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* 深色主题标题 */
[data-theme='dark'] .data-section h3 {
  color: #e0e0e0;
}

.data-section p {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

[data-theme='dark'] .data-section p {
  color: #bbb;
}

.danger-section {
  background: rgba(255, 71, 87, 0.05);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 71, 87, 0.2);
  margin-top: 8px;
}

[data-theme='dark'] .danger-section {
  background: rgba(255, 71, 87, 0.1);
  border-color: rgba(255, 71, 87, 0.3);
}

/* 强制覆盖 Naive UI 统计组件的文字颜色 */
.data-manage-modal[data-theme='dark'] .n-statistic .n-statistic-label {
  color: #ffffff !important;
  font-weight: 600 !important;
}

.data-manage-modal[data-theme='dark'] .n-statistic .n-statistic-value {
  color: #ffffff !important;
  font-weight: bold !important;
  font-size: 20px !important;
}

.data-manage-modal[data-theme='dark'] .n-statistic .n-statistic-value .n-statistic-value__content {
  color: #ffffff !important;
  font-weight: bold !important;
  font-size: 20px !important;
}

/* 直接覆盖生效的选择器 */
.data-manage-modal[data-theme='dark'] .n-statistic-value__content {
  color: #ffffff !important;
  font-weight: bold !important;
  font-size: 20px !important;
}

/* 更通用的覆盖选择器 */
.data-manage-modal[data-theme='dark'] .n-statistic .n-statistic-value__content {
  color: #ffffff !important;
  font-weight: bold !important;
  font-size: 20px !important;
}

/* 覆盖所有统计相关的文字 */
.data-manage-modal[data-theme='dark'] .n-statistic * {
  color: #ffffff !important;
}

/* 强制覆盖 Naive UI 按钮组件的文字颜色 */
.data-manage-modal[data-theme='dark'] .n-button {
  color: #ffffff !important;
  border-color: #555555 !important;
}

.data-manage-modal[data-theme='dark'] .n-button--primary-type {
  color: #ffffff !important;
}

.data-manage-modal[data-theme='dark'] .n-button .n-button__content {
  color: #ffffff !important;
}

</style>
