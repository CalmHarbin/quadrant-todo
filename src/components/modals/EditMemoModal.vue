<template>
  <!-- 独立窗口模式：直接显示内容 -->
  <div class="edit-memo-modal" :data-theme="isDark ? 'dark' : 'light'">
    <div class="modal-header">
      <h3>{{ isEditing ? '编辑备忘录' : '新增备忘录' }}</h3>
      <button class="close-btn" @click="handleClose">×</button>
    </div>

    <div class="modal-content custom-scrollbar">
      <n-form ref="formRef" :model="currentMemo" :rules="formRules" style="display: flex; flex-direction: column; flex: 1;">
        <div class="form-item">
          <label class="form-label">标题 <span class="required-asterisk">*</span></label>
          <input
            v-model="currentMemo.title"
            type="text"
            class="form-input"
            placeholder="请输入标题（最多50个字符）"
            maxlength="50"
          />
          <div class="char-count">{{ currentMemo.title.length }}/50</div>
        </div>

        <n-form-item label="象限" path="quadrant" v-if="isEditing">
          <n-select
            v-model:value="currentMemo.quadrant"
            :options="quadrantOptions"
            placeholder="选择象限"
          />
        </n-form-item>

        <n-form-item label="内容" path="content" style="flex: 1; display: flex; flex-direction: column;">
          <div class="rich-editor-container">
            <div
              ref="editorRef"
              class="rich-editor custom-scrollbar"
              contenteditable="true"
              @input="handleEditorInput"
              @paste="handlePaste"
              @focus="handleEditorFocus"
              @keyup="handleEditorInput"
              @blur="handleEditorInput"
              placeholder="请输入内容..."
            ></div>
            <div class="editor-toolbar">
              <small>支持直接粘贴图片，图片将保存在本地</small>
            </div>
          </div>
        </n-form-item>
      </n-form>
    </div>

    <div class="modal-footer">
      <button class="btn btn-cancel" @click="handleClose">取消</button>
      <button class="btn btn-primary" @click="saveMemo">
        {{ isEditing ? '更新' : '保存' }}
      </button>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { 
  NForm, 
  NFormItem, 
  NSelect 
} from 'naive-ui'
// 导入图片复制工具
import { copyImageToClipboard, addImageContextMenu } from '@/utils/imageCopy'
// 导入图片预览组件
import ImagePreviewModal from '@/components/common/ImagePreviewModal.vue'

// 定义Memo接口
interface Memo {
  id?: number
  title: string
  content: string
  quadrant: string
  created?: number
  completed?: boolean
  completedTime?: number
  sortOrder?: number
}

// 定义props
const props = defineProps<{
  isEditing: boolean
  quadrantOptions: Array<{ label: string; value: string }>
}>()

// 定义emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'editorInput', event: Event): void
  (e: 'paste', event: ClipboardEvent): void
  (e: 'editorFocus'): void
}>()

// 定义响应式数据
const currentMemo = defineModel<any>('currentMemo', { required: true })
const formRef = ref()
const editorRef = ref<HTMLElement | null>(null)

// 新增：待办相关的响应式数据
const memos = ref<Memo[]>([])

// 图片预览相关数据
const showImagePreview = ref(false)
const previewImageSrc = ref('')
const previewImageAlt = ref('')

// 主题状态 - 从主应用同步
const isDark = ref(false)

// 立即检查当前主题
const checkTheme = () => {
  const currentTheme = localStorage.getItem('theme')
  const newIsDark = currentTheme === 'dark'
  if (isDark.value !== newIsDark) {
    isDark.value = newIsDark
    // 主题已更改
    // 强制重新渲染
    nextTick(() => {
      // 触发重新渲染
      const modal = document.querySelector('.edit-memo-modal')
      if (modal) {
        modal.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
      }
    })
  }
}

// 计算属性：获取正确的编辑状态
const isEditing = computed(() => {
  // 从URL参数中获取isEditing状态
  const hash = window.location.hash
  if (hash.includes('data=')) {
    try {
      const dataParam = hash.split('data=')[1]
      const data = JSON.parse(decodeURIComponent(dataParam))
      return data.isEditing || false
    } catch (error) {
      console.error('解析URL参数失败:', error)
    }
  }
  // 回退到props
  return props.isEditing
})

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { max: 50, message: '标题不能超过50个字符', trigger: 'blur' }
  ],
  quadrant: [{ required: true, message: '请选择象限', trigger: 'change' }]
}

// 处理编辑器输入事件
const handleEditorInput = (event: Event) => {
  // 检查是否有文字插入到图片容器内部
  const target = event.target as HTMLElement
  if (target && target.closest('.resizable-image-container')) {
    // 如果文字插入到了图片容器内部，将其移出
    const imgContainer = target.closest('.resizable-image-container') as HTMLElement
    if (imgContainer) {
      // 获取容器内的所有文本节点
      const textNodes: Text[] = []
      const walker = document.createTreeWalker(
        imgContainer,
        NodeFilter.SHOW_TEXT
      )
      
      let node
      while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.trim()) {
          textNodes.push(node as Text)
        }
      }
      
      // 将文本节点移出容器
      textNodes.forEach(textNode => {
        const text = textNode.textContent
        if (text && text.trim()) {
          // 在容器后创建新的文本节点
          const newTextNode = document.createTextNode(text)
          imgContainer.parentNode?.insertBefore(newTextNode, imgContainer.nextSibling)
          // 删除原文本节点
          textNode.remove()
        }
      })
      
      // 将光标定位到容器后面
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.setStartAfter(imgContainer)
        range.setEndAfter(imgContainer)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }
  
  // 只在特定情况下重新定位光标（避免过度干预）
  if (editorRef.value) {
    const imgContainers = editorRef.value.querySelectorAll('.resizable-image-container')
    if (imgContainers.length > 0) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const currentRange = selection.getRangeAt(0)
        const currentContainer = (currentRange.commonAncestorContainer as Element)?.closest?.('.resizable-image-container')
        
        // 只有当光标在图片容器内部时才重新定位
        if (currentContainer) {
          const lastContainer = imgContainers[imgContainers.length - 1]
          const range = document.createRange()
          // 查找最后一个图片容器后的合适位置
          let nextNode = lastContainer.nextSibling
          while (nextNode && nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent?.trim() === '') {
            nextNode = nextNode.nextSibling
          }
          
          if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE && nextNode.nodeName === 'BR') {
            range.setStartAfter(nextNode)
            range.setEndAfter(nextNode)
          } else if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
            range.setStart(nextNode, 0)
            range.setEnd(nextNode, 0)
          } else {
            // 在最后一个图片容器后创建新的文本节点
            const textNode = document.createTextNode('')
            lastContainer.parentNode?.insertBefore(textNode, lastContainer.nextSibling)
            range.setStart(textNode, 0)
            range.setEnd(textNode, 0)
          }
          
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    }
  }
  
  emit('editorInput', event)
}

// 处理粘贴事件
const handlePaste = async (event: ClipboardEvent) => {
  await handlePasteInStandalone(event)
}

// 独立窗口模式下的粘贴处理
const handlePasteInStandalone = async (event: ClipboardEvent) => {
  event.preventDefault()

  const items = event.clipboardData?.items
  if (!items) {
    return
  }

  // 处理所有项目，包括图片和文本
  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (item.type.indexOf('image') !== -1) {
      // 处理图片
      const file = item.getAsFile()
      if (file) {
        try {
          const imageUrl = await saveImageToLocal(file)
          await insertImageToEditor(imageUrl)
        } catch (error) {
          // 图片保存失败，忽略
        }
      }
    } else if (item.type === 'text/plain') {
      // 处理文本
      const textContent = await new Promise<string>((resolve) => {
        item.getAsString(resolve)
      })
      
      // 插入文本
      if (textContent) {
        insertTextToEditor(textContent)
      }
    }
  }
}

// 处理编辑器获得焦点
const handleEditorFocus = () => {
  emit('editorFocus')
}

// 关闭模态框
const handleClose = () => {
  // 直接关闭独立窗口
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.closeModalWindow()
  } else {
    // 发出关闭事件
    emit('close')
  }
}

// 打开图片预览
const openImagePreview = (imgSrc: string, imgAlt: string = '') => {
  previewImageSrc.value = imgSrc
  previewImageAlt.value = imgAlt
  showImagePreview.value = true
}

// 关闭图片预览
const closeImagePreview = () => {
  showImagePreview.value = false
  previewImageSrc.value = ''
  previewImageAlt.value = ''
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showImagePreview.value) {
    closeImagePreview()
  }
}

// 新增待办
const openAddModal = (quadrant: string) => {
  Object.assign(currentMemo.value, {
    id: undefined,
    title: '',
    content: '',
    quadrant: quadrant,
    completed: false
  })
}

// 打开编辑模态框
const openEditModal = async (memo: Memo) => {
  Object.assign(currentMemo.value, {
    id: memo.id,
    title: memo.title,
    content: memo.content,
    quadrant: memo.quadrant,
    completed: memo.completed || false
  })
  
  // 设置编辑器内容
  setTimeout(async () => {
    if (editorRef.value) {
      await setEditorContent(memo.content || '')
    }
  }, 100)
}

// 重新整理象限备忘录排序，确保新增的在最前面
const reorderQuadrantMemos = async (quadrant: string, newMemoId?: number) => {
  const quadrantMemos = memos.value.filter((memo) => memo.quadrant === quadrant)
  const newOrder: { id: number; sortOrder: number }[] = []

  let orderCounter = 0

  // 如果有新增的备忘录，先处理它
  if (newMemoId) {
    newOrder.push({ id: newMemoId, sortOrder: orderCounter++ })
  }

  // 处理其他备忘录
  for (const memo of quadrantMemos) {
    if (memo.id !== newMemoId) {
      newOrder.push({ id: memo.id!, sortOrder: orderCounter++ })
    }
  }

  // 更新排序
  for (const orderItem of newOrder) {
    const memo = memos.value.find((m) => m.id === orderItem.id)
    if (memo) {
      memo.sortOrder = orderItem.sortOrder
    }
  }

  // 保存到数据库
  await saveMemos()
}

// 保存所有待办数据
const saveMemos = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      // 使用 window.db 更新每个备忘录
      for (const memo of memos.value) {
        await window.db.updateMemo(memo.id!, {
          quadrant: memo.quadrant,
          sortOrder: memo.sortOrder
        })
      }
      // 数据保存成功
    } else {
      // 使用 localStorage 保存
      localStorage.setItem('memos', JSON.stringify(memos.value))
      // 数据保存到 localStorage 成功
    }
  } catch (error) {
    console.error('Save memos error:', error)
  }
}

// 保存备忘录
const saveMemo = async () => {
  try {
    // 表单验证
    await formRef.value?.validate()
    
    // 从URL参数中获取isEditing状态
    let isEditingState = props.isEditing
    const hash = window.location.hash
    if (hash.includes('data=')) {
      try {
        const dataParam = hash.split('data=')[1]
        const data = JSON.parse(decodeURIComponent(dataParam))
        isEditingState = data.isEditing || false
        // 从URL获取isEditing状态
      } catch (error) {
        console.error('解析URL参数失败:', error)
      }
    }
    
    // 更新内容
    currentMemo.value.content = editorRef.value?.innerHTML || ''
    
    // 执行保存逻辑
    await performSave(currentMemo.value, isEditingState)
    
    // 通知主窗口刷新数据并关闭
    if (typeof window !== 'undefined' && window.opener) {
      window.opener.postMessage({ type: 'refreshData' }, '*')
    }
    handleClose()
  } catch (error) {
    // 表单验证失败
  }
}

// 执行保存逻辑
const performSave = async (memoData: Memo, editingState: boolean) => {
  try {
    // 执行保存逻辑
    
    if (typeof window !== 'undefined' && window.db) {
      // Electron 环境
      if (editingState && memoData.id) {
        const result = await window.db.updateMemo(memoData.id, {
          title: memoData.title,
          content: memoData.content,
          quadrant: memoData.quadrant
        })

        if (result.success) {
          // 更新成功
          await loadMemos()
        } else {
          console.error('更新失败: ' + result.error)
        }
      } else {
        // 新增备忘录时，设置 sortOrder 为 0，让它显示在最前面
        const result = await window.db.addMemo({
          title: memoData.title,
          content: memoData.content,
          quadrant: memoData.quadrant
        })

        if (result.success && result.id) {
          // 新增成功后，重新整理该象限的排序，让新的在最前面
          await reorderQuadrantMemos(memoData.quadrant, result.id)
          // 保存成功
          await loadMemos()
        } else {
          console.error('保存失败: ' + result.error)
        }
      }
    } else {
      // Web 环境
      if (editingState && memoData.id) {
        // 更新
        const memoIndex = memos.value.findIndex(m => m.id === memoData.id)
        if (memoIndex !== -1) {
          memos.value[memoIndex] = { ...memos.value[memoIndex], ...memoData }
          localStorage.setItem('memos', JSON.stringify(memos.value))
          await loadMemos()
        }
      } else {
        // 新增
        const newMemoId = Date.now()
        const newMemo = {
          ...memoData,
          id: newMemoId,
          created: Date.now(),
          sortOrder: 0 // 新增的备忘录设置为最高优先级
        }
        memos.value.push(newMemo)
        localStorage.setItem('memos', JSON.stringify(memos.value))

        // 重新整理该象限的排序
        await reorderQuadrantMemos(memoData.quadrant, newMemoId)
        // 保存成功
        await loadMemos()
      }
    }
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 加载待办数据
const loadMemos = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      // Electron 环境
      const result = await window.db.getMemos()
      if (result.success) {
        memos.value = result.data || []
      } else {
        console.error('加载数据失败:', result.error)
        memos.value = []
      }
    } else {
      // Web 环境
      const saved = localStorage.getItem('memos')
      if (saved) {
        try {
          memos.value = JSON.parse(saved)
        } catch (error) {
          console.error('解析本地数据失败:', error)
          memos.value = []
        }
      } else {
        memos.value = []
      }
    }
  } catch (error) {
    console.error('Load memos error:', error)
    memos.value = []
  }
}

// 保存图片到本地
const saveImageToLocal = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      // 图片读取完成

      // 如果在 Electron 环境中，尝试使用文件系统存储
      if (typeof window !== 'undefined' && window.db && window.db.saveImage) {
        try {
          // 传递文件名以确保正确的文件扩展名
          const result = await window.db.saveImage(base64, file.name)
          // 文件系统保存结果
          if (result.success) {
            // 返回完整的本地文件路径
            const localPath = `app://local-file/${result.path}`
            resolve(localPath)
          } else {
            // 文件系统保存失败，使用 base64
            resolve(base64)
          }
        } catch (error) {
          console.warn('文件系统保存失败，使用 base64:', error)
          resolve(base64)
        }
      } else {
        // Web 环境，直接使用 base64
        resolve(base64)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

// 插入图片到编辑器
const insertImageToEditor = async (imageUrl: string) => {
  if (!editorRef.value) return

  // 插入图片到编辑器

  // 如果是本地路径，转换为 base64 用于显示
  let displayUrl = imageUrl
  if (
    imageUrl.startsWith('app://local-file/') &&
    typeof window !== 'undefined' &&
    window.db?.getImageBase64
  ) {
    try {
      const relativePath = imageUrl.replace('app://local-file/', '')
      const result = await window.db.getImageBase64(relativePath)
      if (result.success && result.base64) {
        displayUrl = result.base64
        // 转换本地路径为 base64 显示
      } else {
        // 如果转换失败，尝试直接使用原路径
        displayUrl = imageUrl
        // 使用原始路径显示
      }
    } catch (error) {
      console.warn('无法获取图片 base64，使用原路径:', error)
      // 如果转换失败，尝试直接使用原路径
      displayUrl = imageUrl
    }
  } else if (imageUrl.startsWith('data:image/')) {
    // 如果已经是 base64 格式，直接使用
    displayUrl = imageUrl
    // 使用 base64 格式图片
  } else {
    // 其他情况，尝试直接使用
    displayUrl = imageUrl
    // 使用原始图片路径
  }

  // 创建独立的图片容器span
  const imgContainer = document.createElement('span')
  imgContainer.className = 'resizable-image-container'
  imgContainer.style.cssText = `
    position: relative;
    display: inline-block;
    margin: 0 4px;
    vertical-align: top;
    cursor: pointer;
    line-height: 0;
    width: fit-content;
    height: fit-content;
    contain: layout style;
    isolation: isolate;
    max-width: fit-content;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    outline: none;
    pointer-events: auto;
  `
  
  // 设置容器属性，防止文字插入
  imgContainer.setAttribute('contenteditable', 'false')
  imgContainer.setAttribute('tabindex', '-1')

  // 创建图片元素
  const img = document.createElement('img')
  img.src = displayUrl
  img.setAttribute('data-original-src', imageUrl)
  img.style.cssText = `
    max-width: 200px;
    max-height: 150px;
    height: auto;
    display: inline-block;
    border: 2px solid transparent;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    vertical-align: top;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    transition: border-color 0.2s ease, transform 0.1s ease;
    line-height: 0;
  `

  // 添加图片加载事件监听
  img.onload = () => {
    // 图片加载成功
  }
  img.onerror = (error) => {
    console.error('图片加载失败:', displayUrl, error)
    // 如果图片加载失败，尝试使用原始URL
    if (displayUrl !== imageUrl) {
      // 尝试使用原始URL加载图片
      img.src = imageUrl
    }
  }

  // 创建调整手柄
  const resizeHandle = document.createElement('div')
  resizeHandle.className = 'resize-handle'
  resizeHandle.style.cssText = `
    position: absolute;
    bottom: -7px;
    right: -7px;
    width: 14px;
    height: 14px;
    background: #1890ff;
    border: 3px solid white;
    border-radius: 50%;
    cursor: nw-resize;
    display: none;
    z-index: 1000;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transform: none;
    margin: 0;
    padding: 0;
  `

  // 将图片和调整手柄添加到独立的span容器中
  imgContainer.appendChild(img)
  imgContainer.appendChild(resizeHandle)
  
  // 确保容器尺寸精确匹配图片尺寸
  img.onload = () => {
    // 不设置任何固定尺寸，让容器自然适应图片
    // 这样可以保持文本流的正常
    // 更新调整手柄位置
    if (resizeHandle) {
      // 保持我们设置的精确定位样式
      resizeHandle.style.bottom = '-7px';
      resizeHandle.style.right = '-7px';
      resizeHandle.style.transform = 'none';
      
      // 确保容器使用正确的定位上下文
      imgContainer.style.position = 'relative';
      imgContainer.style.width = 'fit-content';
      imgContainer.style.height = 'fit-content';
      imgContainer.style.display = 'inline-block';
      imgContainer.style.isolation = 'isolate';
      imgContainer.style.maxWidth = 'fit-content';
      imgContainer.style.flexShrink = '0';
      
      // 确保手柄定位不受外部影响
      resizeHandle.style.contain = 'layout style';
      resizeHandle.style.isolation = 'isolate';
      resizeHandle.style.margin = '0';
      resizeHandle.style.padding = '0';
    }
  }

  // 保存当前光标位置
  const selection = window.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null
  
  // 如果有选中的范围，在光标位置插入图片
  if (range && selection) {
    // 删除选中的内容
    range.deleteContents()
    
    // 在图片前插入一个空格
    const beforeSpace = document.createTextNode(' ')
    range.insertNode(beforeSpace)
    
    // 直接插入独立的图片容器
    range.insertNode(imgContainer)
    
    // 在图片后插入一个空格和换行符，确保文字在图片容器外部
    const afterSpace = document.createTextNode(' ')
    const lineBreak = document.createElement('br')
    range.setStartAfter(imgContainer)
    range.setEndAfter(imgContainer)
    range.insertNode(afterSpace)
    range.insertNode(lineBreak)
    
    // 将光标移到图片后的换行符后面
    range.setStartAfter(lineBreak)
    range.setEndAfter(lineBreak)
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    // 如果没有光标位置，直接插入到末尾
    // 在图片前添加空格
    const beforeSpace = document.createTextNode(' ')
    editorRef.value.appendChild(beforeSpace)
    
    // 直接插入独立的图片容器
    editorRef.value.appendChild(imgContainer)
    
    // 在图片后添加空格和换行符，确保文字在图片容器外部
    const afterSpace = document.createTextNode(' ')
    const lineBreak = document.createElement('br')
    editorRef.value.appendChild(afterSpace)
    editorRef.value.appendChild(lineBreak)
    
    // 将光标移到图片后的换行符后面
    const newRange = document.createRange()
    newRange.setStartAfter(lineBreak)
    newRange.setEndAfter(lineBreak)
    selection?.removeAllRanges()
    selection?.addRange(newRange)
  }
  
  // 强制将光标定位到图片容器外部
  setTimeout(() => {
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      // 查找最后一个图片容器
      const imgContainers = editorRef.value?.querySelectorAll('.resizable-image-container')
      if (imgContainers && imgContainers.length > 0) {
        const lastImgContainer = imgContainers[imgContainers.length - 1]
        let nextNode = lastImgContainer.nextSibling
        while (nextNode && nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent?.trim() === '') {
          nextNode = nextNode.nextSibling
        }
        
        if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE && nextNode.nodeName === 'BR') {
          // 如果下一个节点是br，将光标放在br后面
          range.setStartAfter(nextNode)
          range.setEndAfter(nextNode)
        } else if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
          // 如果下一个节点是文本，将光标放在文本开始
          range.setStart(nextNode, 0)
          range.setEnd(nextNode, 0)
        } else {
          // 否则在最后一个图片容器后创建新的文本节点
          const textNode = document.createTextNode('')
          lastImgContainer.parentNode?.insertBefore(textNode, lastImgContainer.nextSibling)
          range.setStart(textNode, 0)
          range.setEnd(textNode, 0)
        }
        
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }, 50)
  
  // 延迟绑定事件，确保DOM完全渲染
  setTimeout(() => {
    bindImageEvents(imgContainer)
  }, 100)

  // 更新内容
  currentMemo.value.content = editorRef.value.innerHTML
}

// 插入文本到编辑器
const insertTextToEditor = (text: string) => {
  if (!editorRef.value) return

  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    editorRef.value.innerHTML += text
  }

  // 更新内容
  currentMemo.value.content = editorRef.value.innerHTML
}

// 转换本地路径为 base64
const convertLocalPathToBase64 = async (content: string): Promise<string> => {
  if (!content) {
    return content
  }

  // 转换本地路径为 base64

  // 查找所有图片标签
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g
  let match
  let processedContent = content

  while ((match = imgRegex.exec(content)) !== null) {
    const imgTag = match[0]
    const src = match[1]
    
    // 找到图片标签

    // 如果是本地路径，尝试转换为 base64
    if (src.startsWith('app://local-file/') && typeof window !== 'undefined' && window.db?.getImageBase64) {
      try {
        const relativePath = src.replace('app://local-file/', '')
        const result = await window.db.getImageBase64(relativePath)
        if (result.success && result.base64) {
          const newImgTag = imgTag.replace(src, result.base64)
          processedContent = processedContent.replace(imgTag, newImgTag)
          // 成功转换本地路径为 base64
        } else {
          // 如果转换失败，保留原标签但记录警告
          console.warn('无法获取图片 base64，保留原路径:', relativePath)
        }
      } catch (error) {
        console.warn('无法获取图片 base64:', error)
        // 如果转换失败，保留原标签
      }
    }
  }

  // 转换完成
  return processedContent
}

// 绑定图片事件
const bindImageEvents = (imgContainer: HTMLElement) => {
  // 设置容器基本样式
  imgContainer.style.display = 'inline-block'
  imgContainer.style.position = 'relative'
  imgContainer.style.lineHeight = '0'
  imgContainer.style.verticalAlign = 'top'
  imgContainer.style.width = 'fit-content'
  imgContainer.style.height = 'fit-content'
  imgContainer.style.contain = 'layout style'
  imgContainer.style.isolation = 'isolate'
  imgContainer.style.maxWidth = 'fit-content'
  imgContainer.style.flexShrink = '0'
  
  const img = imgContainer.querySelector('img') as HTMLImageElement
  const resizeHandle = imgContainer.querySelector('.resize-handle') as HTMLElement

  if (!img) {
    return
  }

  // 标记已绑定事件（允许重新绑定）
  imgContainer.dataset.eventsBound = 'true'

  // 简化的点击事件处理
  const handleClick = (e: Event) => {
    const mouseEvent = e as MouseEvent
    // 图片点击事件触发
    // 只阻止左键点击，允许右键菜单
    if (mouseEvent.button === 0) { // 左键
      e.preventDefault()
      e.stopPropagation()
      
      // 添加视觉反馈
      imgContainer.style.transform = 'scale(0.95)'
      setTimeout(() => {
        imgContainer.style.transform = 'scale(1)'
      }, 100)
      
      // 选中图片
      // 准备选中图片
      selectImage(imgContainer)
    }
  }

  // 双击事件处理 - 打开图片预览
  const handleDoubleClick = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 获取图片的原始路径或显示路径
    const imgSrc = img.src
    const imgAlt = img.alt || '图片预览'
    
    // 打开预览
    openImagePreview(imgSrc, imgAlt)
  }

  // 只添加右键菜单复制功能，不添加键盘复制功能，避免与选中复制冲突
  addImageContextMenu(img, {
    showMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
      if (typeof window !== 'undefined' && (window as any).message) {
        (window as any).message[type](message)
      } else {
        // 显示消息
      }
    },
    onSuccess: () => {},
    onError: (error) => console.error('图片复制失败:', error)
  })

  // 绑定点击事件 - 使用addEventListener更可靠
  // 先移除可能存在的旧事件监听器
  img.removeEventListener('click', handleClick, true)
  imgContainer.removeEventListener('click', handleClick, true)
  img.removeEventListener('dblclick', handleDoubleClick, true)
  imgContainer.removeEventListener('dblclick', handleDoubleClick, true)
  
  // 重新绑定事件
  img.addEventListener('click', handleClick, true)
  imgContainer.addEventListener('click', handleClick, true)
  img.addEventListener('dblclick', handleDoubleClick, true)
  imgContainer.addEventListener('dblclick', handleDoubleClick, true)
  
  // 防止文字插入到图片容器内部
  imgContainer.addEventListener('keydown', (e) => {
    // 允许复制、粘贴、剪切等快捷键
    if (e.ctrlKey || e.metaKey) {
      // 对于 Ctrl/Cmd + C/V/X 等快捷键，不阻止默认行为
      if (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a' || e.key === 'z') {
        return
      }
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    // 将光标移到图片容器后面
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.setStartAfter(imgContainer)
      range.setEndAfter(imgContainer)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  })
  
  // 防止图片容器获得焦点
  imgContainer.addEventListener('focus', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 将焦点转移到编辑器
    if (editorRef.value) {
      editorRef.value.focus()
    }
  })
  
  // 防止在图片容器内输入文字
  imgContainer.addEventListener('input', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 将光标移到图片容器后面
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      range.setStartAfter(imgContainer)
      range.setEndAfter(imgContainer)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  })
  
  // 防止在图片容器内粘贴内容
  imgContainer.addEventListener('paste', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 将光标移到图片容器后面
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      range.setStartAfter(imgContainer)
      range.setEndAfter(imgContainer)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  })
  
  // 添加鼠标悬停效果
  imgContainer.addEventListener('mouseenter', () => {
    if (!img.style.border.includes('#1890ff')) {
      img.style.borderColor = '#d9d9d9'
    }
  })
  
  imgContainer.addEventListener('mouseleave', () => {
    if (!img.style.border.includes('#1890ff')) {
      img.style.borderColor = 'transparent'
    }
  })
  
  // 添加点击事件，确保光标定位在图片后面
  imgContainer.addEventListener('click', (e) => {
    // 只阻止左键点击，允许右键菜单
    if (e.button === 0) { // 左键
      e.preventDefault()
      e.stopPropagation()
      
      // 将光标定位到图片容器后面
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.setStartAfter(imgContainer)
        range.setEndAfter(imgContainer)
        selection.removeAllRanges()
        selection.addRange(range)
        
        // 确保编辑器获得焦点
        if (editorRef.value) {
          editorRef.value.focus()
        }
      }
    }
  })

  // 绑定拖拽事件
  let isResizing = false
  let startX = 0,
      startY = 0,
      startWidth = 0,
      startHeight = 0

  // 更新调整手柄位置的函数
  const updateResizeHandlePosition = () => {
    if (resizeHandle && img) {
      // 确保手柄位置正确，相对于图片容器定位
      resizeHandle.style.bottom = '-6px';
      resizeHandle.style.right = '-6px';
      resizeHandle.style.transform = 'none';
      
      // 确保容器使用正确的定位上下文
      imgContainer.style.position = 'relative';
      imgContainer.style.width = 'fit-content';
      imgContainer.style.height = 'fit-content';
      
      // 确保容器不会受到外部布局影响
      imgContainer.style.display = 'inline-block';
      imgContainer.style.isolation = 'isolate';
      imgContainer.style.maxWidth = 'fit-content';
      imgContainer.style.flexShrink = '0';
      
      // 强制重新计算布局
      imgContainer.offsetHeight;
      
      // 确保手柄定位不受外部影响
      resizeHandle.style.contain = 'layout style';
      resizeHandle.style.isolation = 'isolate';
      resizeHandle.style.margin = '0';
      resizeHandle.style.padding = '0';
    }
  };

  // 初始更新手柄位置
  updateResizeHandlePosition();

  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      window.getSelection()?.removeAllRanges()

      isResizing = true
      startX = e.clientX
      startY = e.clientY
      startWidth = img.offsetWidth
      startHeight = img.offsetHeight

      const handleResize = (e: MouseEvent) => {
        if (!isResizing) return

        const deltaX = e.clientX - startX
        const deltaY = e.clientY - startY

        if (e.shiftKey) {
          // 保持宽高比
          const aspectRatio = startWidth / startHeight
          const newWidth = Math.max(50, startWidth + deltaX)
          const newHeight = newWidth / aspectRatio

          img.style.width = newWidth + 'px'
          img.style.height = newHeight + 'px'
        } else {
          // 自由调整
          img.style.width = Math.max(50, startWidth + deltaX) + 'px'
          img.style.height = Math.max(30, startHeight + deltaY) + 'px'
        }

        // 更新调整手柄位置
        updateResizeHandlePosition();

        // 更新内容
        currentMemo.value.content = editorRef.value!.innerHTML
      }

      const stopResize = () => {
        isResizing = false
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', stopResize)
        
        // 拖动结束后确保点击事件仍然有效
        // 不需要重新绑定，因为事件监听器仍然存在
      }

      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
    })
  }
}

// 全局变量存储当前选中的图片容器和事件清理函数
let currentSelectedContainer: HTMLElement | null = null
let currentEventCleanup: (() => void) | null = null

// 清理所有可能存在的键盘事件监听器
const cleanupAllKeyboardListeners = () => {
  if (currentEventCleanup) {
    currentEventCleanup()
    currentEventCleanup = null
  }
  currentSelectedContainer = null
}

// 选中图片
const selectImage = (container: HTMLElement) => {
  // 选中图片
  // 清除文本选中
  window.getSelection()?.removeAllRanges()

  // 如果之前有选中的图片，先清理其事件监听器
  if (currentSelectedContainer && currentEventCleanup) {
    // 清理之前选中的图片事件监听器
    currentEventCleanup()
    currentEventCleanup = null
  }

  // 清除其他选中状态
  document.querySelectorAll('.resizable-image-container').forEach((el) => {
    // 跳过当前要选中的容器
    if (el === container) return
    
    const handle = el.querySelector('.resize-handle') as HTMLElement
    if (handle) handle.style.display = 'none'
    // 清除其他图片的选中边框
    const img = el.querySelector('img') as HTMLImageElement
    if (img) {
      img.style.border = '2px solid transparent'
      img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
    }
  })

  // 设置当前选中状态
  const handle = container.querySelector('.resize-handle') as HTMLElement
  if (handle) {
    handle.style.display = 'block'
  }
  
  // 直接给图片添加蓝色选中边框
  const img = container.querySelector('img') as HTMLImageElement
  if (img) {
    img.style.border = '3px solid #1890ff'
    img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(24, 144, 255, 0.2)'
  } else {
    console.error('未找到图片元素')
  }
  
  // 确保容器可以获得焦点以接收键盘事件
  container.setAttribute('tabindex', '0')
  container.focus()


  // 点击其他地方取消选中
  const clearSelection = (e: Event) => {
    const target = e.target as Node
    if (!container.contains(target) && target !== container) {
      if (handle) {
        (handle as HTMLElement).style.display = 'none'
      }
      // 清除选中边框
      const img = container.querySelector('img') as HTMLImageElement
      if (img) {
        img.style.border = '2px solid transparent'
        img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
      }
      // 只移除选中相关的监听器，不影响图片的基本点击功能
      document.removeEventListener('click', clearSelection)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }

  // 使用唯一的事件处理函数，避免重复绑定
  const uniqueClearSelection = (e: Event) => {
    const target = e.target as Node
    if (!container.contains(target) && target !== container) {
      if (handle) {
        (handle as HTMLElement).style.display = 'none'
      }
      // 清除选中边框
      const img = container.querySelector('img') as HTMLImageElement
      if (img) {
        img.style.border = '2px solid transparent'
        img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
      }
      // 只移除选中相关的监听器，不影响图片的基本点击功能
      document.removeEventListener('click', uniqueClearSelection)
    }
  }


  // 使用全局键盘事件监听器，但只处理当前选中的图片
  // 先移除旧的全局监听器
  if (currentEventCleanup) {
    currentEventCleanup()
  }
  
  // 创建全局键盘事件处理函数
  const globalKeyDownHandler = (e: KeyboardEvent) => {
    // 检测操作系统
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    
    // Mac使用Cmd+C，Windows/Linux使用Ctrl+C
    const isCopyKey = isMac 
      ? (e.metaKey && e.key === 'c')  // Mac: Cmd+C
      : (e.ctrlKey && e.key === 'c')  // Windows/Linux: Ctrl+C
      
    if (isCopyKey) {
      // 全局键盘事件触发
      
      // 检查是否有文字选中
      const selection = window.getSelection()
      const hasTextSelection = selection && selection.toString().trim().length > 0
      
      if (hasTextSelection) {
        // 检测到文字选中，不处理图片复制，让浏览器处理文字复制
        // 如果有文字选中，让浏览器处理文字复制，不阻止默认行为
        return
      }
      
      // 只处理当前选中的容器且没有文字选中时
      if (currentSelectedContainer === container) {
        const img = container.querySelector('img') as HTMLImageElement
        if (img) {
          // 复制图片
          e.preventDefault()
          e.stopPropagation()
          copyImageToClipboard(img, {
            showMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
              if (typeof window !== 'undefined' && (window as any).message) {
                (window as any).message[type](message)
              } else {
                // 显示消息
              }
            },
            onSuccess: () => {},
            onError: (error) => console.error('图片复制失败:', error)
          })
          return
        }
      }
    }
  }
  
  // 创建事件清理函数
  const cleanup = () => {
    document.removeEventListener('keydown', globalKeyDownHandler)
    document.removeEventListener('click', uniqueClearSelection)
  }
  
  // 存储当前选中的容器和清理函数
  currentSelectedContainer = container
  currentEventCleanup = cleanup
  
  // 绑定全局键盘事件和点击外部取消选中事件
  document.addEventListener('keydown', globalKeyDownHandler)
  document.addEventListener('click', uniqueClearSelection)
  
  // 绑定全局键盘事件监听器
}

// 设置编辑器内容
const setEditorContent = async (content: string) => {
  if (!editorRef.value) return

  // 设置编辑器内容

  // 如果内容相同，不更新
  if (editorRef.value.innerHTML === content) return

  // 设置内容前

  // 先直接设置内容，确保基本显示正常
  editorRef.value.innerHTML = content || ''

  // 如果有内容，再处理图片转换
  if (content) {
    try {
      // 在显示前将本地路径转换为 base64
      const displayContent = await convertLocalPathToBase64(content)
      
      // 如果转换后的内容不同，更新编辑器
      if (displayContent !== content) {
        editorRef.value.innerHTML = displayContent
      }
    } catch (error) {
      // 图片转换失败，使用原始内容
    }
  }

  // 重新绑定所有图片事件
  setTimeout(() => {
    if (!editorRef.value) return
    // 开始重新绑定图片事件
    // 查找所有可能的图片容器
    const imgContainers = editorRef.value.querySelectorAll('.resizable-image-container')
    const allImages = editorRef.value.querySelectorAll('img')
    
    // 找到图片容器和图片
    
    // 为每个图片创建容器并绑定事件
    allImages.forEach((img, _index) => {
      // 处理图片
      // 检查图片是否已经在容器中
      let container = img.closest('.resizable-image-container')
      
      if (!container) {
        // 为图片创建容器
        // 创建图片容器
        container = document.createElement('span') as HTMLElement
        container.className = 'resizable-image-container'
        ;(container as HTMLElement).style.cssText = `
          position: relative;
          display: inline-block;
          margin: 0 4px;
          border: 2px solid transparent;
          border-radius: 4px;
          vertical-align: top;
          max-width: fit-content;
          transition: border-color 0.2s ease;
          line-height: 0;
          width: fit-content;
          height: fit-content;
          contain: layout style;
          isolation: isolate;
          flex-shrink: 0;
        `
        
        // 创建调整手柄
        const resizeHandle = document.createElement('div')
        resizeHandle.className = 'resize-handle'
        resizeHandle.style.cssText = `
          position: absolute;
          bottom: -6px;
          right: -6px;
          width: 12px;
          height: 12px;
          background: #40a9ff;
          border: 2px solid white;
          border-radius: 50%;
          cursor: nw-resize;
          display: none;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transform: none;
          margin: 0;
          padding: 0;
        `
        
        // 包装图片
        const wrapper = img.parentNode as HTMLElement
        if (wrapper) {
          wrapper.insertBefore(container, img)
          container.appendChild(img)
          container.appendChild(resizeHandle)
        }
      }
      
      // 绑定事件
      bindImageEvents(container as HTMLElement)
    })
    
    // 也绑定现有的容器
    imgContainers.forEach((container, _index) => {
      // 绑定现有容器
      bindImageEvents(container as HTMLElement)
    })
  }, 500) // 增加延迟时间，确保 DOM 完全更新
  
  // 设置编辑器内容完成
  
  // 如果是新增内容且为空，确保编辑器可以正常接收粘贴事件
  if (!content) {
    // 确保编辑器有焦点
    editorRef.value.focus()
  }
}

// 组件挂载后设置编辑器内容
// 监听主题变化
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'theme') {
    isDark.value = e.newValue === 'dark'
  }
}

// 轮询检查主题变化（用于独立窗口模式）
let themeCheckInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  // 清理所有可能存在的键盘事件监听器
  cleanupAllKeyboardListeners()
  
  // 立即检查当前主题
  checkTheme()
  
  // 监听localStorage变化
  window.addEventListener('storage', handleStorageChange)
  
  // 轮询检查主题变化（每500ms检查一次）
  themeCheckInterval = setInterval(() => {
    checkTheme()
  }, 500)
  
  // 等待下一个 tick 确保 DOM 更新
  await nextTick()
  
  // 检查编辑器引用
  if (!editorRef.value) {
    return
  }
  
  // 添加全局输入监听器，确保文字不会插入到图片容器内部
  const handleGlobalInput = () => {
    if (!editorRef.value) return
    
    // 查找所有图片容器
    const imgContainers = editorRef.value.querySelectorAll('.resizable-image-container')
    imgContainers.forEach(container => {
      // 检查容器内是否有文本内容
      const textNodes: Text[] = []
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT
      )
      
      let node
      while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.trim()) {
          textNodes.push(node as Text)
        }
      }
      
      // 将文本节点移出容器
      textNodes.forEach(textNode => {
        const text = textNode.textContent
        if (text && text.trim()) {
          // 在容器后创建新的文本节点
          const newTextNode = document.createTextNode(text)
          container.parentNode?.insertBefore(newTextNode, container.nextSibling)
          // 删除原文本节点
          textNode.remove()
        }
      })
    })
    
    // 只在检测到文字插入到图片容器内部时才重新定位光标
    let needsRepositioning = false
    imgContainers.forEach(container => {
      const textNodes: Text[] = []
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT
      )
      
      let node
      while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.trim()) {
          textNodes.push(node as Text)
        }
      }
      
      if (textNodes.length > 0) {
        needsRepositioning = true
      }
    })
    
    // 只有在需要时才重新定位光标
    if (needsRepositioning && imgContainers.length > 0) {
      const lastContainer = imgContainers[imgContainers.length - 1]
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        // 查找最后一个图片容器后的合适位置
        let nextNode = lastContainer.nextSibling
        while (nextNode && nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent?.trim() === '') {
          nextNode = nextNode.nextSibling
        }
        
        if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE && nextNode.nodeName === 'BR') {
          range.setStartAfter(nextNode)
          range.setEndAfter(nextNode)
        } else if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
          range.setStart(nextNode, 0)
          range.setEnd(nextNode, 0)
        } else {
          // 在最后一个图片容器后创建新的文本节点
          const textNode = document.createTextNode('')
          lastContainer.parentNode?.insertBefore(textNode, lastContainer.nextSibling)
          range.setStart(textNode, 0)
          range.setEnd(textNode, 0)
        }
        
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }
  
  // 添加事件监听器，使用防抖来减少执行频率
  let inputTimeout: ReturnType<typeof setTimeout> | null = null
  const debouncedHandleGlobalInput = () => {
    if (inputTimeout) {
      clearTimeout(inputTimeout)
    }
    inputTimeout = setTimeout(handleGlobalInput, 100)
  }
  
  editorRef.value.addEventListener('input', debouncedHandleGlobalInput)
  editorRef.value.addEventListener('paste', handleGlobalInput) // 粘贴事件立即处理
  
  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeyDown)
  
  // 直接从 URL 参数中获取数据
  const hash = window.location.hash
  
  if (hash.includes('data=')) {
    try {
      const dataParam = hash.split('data=')[1]
      const data = JSON.parse(decodeURIComponent(dataParam))
      
      if (data.memo) {
        // 设置备忘录数据
        
        currentMemo.value.id = data.memo.id
        currentMemo.value.title = data.memo.title
        currentMemo.value.content = data.memo.content
        currentMemo.value.quadrant = data.memo.quadrant
        currentMemo.value.completed = data.memo.completed
        currentMemo.value.created = data.memo.created
        currentMemo.value.completedTime = data.memo.completedTime
        currentMemo.value.sortOrder = data.memo.sortOrder
        
        // 设置完成
        
        // 设置编辑器内容
        const content = currentMemo.value.content
        if (content) {
          setEditorContent(content)
        }
        
        // 设置编辑器内容完成
      }
    } catch (error) {
      console.error('解析 URL 数据失败:', error)
    }
  }
})

// 暴露方法给父组件
defineExpose({
  setEditorContent,
  formRef,
  editorRef,
  openAddModal,
  openEditModal,
  saveMemo,
  loadMemos
})

// 清理事件监听器
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  if (themeCheckInterval) {
    clearInterval(themeCheckInterval)
  }
  
  // 清理所有键盘事件监听器
  cleanupAllKeyboardListeners()
})
</script>

<style scoped>
/* 原生HTML元素样式 */
.form-item {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.form-item.content-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-color);
}

/* 星号样式 */
.required-asterisk {
  color: #ff4d4f !important;
  font-weight: bold;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  background-color: white;
  color: #333;
  transition: border-color 0.3s, box-shadow 0.3s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.char-count {
  font-size: 12px;
  color: #999;
  text-align: right;
  margin-top: 4px;
}

.editor-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: white;
  color: #333;
}

.btn-cancel {
  background-color: white;
  color: #333;
  border-color: #d9d9d9;
}

.btn-cancel:hover {
  background-color: #f5f5f5;
  border-color: #40a9ff;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-primary:hover {
  background-color: #40a9ff;
  border-color: #40a9ff;
}

/* 暗黑主题样式 */
[data-theme='dark'] .form-label {
  color: #e0e0e0 !important;
}

[data-theme='dark'] .form-input {
  background-color: #1a1a1a !important;
  color: #ffffff !important;
  border-color: #555 !important;
}

[data-theme='dark'] .form-input:focus {
  border-color: #1890ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.3) !important;
}

[data-theme='dark'] .char-count,
[data-theme='dark'] .editor-tip {
  color: #999 !important;
}

[data-theme='dark'] .btn {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #555 !important;
}

[data-theme='dark'] .btn-cancel {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #555 !important;
}

[data-theme='dark'] .btn-cancel:hover {
  background-color: #404040 !important;
  border-color: #777 !important;
}

[data-theme='dark'] .btn-primary {
  background-color: #1890ff !important;
  color: white !important;
  border-color: #1890ff !important;
}

[data-theme='dark'] .btn-primary:hover {
  background-color: #40a9ff !important;
  border-color: #40a9ff !important;
}
/* 模态框外层容器 */
.edit-memo-modal {
  width: 100%;
  height: 100vh;
  background: white;
  border-radius: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
}

[data-theme='dark'] .edit-memo-modal {
  background: #1a1a1a !important;
}

.edit-memo-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: white;
}

/* 确保浅色主题样式 */
.edit-memo-modal[data-theme='light'] .modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-bottom-color: #e8e8e8 !important;
  color: white !important;
}

[data-theme='dark'] .edit-memo-modal .modal-header {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  border-bottom-color: #434343 !important;
  color: #e0e0e0 !important;
}

.edit-memo-modal .modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
}

[data-theme='dark'] .edit-memo-modal .modal-header h3 {
  color: #e0e0e0 !important;
}

.edit-memo-modal .close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.edit-memo-modal .close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

[data-theme='dark'] .edit-memo-modal .close-btn {
  color: #666;
}

[data-theme='dark'] .edit-memo-modal .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.edit-memo-modal .modal-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  max-height: calc(100vh - 120px);
  background: white;
}

/* 浅色主题内容样式 */
.edit-memo-modal[data-theme='light'] .modal-content {
  background: white !important;
  color: inherit !important;
}

[data-theme='dark'] .edit-memo-modal .modal-content {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
}

.edit-memo-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: white;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

/* 浅色主题底部样式 */
.edit-memo-modal[data-theme='light'] .modal-footer {
  background: #fafafa !important;
  border-top-color: #e8e8e8 !important;
}

[data-theme='dark'] .edit-memo-modal .modal-footer {
  background: #333333 !important;
  border-top-color: #434343 !important;
}

/* Naive UI 组件浅色主题样式 */
.edit-memo-modal[data-theme='light'] .n-form-item-label {
  color: #333 !important;
}

.edit-memo-modal[data-theme='light'] .n-input {
  background-color: white !important;
  color: #333 !important;
  border-color: #d9d9d9 !important;
}

.edit-memo-modal[data-theme='light'] .n-input .n-input__input-el {
  background-color: white !important;
  color: #333 !important;
}

.edit-memo-modal[data-theme='light'] .n-input .n-input__placeholder {
  color: #999 !important;
}

.edit-memo-modal[data-theme='light'] .n-button {
  color: #333 !important;
  background-color: white !important;
  border-color: #d9d9d9 !important;
}

.edit-memo-modal[data-theme='light'] .n-button--primary {
  background: #1890ff !important;
  border-color: #1890ff !important;
  color: #fff !important;
}

/* Naive UI 组件暗黑主题样式 */
[data-theme='dark'] .edit-memo-modal .n-form-item-label {
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input {
  background: #2a2a2a !important;
  border-color: #434343 !important;
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input .n-input__input-el {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input .n-input__placeholder {
  color: #999 !important;
}

[data-theme='dark'] .edit-memo-modal .n-button {
  background: #2a2a2a !important;
  border-color: #434343 !important;
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-button .n-button__content {
  color: #e0e0e0 !important;
}

/* 最高优先级的暗黑主题样式 */
[data-theme='dark'] .edit-memo-modal .modal-header h3 {
  color: #e0e0e0 !important;
}

/* 强制暗黑主题样式 - 使用更高优先级 */
.edit-memo-modal[data-theme='dark'] {
  background: #1a1a1a !important;
}

.edit-memo-modal[data-theme='dark'] .modal-header {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  border-bottom-color: #434343 !important;
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .modal-header h3 {
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .modal-content {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .modal-footer {
  background: #333333 !important;
  border-top-color: #434343 !important;
}

/* 强制暗黑主题 Naive UI 组件样式 */
.edit-memo-modal[data-theme='dark'] .n-form-item-label {
  color: #e0e0e0 !important;
}

/* 更高优先级的表单标签样式 */
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label {
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label .n-form-item-label__text {
  color: #e0e0e0 !important;
}

/* 覆盖Naive UI的CSS变量 */
.edit-memo-modal[data-theme='dark'] .n-form-item {
  --n-label-text-color: #e0e0e0 !important;
  --n-text-color: #e0e0e0 !important;
  --n-text-color-1: #e0e0e0 !important;
  --n-text-color-2: #e0e0e0 !important;
  --n-text-color-3: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .n-form-item-label {
  --n-label-text-color: #e0e0e0 !important;
  --n-text-color: #e0e0e0 !important;
  color: var(--n-label-text-color) !important;
}

/* 强制覆盖所有可能的文本颜色 */
.edit-memo-modal[data-theme='dark'] .n-form-item-label * {
  color: #e0e0e0 !important;
}

/* 使用更具体的选择器覆盖 */
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label .n-form-item-label__text {
  color: #e0e0e0 !important;
}

/* 覆盖可能的伪元素 */
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label::before,
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label::after {
  color: #e0e0e0 !important;
}

/* 最高优先级的强制覆盖 */
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label,
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label *,
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label .n-form-item-label__text,
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label span,
.edit-memo-modal[data-theme='dark'] .n-form-item .n-form-item-label div {
  color: #e0e0e0 !important;
  --n-label-text-color: #e0e0e0 !important;
  --n-text-color: #e0e0e0 !important;
}

/* 使用属性选择器确保覆盖 */
.edit-memo-modal[data-theme='dark'] [class*="n-form-item-label"] {
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] [class*="n-form-item-label"] * {
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .n-input {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  border: 1px solid #555 !important;
  border-color: #555 !important;
}

.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
}

/* 更高优先级的输入框内部元素样式 */
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
  --n-input-placeholder-color: #999 !important;
}

/* 强制设置输入框内部所有文字颜色 */
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el *,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el * {
  color: #e0e0e0 !important;
}

/* 覆盖Naive UI的CSS变量 */
.edit-memo-modal[data-theme='dark'] .n-input {
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
  --n-input-placeholder-color: #999 !important;
  --n-input-color-focus: #e0e0e0 !important;
  --n-input-border-color: #555 !important;
  --n-input-border-color-focus: #1890ff !important;
  --n-input-border-color-hover: #777 !important;
  --n-input-color-disabled: #666 !important;
  --n-input-border-color-disabled: #333 !important;
  --n-input-color-error: #ff4d4f !important;
  --n-input-border-color-error: #ff4d4f !important;
}

.edit-memo-modal[data-theme='dark'] .n-input .n-input__placeholder {
  color: #999 !important;
}

/* 强制覆盖输入框内部所有元素 */
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el *,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el * {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
}

/* 强制设置输入框内部文字颜色 - 最高优先级 */
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el {
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el input,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el textarea {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

/* 覆盖输入框包装器 */
.edit-memo-modal[data-theme='dark'] .n-input .n-input-wrapper {
  background-color: #2a2a2a !important;
  border: 1px solid #555 !important;
  border-color: #555 !important;
  --n-input-border-color: #555 !important;
}

.edit-memo-modal[data-theme='dark'] .n-input .n-input-wrapper:hover {
  border-color: #777 !important;
  --n-input-border-color-hover: #777 !important;
}

.edit-memo-modal[data-theme='dark'] .n-input .n-input-wrapper.n-input-wrapper--focus {
  border-color: #1890ff !important;
  --n-input-border-color-focus: #1890ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.3) !important;
}

/* 使用属性选择器确保覆盖 */
.edit-memo-modal[data-theme='dark'] [class*="n-input__input-el"],
.edit-memo-modal[data-theme='dark'] [class*="n-input__textarea-el"] {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
}

/* 覆盖可能的伪元素 */
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el::placeholder,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el::placeholder {
  color: #999 !important;
}

/* 最高优先级的强制覆盖 - 使用更具体的选择器 */
.edit-memo-modal[data-theme='dark'] .n-form-item .n-input .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-form-item .n-input .n-input__textarea-el {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
  --n-input-placeholder-color: #999 !important;
}

/* 覆盖所有可能的输入框变体 */
.edit-memo-modal[data-theme='dark'] .n-input[class*="n-input--"] .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-input[class*="n-input--"] .n-input__textarea-el {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
}

/* 强制覆盖所有输入框相关的CSS变量 */
.edit-memo-modal[data-theme='dark'] .n-input,
.edit-memo-modal[data-theme='dark'] .n-input *,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el {
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
  --n-input-placeholder-color: #999 !important;
  --n-input-border-color: #555 !important;
  --n-input-border-color-hover: #777 !important;
  --n-input-border-color-focus: #1890ff !important;
}

/* 覆盖Vue scoped样式 - 使用更高优先级 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] *,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el[data-v-8ff6192b] {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
  --n-input-placeholder-color: #999 !important;
}

/* 强制覆盖scoped样式中的输入框内部元素 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el input,
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el textarea {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

/* 覆盖所有可能的scoped样式 - 使用更兼容的方法 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] *,
.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el[data-v-8ff6192b] {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
  --n-input-placeholder-color: #999 !important;
}

/* 使用CSS深度选择器强制覆盖scoped样式 */
.edit-memo-modal[data-theme='dark'] :deep(.n-input),
.edit-memo-modal[data-theme='dark'] :deep(.n-input *),
.edit-memo-modal[data-theme='dark'] :deep(.n-input .n-input__input-el),
.edit-memo-modal[data-theme='dark'] :deep(.n-input .n-input__textarea-el) {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  --n-input-color: #e0e0e0 !important;
  --n-input-text-color: #e0e0e0 !important;
  --n-input-placeholder-color: #999 !important;
}


/* 最高优先级的强制覆盖 - 直接针对scoped样式 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] {
  background-color: #2a2a2a !important;
}

.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] * {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

.edit-memo-modal[data-theme='dark'] .n-input .n-input__input-el[data-v-8ff6192b] {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .n-input .n-input__textarea-el[data-v-8ff6192b] {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
}

/* 使用更高优先级的选择器覆盖所有可能的样式 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b][data-v-8ff6192b] * {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b][data-v-8ff6192b] .n-input__input-el {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b][data-v-8ff6192b] .n-input__textarea-el {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

/* 直接针对input和textarea元素 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] input,
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] textarea {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

/* 最高优先级的强制覆盖 - 使用多重选择器 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el[data-v-8ff6192b] {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

/* 使用属性选择器确保覆盖 */
.edit-memo-modal[data-theme='dark'] [data-v-8ff6192b].n-input [data-v-8ff6192b].n-input__input-el,
.edit-memo-modal[data-theme='dark'] [data-v-8ff6192b].n-input [data-v-8ff6192b].n-input__textarea-el {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

/* 强制覆盖所有可能的样式组合 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el,
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el,
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el *,
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el * {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
}

/* 终极强制覆盖 - 使用最高优先级 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el[data-v-8ff6192b] {
  all: unset !important;
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
  border: 1px solid #555 !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el[data-v-8ff6192b] {
  all: unset !important;
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
  border: 1px solid #555 !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  width: 100% !important;
  box-sizing: border-box !important;
  resize: vertical !important;
  min-height: 100px !important;
}

/* 最高优先级的强制覆盖 - 使用多重选择器和最高特异性 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el[data-v-8ff6192b] {
  color: #ffffff !important;
  background-color: #1a1a1a !important;
}

/* 使用属性选择器的最高优先级 */
.edit-memo-modal[data-theme='dark'] [data-v-8ff6192b].n-input [data-v-8ff6192b].n-input__input-el[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] [data-v-8ff6192b].n-input [data-v-8ff6192b].n-input__textarea-el[data-v-8ff6192b] {
  color: #ffffff !important;
  background-color: #1a1a1a !important;
}

/* 直接针对input和textarea元素 - 最高优先级 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] input[data-v-8ff6192b],
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] textarea[data-v-8ff6192b] {
  color: #ffffff !important;
  background-color: #1a1a1a !important;
}

/* 使用通配符选择器确保覆盖所有可能的样式 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] *[data-v-8ff6192b] {
  color: #ffffff !important;
  background-color: #1a1a1a !important;
}

/* 终极解决方案 - 使用最高优先级的样式 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__input-el[data-v-8ff6192b] {
  color: #ffffff !important;
  background-color: #1a1a1a !important;
}

.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] .n-input__textarea-el[data-v-8ff6192b] {
  color: #ffffff !important;
  background-color: #1a1a1a !important;
}

/* 使用CSS变量强制覆盖 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] {
  --n-input-color: #ffffff !important;
  --n-input-text-color: #ffffff !important;
  --n-input-placeholder-color: #999 !important;
  --n-input-border-color: #555 !important;
  --n-input-border-color-hover: #777 !important;
  --n-input-border-color-focus: #1890ff !important;
}

/* 强制覆盖所有可能的CSS变量 */
.edit-memo-modal[data-theme='dark'] .n-input[data-v-8ff6192b] * {
  --n-input-color: #ffffff !important;
  --n-input-text-color: #ffffff !important;
  --n-input-placeholder-color: #999 !important;
  color: var(--n-input-color) !important;
  background-color: #1a1a1a !important;
}

.edit-memo-modal[data-theme='dark'] .n-button {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
  border-color: #434343 !important;
}

.edit-memo-modal[data-theme='dark'] .n-button .n-button__content {
  color: #e0e0e0 !important;
}

.edit-memo-modal[data-theme='dark'] .n-button--primary {
  background: #1890ff !important;
  border-color: #1890ff !important;
  color: #fff !important;
}

[data-theme='dark'] .edit-memo-modal .n-button {
  color: #e0e0e0 !important;
  background-color: #2a2a2a !important;
  border-color: #434343 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #434343 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input .n-input__input-el {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-form-item-label {
  color: #e0e0e0 !important;
}

/* 强制覆盖所有可能的样式 */
[data-theme='dark'] .edit-memo-modal .n-button {
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-button span {
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-button .n-button__content {
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-button--primary {
  background: #1890ff !important;
  border-color: #1890ff !important;
  color: #fff !important;
}

[data-theme='dark'] .edit-memo-modal .n-button:hover {
  background: #404040 !important;
  border-color: #555 !important;
}

[data-theme='dark'] .edit-memo-modal .n-button--primary:hover {
  background: #40a9ff !important;
  border-color: #40a9ff !important;
}

/* 更全面的 Naive UI 暗黑主题覆盖 */
[data-theme='dark'] .edit-memo-modal .n-form-item {
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-form-item-label__text {
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input-wrapper {
  background: #2a2a2a !important;
  border-color: #434343 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input-wrapper:hover {
  border-color: #555 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input-wrapper.n-input-wrapper--focus {
  border-color: #1890ff !important;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
}

[data-theme='dark'] .edit-memo-modal .n-input__input {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input__input::placeholder {
  color: #999 !important;
}

[data-theme='dark'] .edit-memo-modal .n-input__count {
  color: #999 !important;
}

/* 富文本编辑器样式 */
.rich-editor-container {
  width: 100% !important;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  min-height: 0 !important;
}

.rich-editor {
  width: 100% !important;
  flex: 1 !important;
  min-height: 400px !important;
  padding: 16px;
  overflow-y: auto;
  background: white;
  line-height: 1.6;
  outline: none;
  border: none;
  box-sizing: border-box;
  word-wrap: break-word;
  height: 100% !important;
  min-height: 0 !important;
  white-space: normal;
  vertical-align: top;
}

.rich-editor:focus {
  outline: none;
}

.rich-editor-container:focus-within {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

[data-theme='dark'] .rich-editor {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
}

[data-theme='dark'] .rich-editor-container {
  border-color: #434343 !important;
  background: #2a2a2a !important;
}

[data-theme='dark'] .rich-editor-container:focus-within {
  border-color: #177ddc;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.rich-editor img {
  max-width: 100%;
  height: auto;
  margin: 8px 0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rich-editor .resizable-image-container {
  display: inline-block;
  line-height: 0;
  vertical-align: top;
  margin: 0 4px;
  position: relative;
  width: fit-content;
  height: fit-content;
  isolation: isolate;
  contain: layout style;
  /* 确保容器不会继承父级的宽度 */
  max-width: fit-content;
  /* 防止容器被拉伸 */
  flex-shrink: 0;
  /* 防止文字插入和选择 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 防止获得焦点 */
  outline: none;
  /* 确保容器内容不可编辑 */
  pointer-events: auto;
}

.rich-editor .resizable-image-container img {
  display: inline-block;
  line-height: 0;
  vertical-align: top;
  max-width: 200px;
  max-height: 150px;
  height: auto;
  border: 2px solid transparent;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  transition: border-color 0.2s ease, transform 0.1s ease;
}

.rich-editor .resize-handle {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 12px;
  height: 12px;
  background: #40a9ff;
  border: 2px solid white;
  border-radius: 50%;
  cursor: nw-resize;
  display: none;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: none;
  /* 确保手柄定位不受外部影响 */
  contain: layout style;
  isolation: isolate;
  margin: 0;
  padding: 0;
}

.editor-toolbar {
  background: rgba(0, 0, 0, 0.02);
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: #666;
}

[data-theme='dark'] .editor-toolbar {
  background: rgba(255, 255, 255, 0.02);
  color: #999;
}

/* 简化布局，直接设置高度 */
.edit-memo-modal {
  height: 100vh !important;
  display: flex !important;
  flex-direction: column !important;
}

.edit-memo-modal .modal-content {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.edit-memo-modal .n-form {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.edit-memo-modal .n-form-item:last-child {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.edit-memo-modal .n-form-item:last-child .n-form-item__feedback-wrapper {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* 独立窗口模式专用样式 */

/* 添加新的样式确保编辑器容器填充可用空间 */
.rich-editor-container {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  min-height: 300px !important; /* 设置最小高度 */
}

.rich-editor {
  flex: 1 !important;
  height: 100% !important;
  min-height: 300px !important;
}

</style>
