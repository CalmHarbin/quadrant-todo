<template>
  <div class="completed-detail-modal" :data-theme="isDark ? 'dark' : 'light'" :style="{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }">
    <div class="modal-content" :style="{ backgroundColor: isDark ? '#2a2a2a' : 'white', color: isDark ? '#e0e0e0' : 'inherit' }">
      <div class="modal-header" :style="{
        background: isDark ? 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottomColor: isDark ? '#434343' : '#e8e8e8'
      }">
        <span>📋 已完成待办详情</span>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <div class="modal-body custom-scrollbar">
        <div class="completed-detail-content custom-scrollbar">
          <!-- 调试信息 -->
          <div v-if="!currentMemo" style="padding: 20px; color: red;">
            没有选中的备忘录数据
          </div>
          
          <div v-else>
            <div class="detail-section">
              <h4>标题</h4>
              <p class="detail-title">{{ currentMemo.title || '无标题' }}</p>
            </div>

            <div class="detail-section">
              <h4>象限</h4>
              <span class="quadrant-tag" :class="currentMemo.quadrant">
                {{ getQuadrantName(currentMemo.quadrant) }}
              </span>
            </div>

            <div class="detail-section">
              <h4>完成时间</h4>
              <p class="detail-time">
                {{ formatCompletedTime(currentMemo.completedTime) }}
              </p>
            </div>

            <div class="detail-section" v-if="displayContent || currentMemo.content">
              <h4>内容详情</h4>
              <div
                class="detail-content custom-scrollbar"
                v-html="displayContent || currentMemo.content"
              ></div>
            </div>

            <div class="detail-section" v-if="currentMemo.created">
              <h4>创建时间</h4>
              <p class="detail-created">
                {{ formatCreatedTime(currentMemo.created) }}
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
        <button
          v-if="currentMemo"
          @click="uncompleteTaskFromDetail"
          class="modal-btn warning-btn"
          :style="{
            backgroundColor: isDark ? '#dc3545' : '#dc3545',
            color: '#ffffff',
            borderColor: '#dc3545'
          }"
          @mouseenter="handleDangerButtonHover"
          @mouseleave="handleDangerButtonLeave"
        >
          恢复为未完成
        </button>
      </div>
    </div>
  </div>

  <!-- 图片预览模态框 -->
  <ImagePreviewModal
    v-model:show="showImagePreview"
    :image-src="previewImageSrc"
    :image-alt="previewImageAlt"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
// 导入图片复制工具
import { copyImageToClipboard, addImageCopyFeatures } from '@/utils/imageCopy'
// 导入图片预览组件
import ImagePreviewModal from '@/components/common/ImagePreviewModal.vue'

// 定义props
const props = defineProps<{
  selectedCompletedMemo: any
  getQuadrantName: (quadrant: string) => string
  formatCompletedTime: (timestamp?: number) => string
  formatCreatedTime: (timestamp?: number) => string
}>()

// 定义emits
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'uncomplete', id?: number): void
  (e: 'close'): void
}>()

// 定义model
const showCompletedDetailModal = defineModel<boolean>('showCompletedDetailModal', { required: true })

// 转换后的内容
const processedContent = ref('')

// 本地备忘录数据（用于独立窗口模式）
const selectedCompletedMemo = ref(null)

// 图片预览相关数据
const showImagePreview = ref(false)
const previewImageSrc = ref('')
const previewImageAlt = ref('')

// 主题状态
const isDark = ref(false)

// 转换本地路径为 base64
const convertLocalPathToBase64 = async (content: string): Promise<string> => {
  if (!content || typeof window === 'undefined' || !window.db) {
    return content
  }

  // 匹配本地文件路径
  const localPathRegex = /<img[^>]+src="app:\/\/local-file\/([^"]+)"[^>]*>/g
  let convertedContent = content
  let match

  while ((match = localPathRegex.exec(content)) !== null) {
    const fullMatch = match[0]
    const relativePath = match[1]

    try {
      // 获取图片的 base64 数据
      const result = await window.db.getImageBase64?.(relativePath)

      if (result?.success && result.base64) {
        const newImgTag = fullMatch.replace(
          /src="app:\/\/local-file\/[^"]+"/,
          `src="${result.base64}"`
        )
        convertedContent = convertedContent.replace(fullMatch, newImgTag)
        // 转换图片显示路径
      } else {
        console.warn('详情弹框获取图片 base64 失败:', relativePath, result?.error)
      }
    } catch (error) {
      console.warn('详情弹框获取图片路径失败:', error)
    }
  }

  return convertedContent
}

// 计算属性：处理后的内容
const displayContent = computed(() => {
  return processedContent.value || (selectedCompletedMemo.value as any)?.content || ''
})

// 计算属性：当前备忘录数据
const currentMemo = computed(() => {
  return selectedCompletedMemo.value || props.selectedCompletedMemo
})

// 监听选中的备忘录变化，转换图片路径
watch(() => props.selectedCompletedMemo, async (newMemo) => {
  if (newMemo?.content) {
    try {
      const converted = await convertLocalPathToBase64(newMemo.content)
      processedContent.value = converted
    } catch (error) {
      processedContent.value = newMemo.content
    }
  } else {
    processedContent.value = ''
  }
}, { immediate: true })

// 监听内容变化，重新绑定图片事件
watch(processedContent, () => {
  setTimeout(() => {
    bindImageEvents()
  }, 100)
})

// 打开图片预览
const openImagePreview = (imgSrc: string, imgAlt: string = '') => {
  previewImageSrc.value = imgSrc
  previewImageAlt.value = imgAlt
  showImagePreview.value = true
}

// 关闭图片预览函数已移除，因为未使用

// 危险按钮hover效果处理
const handleDangerButtonHover = (event: MouseEvent) => {
  (event.target as HTMLElement).style.backgroundColor = '#c82333'
}

const handleDangerButtonLeave = (event: MouseEvent) => {
  (event.target as HTMLElement).style.backgroundColor = '#dc3545'
}

// 绑定图片事件
const bindImageEvents = () => {
  const detailContent = document.querySelector('.detail-content')
  if (!detailContent) return

  const images = detailContent.querySelectorAll('img')
  images.forEach((img: HTMLImageElement) => {
    // 添加图片复制功能
    addImageCopyFeatures(img, {
      onSuccess: () => {},
      onError: (error) => console.error('图片复制失败:', error)
    })

    // 添加双击预览事件
    img.addEventListener('dblclick', (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      openImagePreview(img.src, img.alt || '')
    }, true)

    // 添加点击选中事件
    img.onclick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      // 清除其他图片的选中状态
      images.forEach(otherImg => {
        otherImg.style.border = 'none'
      })
      
      // 选中当前图片
      img.style.border = '2px solid #40a9ff'
      
      // 绑定键盘事件
      const handleKeyDown = (e: KeyboardEvent) => {
        // 检测操作系统
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
        
        // Mac使用Cmd+C，Windows/Linux使用Ctrl+C
        const isCopyKey = isMac 
          ? (e.metaKey && e.key === 'c')  // Mac: Cmd+C
          : (e.ctrlKey && e.key === 'c')  // Windows/Linux: Ctrl+C
          
        if (isCopyKey) {
          e.preventDefault()
          copyImageToClipboard(img, {
            onSuccess: () => {},
            onError: (error) => console.error('图片复制失败:', error)
          })
        }
      }
      
      // 点击其他地方取消选中
      const clearSelection = (e: MouseEvent) => {
        if (!img.contains(e.target as Node)) {
          img.style.border = 'none'
          document.removeEventListener('click', clearSelection)
          document.removeEventListener('keydown', handleKeyDown)
        }
      }
      
      setTimeout(() => {
        document.addEventListener('click', clearSelection)
        document.addEventListener('keydown', handleKeyDown)
      }, 100)
    }
  })
}

// 在独立窗口模式下，从 URL 参数获取数据
onMounted(async () => {
  // 初始化主题状态
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
  // 检查是否是独立窗口模式
  const hash = window.location.hash
  if (hash.includes('modal=completed-memo-detail') && hash.includes('data=')) {
    try {
      const dataParam = hash.split('data=')[1]
      const data = JSON.parse(decodeURIComponent(dataParam))
      
      if (data.memo) {
        // 在独立窗口模式下，我们需要直接使用 URL 中的数据
        // 因为 props.selectedCompletedMemo 可能为空
        if (data.memo.content) {
          try {
            const converted = await convertLocalPathToBase64(data.memo.content)
            processedContent.value = converted
          } catch (error) {
            processedContent.value = data.memo.content
          }
        }
        
        // 设置一个临时的备忘录数据用于显示
        if (!props.selectedCompletedMemo) {
          // 创建一个临时的备忘录对象
          const tempMemo = {
            id: data.memo.id,
            title: data.memo.title || '无标题',
            content: data.memo.content || '',
            quadrant: data.memo.quadrant || 'not-urgent-not-important',
            completed: data.memo.completed || false,
            created: data.memo.created || Date.now(),
            completedTime: data.memo.completedTime || Date.now(),
            sortOrder: data.memo.sortOrder || 0
          }
          
          // 直接使用这个临时数据
          selectedCompletedMemo.value = tempMemo as any
        }
      }
    } catch (error) {
      // 如果解析失败，使用原始内容
      if (props.selectedCompletedMemo?.content) {
        processedContent.value = props.selectedCompletedMemo.content
      }
    }
  }
  
  // 等待DOM更新后绑定图片事件
  setTimeout(() => {
    bindImageEvents()
  }, 100)
})

// 处理模态框关闭事件函数已移除，因为未使用

// 关闭模态框
const closeModal = () => {
  // 检查是否是独立窗口模式
  const hash = window.location.hash
  if (hash.includes('modal=completed-memo-detail')) {
    // 独立窗口模式，关闭整个窗口
    if (window.close) {
      window.close()
    }
  } else {
    // 普通模式，只关闭当前模态框
    showCompletedDetailModal.value = false
    // 触发close事件通知父组件
    emit('close')
  }
}

// 从详情页恢复任务
const uncompleteTaskFromDetail = async () => {
  // 在独立窗口模式下，我们需要传递当前备忘录的 ID
  if (currentMemo.value?.id) {
    // 直接在这里处理恢复逻辑，因为独立窗口模式下父组件可能无法正确处理
    try {
      if (typeof window !== 'undefined' && window.db) {
        const result = await window.db.updateMemo(currentMemo.value.id, {
          completed: false,
          completedTime: undefined
        })
        if (result.success) {
          // 任务恢复成功，开始发送刷新通知
          // 通知主窗口刷新数据
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage({ type: 'refreshData' }, '*')
          }
          // 通知已完成待办列表窗口刷新
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage({ type: 'refreshCompletedMemos' }, '*')
          }
          
          // 在普通模式下，也通知父组件刷新已完成待办列表
          if (!window.location.hash.includes('modal=completed-memo-detail')) {
            // 发送自定义事件通知父组件刷新数据
            window.dispatchEvent(new CustomEvent('completedMemoUpdated'))
          } else {
            // 在独立窗口模式下，也尝试发送自定义事件
            // 独立窗口模式，尝试发送自定义事件
            // 尝试向父窗口发送自定义事件
            if (window.opener) {
              try {
                window.opener.dispatchEvent(new CustomEvent('completedMemoUpdated'))
              } catch (e) {
                console.warn('向父窗口发送自定义事件失败:', e)
              }
            }
          }
          
          // 关闭独立窗口
          if (window.close) {
            window.close()
          }
        }
      } else {
        // localStorage 模式
        const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
        const index = savedMemos.findIndex((m: any) => m.id === currentMemo.value.id)
        if (index !== -1) {
          savedMemos[index].completed = false
          delete savedMemos[index].completedTime
          localStorage.setItem('memos', JSON.stringify(savedMemos))
          // localStorage模式任务恢复成功，开始发送刷新通知
          // 通知主窗口刷新数据
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage({ type: 'refreshData' }, '*')
          }
          // 通知已完成待办列表窗口刷新
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage({ type: 'refreshCompletedMemos' }, '*')
          }
          
          // 在普通模式下，也通知父组件刷新已完成待办列表
          if (!window.location.hash.includes('modal=completed-memo-detail')) {
            // 发送自定义事件通知父组件刷新数据
            window.dispatchEvent(new CustomEvent('completedMemoUpdated'))
          } else {
            // 在独立窗口模式下，也尝试发送自定义事件
            // 独立窗口模式，尝试发送自定义事件
            // 尝试向父窗口发送自定义事件
            if (window.opener) {
              try {
                window.opener.dispatchEvent(new CustomEvent('completedMemoUpdated'))
              } catch (e) {
                console.warn('向父窗口发送自定义事件失败:', e)
              }
            }
          }
          
          // 关闭独立窗口
          if (window.close) {
            window.close()
          }
        }
      }
    } catch (error) {
      console.error('恢复任务失败:', error)
      // 如果独立处理失败，回退到原来的方式
      emit('uncomplete', currentMemo.value.id)
      closeModal()
    }
  } else {
    emit('uncomplete')
    closeModal()
  }
}
</script>

<style scoped>
/* 已完成待办详情模态框基础样式 */
.completed-detail-modal {
  width: 100vw;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
}

/* 深色主题支持 */
[data-theme='dark'] .completed-detail-modal {
  background: #1a1a1a;
}

.completed-detail-modal .modal-content {
  width: 100% !important;
  height: 100% !important;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: none !important;
  max-width: none !important;
  margin: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* 深色主题模态框内容 */
[data-theme='dark'] .completed-detail-modal .modal-content {
  background: #2a2a2a;
  color: #e0e0e0;
}

.completed-detail-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 深色主题头部 */
[data-theme='dark'] .completed-detail-modal .modal-header {
  border-bottom-color: #434343;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.completed-detail-modal .modal-header span {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.completed-detail-modal .close-btn {
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

.completed-detail-modal .close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.completed-detail-modal .modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.completed-detail-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

/* 深色主题底部 */
[data-theme='dark'] .completed-detail-modal .modal-footer {
  border-top-color: #434343;
  background: #1f1f1f;
}

.completed-detail-modal .modal-btn {
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
[data-theme='dark'] .completed-detail-modal .modal-btn {
  background: #333;
  border-color: #555;
  color: #e0e0e0;
}

.completed-detail-modal .modal-btn:hover {
  background: #f5f5f5;
  border-color: #007bff;
}

/* 深色主题按钮悬停 */
[data-theme='dark'] .completed-detail-modal .modal-btn:hover {
  background: #444;
  border-color: #007bff;
}

.completed-detail-modal .warning-btn {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: white;
}

.completed-detail-modal .warning-btn:hover {
  background: #ff5252;
  border-color: #ff5252;
}

/* 已完成待办详情内容样式 */
.completed-detail-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
}

/* 使用全局滚动条样式，无需重复定义 */

.detail-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  flex-shrink: 1;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme='dark'] .detail-section h4 {
  color: #bbb;
}

[data-theme='dark'] .detail-section {
  border-bottom-color: #333;
}

.detail-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.4;
}

.detail-time,
.detail-created {
  margin: 0;
  font-size: 14px;
  color: #666;
}

[data-theme='dark'] .detail-time,
[data-theme='dark'] .detail-created {
  color: #bbb;
}

.detail-content {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 20px;
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-color);
  max-height: 400px;
  overflow-y: auto;
  flex-shrink: 1;
}

[data-theme='dark'] .detail-content {
  background: rgba(255, 255, 255, 0.02);
  border-color: #333;
}

.detail-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-content .resizable-image-container {
  display: inline-block;
  margin: 8px 4px;
  border-radius: 4px;
}

.detail-content .resizable-image-container img {
  margin: 0;
  display: block;
}

</style>
