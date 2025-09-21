/**
 * 图片复制工具函数
 * 提供统一的图片复制到剪贴板功能
 */

export interface CopyImageOptions {
  showMessage?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * 在Electron环境中复制图片到剪贴板
 * @param img 要复制的图片元素
 * @param options 可选配置
 */
async function copyImageInElectron(
  img: HTMLImageElement, 
  options: CopyImageOptions = {}
): Promise<void> {
  const { showMessage, onSuccess, onError } = options

  try {
    // 获取原始图片路径
    const originalSrc = img.getAttribute('data-original-src')
    let imageData: string | null = null

    if (originalSrc && originalSrc.startsWith('app://local-file/')) {
      // 如果是本地文件，获取原图数据
      const relativePath = originalSrc.replace('app://local-file/', '')
      if (typeof window !== 'undefined' && window.db?.getImageBase64) {
        const result = await window.db.getImageBase64(relativePath)
        if (result?.success && result.base64) {
          imageData = result.base64
        } else {
          console.warn('获取原图失败:', result?.error)
        }
      }
    } else if (img.src.startsWith('data:image/')) {
      // 如果已经是base64格式，直接使用
      imageData = img.src
    } else if (img.src.startsWith('app://local-file/')) {
      // 如果是本地文件路径，需要获取实际数据
      const relativePath = img.src.replace('app://local-file/', '')
      if (typeof window !== 'undefined' && window.db?.getImageBase64) {
        const result = await window.db.getImageBase64(relativePath)
        if (result?.success && result.base64) {
          imageData = result.base64
        } else {
          console.warn('获取本地文件数据失败:', result?.error)
          throw new Error('无法获取本地图片数据')
        }
      } else {
        throw new Error('无法访问本地文件API')
      }
    } else {
      // 其他情况，尝试直接使用img.src
      imageData = img.src
    }

    if (!imageData) {
      const error = new Error('无法获取图片数据用于复制')
      showMessage?.('无法获取图片数据', 'error')
      onError?.(error)
      return
    }

    // 使用Electron的剪贴板API
    if (typeof window !== 'undefined' && (window as any).db?.copyImageToClipboard) {
      const result = await (window as any).db.copyImageToClipboard(imageData)
      if (result.success) {
        showMessage?.('图片已复制到剪贴板', 'success')
        onSuccess?.()
      } else {
        throw new Error(result.error || '复制失败')
      }
    } else {
      throw new Error('Electron剪贴板API不可用')
    }
  } catch (error) {
    console.error('Electron复制图片失败:', error)
    const err = error instanceof Error ? error : new Error('复制图片失败')
    showMessage?.(`复制失败: ${err.message}`, 'error')
    onError?.(err)
  }
}

/**
 * 复制图片到剪贴板
 * @param img 要复制的图片元素
 * @param options 可选配置
 */
export async function copyImageToClipboard(
  img: HTMLImageElement, 
  options: CopyImageOptions = {}
): Promise<void> {
  const { showMessage, onSuccess, onError } = options

  try {
    // 检查是否在Electron环境中
    const isElectron = typeof window !== 'undefined' && (window as any).db?.copyImageToClipboard
    
    if (isElectron) {
      await copyImageInElectron(img, options)
      return
    }
    
    // 检查clipboard API是否可用
    if (!navigator.clipboard) {
      const error = new Error('浏览器不支持剪贴板功能')
      showMessage?.('浏览器不支持剪贴板功能', 'error')
      onError?.(error)
      return
    }

    // 获取原始图片路径
    const originalSrc = img.getAttribute('data-original-src')
    let imageData: string | null = null

    if (originalSrc && originalSrc.startsWith('app://local-file/')) {
      // 如果是本地文件，获取原图数据
      const relativePath = originalSrc.replace('app://local-file/', '')
      if (typeof window !== 'undefined' && window.db?.getImageBase64) {
        const result = await window.db.getImageBase64(relativePath)
        if (result?.success && result.base64) {
          imageData = result.base64
        } else {
          console.warn('获取原图失败:', result?.error)
        }
      }
    } else if (img.src.startsWith('data:image/')) {
      // 如果已经是base64格式，直接使用
      imageData = img.src
    } else {
      // 尝试直接使用img.src
      imageData = img.src
    }

    if (!imageData) {
      const error = new Error('无法获取图片数据用于复制')
      showMessage?.('无法获取图片数据', 'error')
      onError?.(error)
      return
    }

    // 将base64转换为Blob
    const response = await fetch(imageData)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const blob = await response.blob()

    // 检查blob类型
    if (!blob.type.startsWith('image/')) {
      const error = new Error('图片格式不支持')
      showMessage?.('图片格式不支持', 'error')
      onError?.(error)
      return
    }

    // 复制到剪贴板 - 使用canvas方法
    // 检测操作系统
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    // 创建canvas来绘制图片
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('无法创建canvas上下文')
    }
    
    // 设置canvas尺寸
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    
    // 绘制图片到canvas
    ctx.drawImage(img, 0, 0)
    
    // 将canvas转换为blob
    canvas.toBlob(async (canvasBlob) => {
      if (!canvasBlob) {
        const error = new Error('无法创建图片blob')
        onError?.(error)
        return
      }
      
      try {
        // 检查ClipboardItem支持情况
        const hasClipboardItem = typeof window.ClipboardItem !== 'undefined' && typeof navigator.clipboard.write === 'function'
        const hasClipboardWrite = typeof navigator.clipboard.write === 'function'
        
        if (hasClipboardItem) {
          // 优先使用ClipboardItem（Chrome、Edge等支持）
          const clipboardItem = new ClipboardItem({
            [canvasBlob.type]: canvasBlob
          })
          await navigator.clipboard.write([clipboardItem])
          showMessage?.('图片已复制到剪贴板', 'success')
          onSuccess?.()
        } else if (hasClipboardWrite) {
          // 尝试使用navigator.clipboard.write（Safari等可能支持）
          try {
            await navigator.clipboard.writeText('') // 先清空剪贴板
            // 对于Safari，可能需要特殊处理
            if (isSafari) {
              throw new Error('Safari不支持图片复制到剪贴板')
            }
            // 其他浏览器的处理
            throw new Error('当前浏览器不支持图片复制到剪贴板')
          } catch (writeError) {
            throw writeError
          }
        } else {
          throw new Error('浏览器不支持剪贴板写入功能')
        }
      } catch (clipboardError) {
        console.warn('剪贴板复制失败，使用备用方案:', clipboardError)
        
        // Mac系统特殊处理
        if (isMac) {
          // 在Mac上，提供更友好的提示
          showMessage?.('Mac系统建议使用右键菜单"复制图片"或下载图片到本地', 'warning')
          
          // 尝试使用系统剪贴板（如果可能）
          try {
            // 创建一个临时的可复制元素
            const tempDiv = document.createElement('div')
            tempDiv.style.position = 'absolute'
            tempDiv.style.left = '-9999px'
            tempDiv.style.top = '-9999px'
            tempDiv.appendChild(img.cloneNode(true))
            document.body.appendChild(tempDiv)
            
            // 选中图片
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(tempDiv)
            selection?.removeAllRanges()
            selection?.addRange(range)
            
            // 尝试复制
            const success = document.execCommand('copy')
            // 安全地移除临时元素
            if (tempDiv.parentNode) {
              try {
                document.body.removeChild(tempDiv)
              } catch (error) {
                console.warn('移除临时元素失败:', error)
              }
            }
            selection?.removeAllRanges()
            
            if (success) {
              showMessage?.('图片已复制到剪贴板', 'success')
              onSuccess?.()
              return
            }
          } catch (execError) {
            console.warn('execCommand复制失败:', execError)
          }
        }
        
        // 备用方法：下载图片
        const url = URL.createObjectURL(canvasBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `image_${Date.now()}.png`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        const downloadMessage = isMac 
          ? '图片已保存到下载文件夹，您可以在Finder中找到它' 
          : '图片已保存到下载文件夹'
        showMessage?.(downloadMessage, 'success')
        onSuccess?.()
      }
    }, 'image/png')
  } catch (error) {
    console.error('复制图片失败:', error)
    const err = error instanceof Error ? error : new Error('复制图片失败')
    
    if (err.name === 'NotAllowedError') {
      showMessage?.('没有剪贴板权限，请检查浏览器设置', 'error')
    } else if (err.name === 'NotSupportedError') {
      showMessage?.('浏览器不支持此操作', 'error')
    } else {
      showMessage?.(`复制失败: ${err.message}`, 'error')
    }
    
    onError?.(err)
  }
}

/**
 * 为图片添加右键菜单复制功能
 * @param img 图片元素
 * @param options 可选配置
 */
export function addImageContextMenu(
  img: HTMLImageElement, 
  options: CopyImageOptions = {}
): void {
  img.oncontextmenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 创建右键菜单
    const contextMenu = document.createElement('div')
    contextMenu.className = 'image-context-menu'
    contextMenu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      padding: 4px 0;
      min-width: 120px;
    `
    
    // 深色主题支持
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      contextMenu.style.background = '#2a2a2a'
      contextMenu.style.borderColor = '#555'
      contextMenu.style.color = '#e0e0e0'
    }
    
          // 检测操作系统
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
          
          // 添加复制选项
          const copyOption = document.createElement('div')
          copyOption.textContent = isMac ? '📋 复制图片 (Mac: ⌘+C)' : '📋 复制图片'
          copyOption.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            color: #333;
            transition: background-color 0.2s;
          `
    copyOption.onmouseover = () => {
      copyOption.style.backgroundColor = '#f5f5f5'
    }
    copyOption.onmouseout = () => {
      copyOption.style.backgroundColor = 'transparent'
    }
    // 定义关闭菜单的函数
    const closeMenu = () => {
      // 检查菜单是否还在DOM中
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
      await copyImageToClipboard(img, options)
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
}

/**
 * 为图片添加键盘复制功能（Ctrl+C）
 * @param img 图片元素
 * @param options 可选配置
 * @returns 清理函数
 */
export function addImageKeyboardCopy(
  img: HTMLImageElement, 
  options: CopyImageOptions = {}
): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    // 检测操作系统
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const isCopyKey = isMac 
      ? (e.metaKey && e.key === 'c')  // Mac: Cmd+C
      : (e.ctrlKey && e.key === 'c')  // Windows/Linux: Ctrl+C
      
    if (isCopyKey) {
      // 检查是否选中了图片
      const selection = window.getSelection()
      
      // 如果图片有选中样式（蓝色边框），直接复制
      const imgContainer = img.closest('.resizable-image-container')
      if (imgContainer && (img.style.border.includes('#1890ff') || img.style.border.includes('3px solid #1890ff'))) {
        e.preventDefault()
        e.stopPropagation()
        copyImageToClipboard(img, options)
        return
      }
      
      // 检查文本选择是否包含图片
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        
        // 检查选中的元素是否直接是图片或其容器
        const selectedElement = range.commonAncestorContainer
        const imgElement = selectedElement.nodeType === Node.ELEMENT_NODE 
          ? selectedElement as Element
          : selectedElement.parentElement
        
        // 如果选中的是图片本身或其直接容器，直接复制图片
        if (imgElement && (imgElement === img || imgElement.querySelector('img') === img)) {
          e.preventDefault()
          copyImageToClipboard(img, options)
          return
        }
        
        // 检查选中的内容是否直接包含图片
        const selectedContent = selection.toString().trim()
        
        // 如果选中的是纯文字（没有图片），不处理
        if (selectedContent && !range.toString().includes('\uFFFC')) {
          return
        }
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  
  // 返回清理函数
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * 为图片添加完整的复制功能（右键菜单 + 键盘快捷键）
 * @param img 图片元素
 * @param options 可选配置
 * @returns 清理函数
 */
export function addImageCopyFeatures(
  img: HTMLImageElement, 
  options: CopyImageOptions = {}
): () => void {
  // 添加右键菜单
  addImageContextMenu(img, options)
  
  // 添加键盘快捷键
  const cleanupKeyboard = addImageKeyboardCopy(img, options)
  
  // 返回清理函数
  return () => {
    cleanupKeyboard()
  }
}

