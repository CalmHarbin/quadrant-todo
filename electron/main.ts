import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import JSZip from 'jszip'
import { app, BrowserWindow, shell, ipcMain, protocol, dialog } from 'electron'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main.js    > Electron main
// │ │ └─┬ preload.js    > Preload scripts
// │ ├─┬ renderer.js > Electron renderer
// │
// ├─┬ dist
// │ └── index.html    > Electron will load this file

process.env.ROOT = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.ROOT, 'dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.ROOT, 'public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (require('os').release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let mainWindow: BrowserWindow | null = null
const preload = path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: '四象限TODO',
    icon: process.env.VITE_PUBLIC ? path.join(process.env.VITE_PUBLIC, 'resources/icon.png') : undefined, // TODO: 确保图标路径正确
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (url) { // electron-vite-vue#298
    mainWindow.loadURL(url)
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(indexHtml)
  }

  // 添加错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL)
  })

  // Test actively push message to the Electron-Renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // TODO: 添加窗口事件监听器
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 注册自定义协议用于加载本地文件
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substr(6) // 移除 'app://' 前缀
    if (url.startsWith('local-file/')) {
      const relativePath = url.substr(11) // 移除 'local-file/' 前缀
      const dataPath = getDataPath()
      const fullPath = path.join(dataPath, relativePath)
      callback({ path: fullPath })
    } else {
      callback({ error: -2 }) // 无效路径
    }
  })
  
  createWindow()
})

app.on('window-all-closed', () => {
  mainWindow = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (mainWindow) {
    // Focus on the main window if the user tried to open another
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0]?.focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// TODO: 添加更多 IPC 处理器用于应用功能

// 数据存储路径
const getDataPath = () => {
  try {
    // 首先尝试从配置文件读取自定义路径
    const configPath = path.join(app.getPath('userData'), 'config.json')
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8')
      const config = JSON.parse(configContent)
      if (config.dataPath && fs.existsSync(config.dataPath)) {
        return config.dataPath
      }
    }
  } catch (error) {
    console.warn('Failed to read config file, using default path:', error)
  }
  
  // 检查旧的数据目录是否存在
  const userDataPath = app.getPath('userData')
  const oldDataDir = path.join(userDataPath, 'QuadrantTodo')
  const newDataDir = userDataPath
  
  console.log('Checking paths:')
  console.log('- userData:', userDataPath)
  console.log('- oldDataDir:', oldDataDir)
  console.log('- newDataDir:', newDataDir)
  
  // 如果旧目录存在且有数据，使用旧目录
  if (fs.existsSync(oldDataDir)) {
    const oldMemosPath = path.join(oldDataDir, 'memos.json')
    const oldImagesDir = path.join(oldDataDir, 'images')
    
    if (fs.existsSync(oldMemosPath) || fs.existsSync(oldImagesDir)) {
      console.log('Found existing data in old directory, using old path')
      return oldDataDir
    }
  }
  
  // 使用新的目录结构
  if (!fs.existsSync(newDataDir)) {
    fs.mkdirSync(newDataDir, { recursive: true })
  }
  
  console.log('Using new data directory:', newDataDir)
  return newDataDir
}

// 数据库文件操作
ipcMain.handle('get-data-path', () => {
  return getDataPath()
})

ipcMain.handle('save-data', async (_, data) => {
  try {
    const dataPath = getDataPath()
    const filePath = path.join(dataPath, 'memos.json')
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    return { success: true }
  } catch (error) {
    console.error('Save data error:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('load-data', async () => {
  try {
    const dataPath = getDataPath()
    const filePath = path.join(dataPath, 'memos.json')
    
    if (!fs.existsSync(filePath)) {
      return { success: true, data: [] }
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8')
    return { success: true, data: JSON.parse(data) }
  } catch (error) {
    console.error('Load data error:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('save-image', async (_, imageData, fileName) => {
  try {
    const dataPath = getDataPath()
    const imagesDir = path.join(dataPath, 'images')
    
    // 确保图片目录存在
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true })
    }
    
    // 生成唯一文件名
    const timestamp = Date.now()
    const extension = path.extname(fileName) || '.jpg'
    const uniqueFileName = `${timestamp}_${Math.random().toString(36).substr(2, 9)}${extension}`
    const filePath = path.join(imagesDir, uniqueFileName)
    
    // 保存图片
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    await fs.promises.writeFile(filePath, base64Data, 'base64')
    
    // 返回相对路径
    return { success: true, path: `images/${uniqueFileName}` }
  } catch (error) {
    console.error('Save image error:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('get-image-path', (_, relativePath) => {
  try {
    const dataPath = getDataPath()
    const fullPath = path.join(dataPath, relativePath)
    
    if (fs.existsSync(fullPath)) {
      return { success: true, path: fullPath }
    }
    
    return { success: false, error: 'Image not found' }
  } catch (error) {
    console.error('Get image path error:', error)
    return { success: false, error: String(error) }
  }
})

// 获取图片的 base64 数据
ipcMain.handle('get-image-base64', async (_, relativePath) => {
  try {
    const dataPath = getDataPath()
    const fullPath = path.join(dataPath, relativePath)
    
    if (fs.existsSync(fullPath)) {
      const imageData = await fs.promises.readFile(fullPath)
      const base64 = `data:image/jpeg;base64,${imageData.toString('base64')}`
      return { success: true, base64 }
    }
    
    return { success: false, error: 'Image not found' }
  } catch (error) {
    console.error('Get image base64 error:', error)
    return { success: false, error: String(error) }
  }
})

// 导出压缩包
ipcMain.handle('export-package', async (_, theme = 'light') => {
  try {
    const dataPath = getDataPath()
    const zip = new JSZip()
    
    console.log('Export: Using data path:', dataPath)
    
    // 添加备忘录数据
    const memosPath = path.join(dataPath, 'memos.json')
    let memosData = []
    if (fs.existsSync(memosPath)) {
      const memosContent = await fs.promises.readFile(memosPath, 'utf8')
      memosData = JSON.parse(memosContent)
      console.log(`Export: Found ${memosData.length} memos`)
    } else {
      console.log('Export: No memos file found at:', memosPath)
    }
    
    // 添加主题设置
    const exportData = {
      version: '2.0.0',
      exportTime: new Date().toISOString(),
      data: {
        memos: memosData,
        theme: theme
      }
    }
    
    zip.file('data.json', JSON.stringify(exportData, null, 2))
    
    // 添加所有图片文件
    const imagesDir = path.join(dataPath, 'images')
    console.log('Export: Checking images directory:', imagesDir)
    
    let addedImages = 0
    if (fs.existsSync(imagesDir)) {
      const imageFiles = await fs.promises.readdir(imagesDir)
      console.log(`Export: Found ${imageFiles.length} files in images directory:`, imageFiles)
      
      for (const fileName of imageFiles) {
        const filePath = path.join(imagesDir, fileName)
        const stats = await fs.promises.stat(filePath)
        
        if (stats.isFile()) {
          const imageData = await fs.promises.readFile(filePath)
          zip.file(`images/${fileName}`, imageData)
          addedImages++
          console.log(`Export: Added image ${fileName} (${stats.size} bytes)`)
        }
      }
    } else {
      console.log('Export: Images directory does not exist:', imagesDir)
    }
    
    console.log(`Export: Total images added to zip: ${addedImages}`)
    
    // 生成压缩包
    const zipData = await zip.generateAsync({ type: 'nodebuffer' })
    console.log(`Export: Generated zip file of ${zipData.length} bytes`)
    
    return { success: true, data: zipData }
  } catch (error) {
    console.error('Export package error:', error)
    return { success: false, error: String(error) }
  }
})

// 导入压缩包
ipcMain.handle('import-package', async (_, zipData) => {
  try {
    const dataPath = getDataPath()
    const zip = new JSZip()
    
    // 加载压缩包
    await zip.loadAsync(zipData)
    
    // 读取数据文件
    const dataFile = zip.file('data.json')
    if (!dataFile) {
      return { success: false, error: '压缩包中没有找到数据文件' }
    }
    
    const dataContent = await dataFile.async('string')
    const importData = JSON.parse(dataContent)
    
    // 验证数据格式
    if (!importData.data || !Array.isArray(importData.data.memos)) {
      return { success: false, error: '数据格式不正确' }
    }
    
    // 清理现有图片目录
    const imagesDir = path.join(dataPath, 'images')
    if (fs.existsSync(imagesDir)) {
      const existingFiles = await fs.promises.readdir(imagesDir)
      for (const fileName of existingFiles) {
        await fs.promises.unlink(path.join(imagesDir, fileName))
      }
    } else {
      await fs.promises.mkdir(imagesDir, { recursive: true })
    }
    
    // 导入所有图片
    const imagesFolder = zip.folder('images')
    if (imagesFolder) {
      const imagePromises: Promise<void>[] = []
      
      imagesFolder.forEach((relativePath, file) => {
        if (!file.dir) {
          imagePromises.push(
            file.async('nodebuffer').then(async (data) => {
              const imagePath = path.join(imagesDir, relativePath)
              await fs.promises.writeFile(imagePath, data)
            })
          )
        }
      })
      
      await Promise.all(imagePromises)
    }
    
    // 保存备忘录数据
    const memosPath = path.join(dataPath, 'memos.json')
    await fs.promises.writeFile(memosPath, JSON.stringify(importData.data.memos, null, 2), 'utf8')
    
    return { 
      success: true, 
      imported: importData.data.memos.length,
      theme: importData.data.theme
    }
  } catch (error) {
    console.error('Import package error:', error)
    return { success: false, error: String(error) }
  }
})

// 清理无用图片
ipcMain.handle('cleanup-unused-images', async () => {
  try {
    const dataPath = getDataPath()
    const imagesDir = path.join(dataPath, 'images')
    
    // 检查图片目录是否存在
    if (!fs.existsSync(imagesDir)) {
      return { success: true, cleaned: 0, message: '图片目录不存在' }
    }
    
    // 读取所有备忘录数据
    const memosPath = path.join(dataPath, 'memos.json')
    let memos = []
    if (fs.existsSync(memosPath)) {
      const memosContent = await fs.promises.readFile(memosPath, 'utf8')
      memos = JSON.parse(memosContent)
    }
    
    // 收集所有正在使用的图片文件名
    const usedImages = new Set<string>()
    memos.forEach((memo: any) => {
      if (memo.content) {
        // 匹配图片路径：app://local-file/images/filename
        const imageMatches = memo.content.match(/app:\/\/local-file\/images\/([^\s"'>]+)/g)
        if (imageMatches) {
          imageMatches.forEach((match: string) => {
            const fileName = match.replace('app://local-file/images/', '')
            usedImages.add(fileName)
          })
        }
      }
    })
    
    // 获取图片目录中的所有文件
    const allImageFiles = await fs.promises.readdir(imagesDir)
    
    // 找出未使用的图片
    const unusedImages = allImageFiles.filter(fileName => {
      const stats = fs.statSync(path.join(imagesDir, fileName))
      return stats.isFile() && !usedImages.has(fileName)
    })
    
    // 删除未使用的图片
    let cleanedCount = 0
    for (const fileName of unusedImages) {
      try {
        await fs.promises.unlink(path.join(imagesDir, fileName))
        cleanedCount++
      } catch (error) {
        console.warn(`Failed to delete image: ${fileName}`, error)
      }
    }
    
    return { 
      success: true, 
      cleaned: cleanedCount,
      total: allImageFiles.length,
      used: usedImages.size,
      message: `清理完成：删除了 ${cleanedCount} 个无用图片，保留了 ${usedImages.size} 个正在使用的图片`
    }
  } catch (error) {
    console.error('Cleanup unused images error:', error)
    return { success: false, error: String(error) }
  }
})

// 获取当前数据存储目录
ipcMain.handle('get-current-data-path', () => {
  try {
    const currentPath = getDataPath()
    const userDataPath = app.getPath('userData')
    
    // 返回更详细的路径信息供调试
    console.log('Debug paths:')
    console.log('- userData:', userDataPath)
    console.log('- currentDataPath:', currentPath)
    
    // 检查是否存在图片目录
    const imagesDir = path.join(currentPath, 'images')
    const imagesExists = fs.existsSync(imagesDir)
    let imageCount = 0
    
    if (imagesExists) {
      try {
        const files = fs.readdirSync(imagesDir)
        imageCount = files.filter(file => {
          const filePath = path.join(imagesDir, file)
          return fs.statSync(filePath).isFile()
        }).length
      } catch (error) {
        console.warn('Failed to count images:', error)
      }
    }
    
    return { 
      success: true, 
      path: currentPath,
      userData: userDataPath,
      imagesDir,
      imagesExists,
      imageCount
    }
  } catch (error) {
    console.error('Get current data path error:', error)
    return { success: false, error: String(error) }
  }
})

// 选择新的数据存储目录
ipcMain.handle('select-data-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择数据存储目录'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] }
    }
    
    return { success: false, canceled: true }
  } catch (error) {
    console.error('Select data directory error:', error)
    return { success: false, error: String(error) }
  }
})

// 迁移数据到新目录
ipcMain.handle('migrate-data-directory', async (_, newPath: string) => {
  try {
    const oldPath = getDataPath()
    
    // 如果新路径和旧路径相同，不需要迁移
    if (oldPath === newPath) {
      return { success: true, message: '目录未更改' }
    }
    
    // 确保新目录存在
    if (!fs.existsSync(newPath)) {
      await fs.promises.mkdir(newPath, { recursive: true })
    }
    
    // 复制数据文件
    const oldMemosPath = path.join(oldPath, 'memos.json')
    const newMemosPath = path.join(newPath, 'memos.json')
    
    if (fs.existsSync(oldMemosPath)) {
      await fs.promises.copyFile(oldMemosPath, newMemosPath)
    }
    
    // 复制图片目录
    const oldImagesDir = path.join(oldPath, 'images')
    const newImagesDir = path.join(newPath, 'images')
    
    if (fs.existsSync(oldImagesDir)) {
      await fs.promises.mkdir(newImagesDir, { recursive: true })
      const imageFiles = await fs.promises.readdir(oldImagesDir)
      
      for (const fileName of imageFiles) {
        const oldFilePath = path.join(oldImagesDir, fileName)
        const newFilePath = path.join(newImagesDir, fileName)
        const stats = await fs.promises.stat(oldFilePath)
        
        if (stats.isFile()) {
          await fs.promises.copyFile(oldFilePath, newFilePath)
        }
      }
    }
    
    // 更新配置文件记录新路径
    const configPath = path.join(app.getPath('userData'), 'config.json')
    const config = {
      dataPath: newPath,
      lastModified: new Date().toISOString()
    }
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8')
    
    return { 
      success: true, 
      message: '数据迁移成功，重启应用后生效',
      oldPath,
      newPath
    }
  } catch (error) {
    console.error('Migrate data directory error:', error)
    return { success: false, error: String(error) }
  }
})

// 数据迁移：将 base64 图片转换为本地文件
ipcMain.handle('migrate-base64-images', async () => {
  try {
    const dataPath = getDataPath()
    const memosPath = path.join(dataPath, 'memos.json')
    
    if (!fs.existsSync(memosPath)) {
      return { success: true, migrated: 0, message: '没有找到数据文件' }
    }
    
    const memosContent = await fs.promises.readFile(memosPath, 'utf8')
    let memosData = JSON.parse(memosContent)
    let migrated = 0
    let hasChanges = false
    
    // 确保 images 目录存在
    const imagesDir = path.join(dataPath, 'images')
    if (!fs.existsSync(imagesDir)) {
      await fs.promises.mkdir(imagesDir, { recursive: true })
    }
    
    // 处理每个备忘录
    for (let i = 0; i < memosData.length; i++) {
      const memo = memosData[i]
      if (memo.content) {
        // 查找 base64 图片
        const base64Regex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g
        let match
        let newContent = memo.content
        
        while ((match = base64Regex.exec(memo.content)) !== null) {
          try {
            const fullMatch = match[0]
            const imageType = match[1] // jpg, png 等
            const base64Data = match[2]
            
            if (!base64Data) continue // 跳过无效数据
            
            // 生成唯一文件名
            const timestamp = Date.now()
            const random = Math.random().toString(36).substr(2, 9)
            const fileName = `migrated_${timestamp}_${random}.${imageType}`
            const filePath = path.join(imagesDir, fileName)
            
            // 保存图片文件
            const imageBuffer = Buffer.from(base64Data, 'base64')
            await fs.promises.writeFile(filePath, imageBuffer)
            
            // 替换为本地文件路径
            const localPath = `app://local-file/images/${fileName}`
            newContent = newContent.replace(fullMatch, fullMatch.replace(
              /src="data:image\/[^;]+;base64,[^"]+"/,
              `src="${localPath}"`
            ))
            
            migrated++
            console.log(`Migrated image ${fileName} (${imageBuffer.length} bytes)`)
          } catch (error) {
            console.warn('Failed to migrate image:', error)
          }
        }
        
        if (newContent !== memo.content) {
          memosData[i].content = newContent
          hasChanges = true
        }
      }
    }
    
    // 如果有变更，保存数据
    if (hasChanges) {
      await fs.promises.writeFile(memosPath, JSON.stringify(memosData, null, 2), 'utf8')
      console.log(`Migration completed: ${migrated} images migrated`)
    }
    
    return {
      success: true,
      migrated,
      message: `成功迁移 ${migrated} 张图片到本地文件`
    }
  } catch (error) {
    console.error('Image migration error:', error)
    return { success: false, error: String(error) }
  }
})

// 打开目录
ipcMain.handle('open-directory', async (_, dirPath: string) => {
  try {
    await shell.openPath(dirPath)
    return { success: true }
  } catch (error) {
    console.error('Open directory error:', error)
    return { success: false, error: String(error) }
  }
})