<template>
  <!-- 图片预览模态框 -->
  <div 
    v-if="showImagePreview" 
    class="image-preview-overlay"
    @click="closeImagePreview"
  >
    <div class="image-preview-container" @click.stop>
      <!-- 关闭按钮 -->
      <button 
        class="image-preview-close" 
        @click="closeImagePreview"
        title="关闭预览 (ESC)"
      >
        ×
      </button>
      
      <!-- 重置按钮 -->
      <button 
        class="image-preview-reset" 
        @click="resetImageTransform"
        title="重置图片位置和大小"
      >
        ↺
      </button>
      
      <!-- 预览图片 -->
      <img 
        ref="previewImgRef"
        :src="previewImageSrc" 
        :alt="previewImageAlt" 
        class="image-preview-img"
        :style="imageStyle"
        @mousedown="handleImageMouseDown"
        @wheel="handleImageWheel"
        @load="handleImageLoad"
        @contextmenu="handleImageContextMenu"
        draggable="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
// 导入图片复制工具
import { copyImageToClipboard, addImageCopyFeatures } from '@/utils/imageCopy'

// 定义props
const props = defineProps<{
  show: boolean
  imageSrc: string
  imageAlt?: string
}>()

// 定义emits
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

// 图片预览状态
const showImagePreview = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const previewImageSrc = computed(() => props.imageSrc)
const previewImageAlt = computed(() => props.imageAlt || '')

// 图片元素引用
const previewImgRef = ref<HTMLImageElement | null>(null)

// 图片预览交互状态
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const imagePosition = ref({ x: 0, y: 0 })
const imageScale = ref(1)
const imageRotation = ref(0)

// 打开图片预览
const openImagePreview = (_imgSrc: string, _imgAlt: string = '') => {
  showImagePreview.value = true
  // 重置图片变换状态
  imagePosition.value = { x: 0, y: 0 }
  imageScale.value = 1
  imageRotation.value = 0
}

// 关闭图片预览
const closeImagePreview = () => {
  showImagePreview.value = false
  // 重置图片变换状态
  imagePosition.value = { x: 0, y: 0 }
  imageScale.value = 1
  imageRotation.value = 0
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeImagePreview()
  }
}

// 处理图片鼠标按下事件
const handleImageMouseDown = (e: MouseEvent) => {
  if (e.button === 0) { // 左键
    isDragging.value = true
    dragStart.value = {
      x: e.clientX - imagePosition.value.x,
      y: e.clientY - imagePosition.value.y
    }
    e.preventDefault()
  }
}

// 处理全局鼠标移动事件
const handleGlobalMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    imagePosition.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
  }
}

// 处理全局鼠标抬起事件
const handleGlobalMouseUp = () => {
  isDragging.value = false
}

// 处理图片滚轮事件
const handleImageWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(5, imageScale.value * delta))
  
  // 计算鼠标相对于图片的位置
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  // 计算缩放中心点
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  // 计算缩放前后的偏移
  const offsetX = (mouseX - centerX) * (newScale - imageScale.value)
  const offsetY = (mouseY - centerY) * (newScale - imageScale.value)
  
  imageScale.value = newScale
  imagePosition.value = {
    x: imagePosition.value.x - offsetX,
    y: imagePosition.value.y - offsetY
  }
}

// 重置图片变换
const resetImageTransform = () => {
  imagePosition.value = { x: 0, y: 0 }
  imageScale.value = 1
  imageRotation.value = 0
}

// 处理图片加载完成
const handleImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img) {
    // 确保图片以平滑渲染模式显示，保持原图质量
    img.style.imageRendering = 'auto'
    img.style.imageRendering = 'smooth'
    
    // 保持图片原始大小，不进行自动缩放
    // 用户可以手动使用滚轮进行缩放
    imageScale.value = 1
    
    // 为图片添加复制功能
    addImageCopyFeatures(img, {
      showMessage: (_message: string, _type: 'success' | 'error' | 'warning' | 'info') => {
        // 在预览模式下，使用简单的提示方式
        // 显示消息
        // 可以在这里添加更友好的提示，比如toast通知
      },
      onSuccess: () => {},
      onError: (error) => console.error('图片复制失败:', error)
    })
  }
}

// 复制图片方法
const copyImage = async () => {
  if (!previewImgRef.value) return
  
  try {
    await copyImageToClipboard(previewImgRef.value, {
      showMessage: (_message: string, _type: 'success' | 'error' | 'warning' | 'info') => {
        // 显示消息
        // 可以在这里添加更友好的提示
      },
      onSuccess: () => {},
      onError: (error) => console.error('图片复制失败:', error)
    })
  } catch (error) {
    console.error('复制图片失败:', error)
  }
}

// 处理图片右键菜单
const handleImageContextMenu = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  
  // 创建右键菜单
  const contextMenu = document.createElement('div')
  contextMenu.className = 'image-preview-context-menu'
  contextMenu.style.cssText = `
    position: fixed;
    top: ${e.clientY}px;
    left: ${e.clientX}px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 10001;
    padding: 4px 0;
    min-width: 120px;
  `
  
  // 深色主题支持
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    contextMenu.style.background = '#2a2a2a'
    contextMenu.style.borderColor = '#555'
    contextMenu.style.color = '#e0e0e0'
  }
  
  // 添加复制选项
  const copyOption = document.createElement('div')
  copyOption.textContent = '📋 复制图片'
  copyOption.style.cssText = `
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: background-color 0.2s;
  `
  
  // 深色主题文本颜色
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    copyOption.style.color = '#e0e0e0'
  }
  
  copyOption.onmouseover = () => {
    copyOption.style.backgroundColor = '#f5f5f5'
  }
  copyOption.onmouseout = () => {
    copyOption.style.backgroundColor = 'transparent'
  }
  
  // 定义关闭菜单的函数
  const closeMenu = () => {
    if (contextMenu.parentNode) {
      try {
        document.body.removeChild(contextMenu)
      } catch (error) {
        console.warn('移除右键菜单失败:', error)
      }
    }
    document.removeEventListener('click', closeMenu)
  }
  
  copyOption.onclick = async () => {
    await copyImage()
    closeMenu()
  }
  
  contextMenu.appendChild(copyOption)
  document.body.appendChild(contextMenu)
  
  // 点击其他地方关闭菜单
  const handleClickOutside = (e: MouseEvent) => {
    if (!contextMenu.contains(e.target as Node)) {
      closeMenu()
    }
  }
  
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside)
  }, 0)
}

// 计算图片样式 - 使用will-change优化性能
const imageStyle = computed(() => {
  return {
    transform: `translate3d(${imagePosition.value.x}px, ${imagePosition.value.y}px, 0) scale(${imageScale.value}) rotate(${imageRotation.value}deg)`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
    willChange: 'transform',
    transition: isDragging.value ? 'none' : 'transform 0.1s ease-out'
  }
})

// 绑定全局事件
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('mouseup', handleGlobalMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
})

// 暴露方法给父组件
defineExpose({
  openImagePreview,
  closeImagePreview
})
</script>

<style scoped>
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  cursor: pointer;
}

.image-preview-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: default;
  overflow: visible;
  /* 允许图片在整个视窗内移动 */
  pointer-events: none;
}

.image-preview-close {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 20px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10002;
  pointer-events: auto;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.image-preview-reset {
  position: fixed;
  top: 20px;
  right: 60px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10002;
  pointer-events: auto;
}

.image-preview-reset:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.image-preview-copy {
  position: fixed;
  top: 20px;
  right: 100px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10002;
  pointer-events: auto;
}

.image-preview-copy:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.image-preview-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  object-position: center;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  animation: imagePreviewFadeIn 0.3s ease-out;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 硬件加速优化 */
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  /* 只在非拖动状态下使用过渡 */
  transition: transform 0.1s ease-out;
  /* 图片质量优化 - 使用最高质量渲染 */
  image-rendering: high-quality;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: auto;
  -webkit-image-rendering: -webkit-optimize-contrast;
  -webkit-image-rendering: high-quality;
  -moz-image-rendering: auto;
  -ms-image-rendering: auto;
  /* 防止图片被压缩，保持原始尺寸 */
  min-width: auto;
  min-height: auto;
  width: auto;
  height: auto;
  /* 确保图片可以接收鼠标事件 */
  pointer-events: auto;
  position: relative;
  z-index: 10001;
  /* 强制使用GPU加速 */
  will-change: transform;
}

@keyframes imagePreviewFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 暗色主题适配 */
[data-theme='dark'] .image-preview-close,
[data-theme='dark'] .image-preview-reset,
[data-theme='dark'] .image-preview-copy {
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

[data-theme='dark'] .image-preview-close:hover,
[data-theme='dark'] .image-preview-reset:hover,
[data-theme='dark'] .image-preview-copy:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
