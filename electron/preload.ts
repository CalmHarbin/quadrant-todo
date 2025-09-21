const { contextBridge, ipcRenderer } = require('electron')

// Custom APIs for renderer
const api = {
  // 窗口控制 API
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  quitApp: () => ipcRenderer.invoke('app-quit'),
  show: () => ipcRenderer.invoke('window-show'),
  startDrag: (x: number, y: number) => ipcRenderer.invoke('window-start-drag', x, y),
  setWindowMode: (isWidget: boolean) => ipcRenderer.invoke('window-set-mode', isWidget),
  setPinToDesktop: (isPinned: boolean) => ipcRenderer.invoke('window-set-pin', isPinned),
  setMaximize: (isMaximize: boolean) => ipcRenderer.invoke('window-set-fullscreen', isMaximize),
  resizeWindow: (width: number, height: number) => ipcRenderer.invoke('window-resize', width, height),
  getWindowSize: () => ipcRenderer.invoke('window-get-size'),
  expandDockedWindow: () => ipcRenderer.invoke('window-expand-docked'),
  createModalWindow: (modalType: string, data?: any) => ipcRenderer.invoke('create-modal-window', modalType, data),
  closeModalWindow: (windowId?: number) => ipcRenderer.invoke('close-modal-window', windowId),
  on: (channel: string, func: (...args: any[]) => void) => ipcRenderer.on(channel, func),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
    contextBridge.exposeInMainWorld('ipcRenderer', withPrototype(ipcRenderer))
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
  // @ts-ignore (define in dts)
  window.ipcRenderer = withPrototype(ipcRenderer)
}

function withPrototype(obj: any) {
  const protos = Object.getPrototypeOf(obj)

  for (const [key, value] of Object.entries(protos)) {
    if (typeof value === 'function') {
      // Some native APIs, like `NodeJS.EventEmitter['on']`, don't work in the Renderer process. Wrapping them into a function.
      obj[key] = function (...args: any[]) {
        return value.call(obj, ...args)
      }
    }
  }
  
  // 确保关键方法存在
  if (!obj.on) {
    obj.on = function (channel: string, func: (...args: any[]) => void) {
      return ipcRenderer.on(channel, func)
    }
  }
  
  if (!obj.removeAllListeners) {
    obj.removeAllListeners = function (channel: string) {
      return ipcRenderer.removeAllListeners(channel)
    }
  }
  
  if (!obj.send) {
    obj.send = function (channel: string, ...args: any[]) {
      return ipcRenderer.send(channel, ...args)
    }
  }
  
  if (!obj.invoke) {
    obj.invoke = function (channel: string, ...args: any[]) {
      return ipcRenderer.invoke(channel, ...args)
    }
  }
  
  return obj
}

// 使用 Electron IPC 的数据库 API
const dbAPI = {
  addMemo: async (memo: any) => {
    try {
      const loadResult = await ipcRenderer.invoke('load-data')
      if (!loadResult.success) {
        return { success: false, error: loadResult.error }
      }
      
      const memos = loadResult.data || []
      const newMemo = {
        id: Date.now(),
        title: memo.title,
        content: memo.content,
        quadrant: memo.quadrant,
        created: Date.now(),
        completed: memo.completed || false,
        completedTime: memo.completedTime
      }
      
      memos.push(newMemo)
      const saveResult = await ipcRenderer.invoke('save-data', memos)
      
      if (saveResult.success) {
        return { success: true, id: newMemo.id }
      } else {
        return { success: false, error: saveResult.error }
      }
    } catch (error) {
      console.error('Failed to add memo:', error)
      return { success: false, error: String(error) }
    }
  },
  
  getMemos: async () => {
    try {
      const result = await ipcRenderer.invoke('load-data')
      return result
    } catch (error) {
      console.error('Failed to get memos:', error)
      return { success: false, error: String(error) }
    }
  },
  
  deleteMemo: async (id: number) => {
    try {
      const loadResult = await ipcRenderer.invoke('load-data')
      if (!loadResult.success) {
        return { success: false, error: loadResult.error }
      }
      
      const memos = loadResult.data || []
      const originalLength = memos.length
      const filteredMemos = memos.filter((memo: any) => memo.id !== id)
      
      const saveResult = await ipcRenderer.invoke('save-data', filteredMemos)
      
      if (saveResult.success) {
        return { success: true, changes: originalLength - filteredMemos.length }
      } else {
        return { success: false, error: saveResult.error }
      }
    } catch (error) {
      console.error('Failed to delete memo:', error)
      return { success: false, error: String(error) }
    }
  },

  updateMemo: async (id: number, memo: any) => {
    try {
      const loadResult = await ipcRenderer.invoke('load-data')
      if (!loadResult.success) {
        return { success: false, error: loadResult.error }
      }
      
      const memos = loadResult.data || []
      const index = memos.findIndex((m: any) => m.id === id)
      
      if (index === -1) {
        return { success: false, error: 'Memo not found' }
      }
      
      // 更新字段
      if (memo.title !== undefined) memos[index].title = memo.title
      if (memo.content !== undefined) memos[index].content = memo.content
      if (memo.quadrant !== undefined) memos[index].quadrant = memo.quadrant
      if (memo.completed !== undefined) memos[index].completed = memo.completed
      if (memo.completedTime !== undefined) memos[index].completedTime = memo.completedTime
      if (memo.sortOrder !== undefined) memos[index].sortOrder = memo.sortOrder
      
      const saveResult = await ipcRenderer.invoke('save-data', memos)
      
      if (saveResult.success) {
        return { success: true, changes: 1 }
      } else {
        return { success: false, error: saveResult.error }
      }
    } catch (error) {
      console.error('Failed to update memo:', error)
      return { success: false, error: String(error) }
    }
  },

  // 直接保存数据数组
  saveData: async (data: any[]) => {
    try {
      const result = await ipcRenderer.invoke('save-data', data)
      return result
    } catch (error) {
      console.error('Failed to save data:', error)
      return { success: false, error: String(error) }
    }
  },

  // 清空所有数据
  clearAllData: async () => {
    try {
      const saveResult = await ipcRenderer.invoke('save-data', [])
      
      if (saveResult.success) {
        localStorage.removeItem('theme')
        return { success: true }
      } else {
        return { success: false, error: saveResult.error }
      }
    } catch (error) {
      console.error('Failed to clear data:', error)
      return { success: false, error: String(error) }
    }
  },

  // 保存图片到本地
  saveImage: async (imageData: string, fileName: string = 'image.jpg') => {
    try {
      const result = await ipcRenderer.invoke('save-image', imageData, fileName)
      return result
    } catch (error) {
      console.error('Failed to save image:', error)
      return { success: false, error: String(error) }
    }
  },

  // 获取图片路径
  getImagePath: async (relativePath: string) => {
    try {
      const result = await ipcRenderer.invoke('get-image-path', relativePath)
      return result
    } catch (error) {
      console.error('Failed to get image path:', error)
      return { success: false, error: String(error) }
    }
  },

  // 获取图片的 base64 数据
  getImageBase64: async (relativePath: string) => {
    try {
      const result = await ipcRenderer.invoke('get-image-base64', relativePath)
      return result
    } catch (error) {
      console.error('Failed to get image base64:', error)
      return { success: false, error: String(error) }
    }
  },

  // 导出压缩包
  exportPackage: async (theme: string = 'light') => {
    try {
      const result = await ipcRenderer.invoke('export-package', theme)
      return result
    } catch (error) {
      console.error('Failed to export package:', error)
      return { success: false, error: String(error) }
    }
  },

  // 导入压缩包
  importPackage: async (zipData: Buffer) => {
    try {
      const result = await ipcRenderer.invoke('import-package', zipData)
      return result
    } catch (error) {
      console.error('Failed to import package:', error)
      return { success: false, error: String(error) }
    }
  },

  // 清理无用图片
  cleanupUnusedImages: async () => {
    try {
      const result = await ipcRenderer.invoke('cleanup-unused-images')
      return result
    } catch (error) {
      console.error('Failed to cleanup unused images:', error)
      return { success: false, error: String(error) }
    }
  },

  // 迁移 base64 图片到本地文件
  migrateBase64Images: async () => {
    try {
      const result = await ipcRenderer.invoke('migrate-base64-images')
      return result
    } catch (error) {
      console.error('Failed to migrate base64 images:', error)
      return { success: false, error: String(error) }
    }
  },

  // 获取当前数据存储目录
  getCurrentDataPath: async () => {
    try {
      const result = await ipcRenderer.invoke('get-current-data-path')
      return result
    } catch (error) {
      console.error('Failed to get current data path:', error)
      return { success: false, error: String(error) }
    }
  },

  // 选择数据存储目录
  selectDataDirectory: async () => {
    try {
      const result = await ipcRenderer.invoke('select-data-directory')
      return result
    } catch (error) {
      console.error('Failed to select data directory:', error)
      return { success: false, error: String(error) }
    }
  },

  // 迁移数据到新目录
  migrateDataDirectory: async (newPath: string) => {
    try {
      const result = await ipcRenderer.invoke('migrate-data-directory', newPath)
      return result
    } catch (error) {
      console.error('Failed to migrate data directory:', error)
      return { success: false, error: String(error) }
    }
  },

  // 打开目录
  openDirectory: async (dirPath: string) => {
    try {
      const result = await ipcRenderer.invoke('open-directory', dirPath)
      return result
    } catch (error) {
      console.error('Failed to open directory:', error)
      return { success: false, error: String(error) }
    }
  },

  // 重启应用
  restartApp: async () => {
    try {
      await ipcRenderer.invoke('restart-app')
      return { success: true }
    } catch (error) {
      console.error('Failed to restart app:', error)
      return { success: false, error: String(error) }
    }
  },

  // 立即重启应用
  restartAppNow: () => {
    try {
      ipcRenderer.send('restart-app-now')
      return { success: true }
    } catch (error) {
      console.error('Failed to restart app now:', error)
      return { success: false, error: String(error) }
    }
  },

  // 复制图片到剪贴板
  copyImageToClipboard: async (imageData: string) => {
    try {
      const result = await ipcRenderer.invoke('copy-image-to-clipboard', imageData)
      return result
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error)
      return { success: false, error: String(error) }
    }
  }
}

// Expose database API to renderer
contextBridge.exposeInMainWorld('db', dbAPI)