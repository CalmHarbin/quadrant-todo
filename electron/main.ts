import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import JSZip from 'jszip'
import { app, BrowserWindow, shell, ipcMain, protocol, dialog, Tray, Menu, globalShortcut, nativeImage } from 'electron'

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
let modalWindows: Map<number, BrowserWindow> = new Map() // 存储模态窗口引用
let tray: Tray | null = null
let isQuiting = false

// 窗口吸顶相关状态
let isDocked = false
let originalHeight = 700
let dockedHeight = 40

// 窗口状态保存
interface WindowState {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
  isVisible: boolean
}

let savedWindowState: WindowState | null = null
let saveStateTimer: NodeJS.Timeout | null = null

// 窗口状态存储文件路径
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json')

// 保存窗口状态到文件
function saveWindowStateToFile() {
  if (mainWindow && savedWindowState) {
    try {
      const fs = require('fs')
      fs.writeFileSync(windowStatePath, JSON.stringify(savedWindowState, null, 2))
      console.log('窗口状态已保存到文件:', windowStatePath)
    } catch (error) {
      console.error('保存窗口状态失败:', error)
    }
  }
}

// 从文件加载窗口状态
function loadWindowStateFromFile(): WindowState | null {
  try {
    const fs = require('fs')
    if (fs.existsSync(windowStatePath)) {
      const data = fs.readFileSync(windowStatePath, 'utf8')
      const state = JSON.parse(data) as WindowState
      console.log('从文件加载窗口状态:', state)
      return state
    }
  } catch (error) {
    console.error('加载窗口状态失败:', error)
  }
  return null
}

// 保存窗口状态（带防抖）
function saveWindowState() {
  if (mainWindow) {
    // 清除之前的定时器
    if (saveStateTimer) {
      clearTimeout(saveStateTimer)
    }
    
    // 延迟保存，避免频繁操作
    saveStateTimer = setTimeout(() => {
      const bounds = mainWindow!.getBounds()
      savedWindowState = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: mainWindow!.isMaximized(),
        isVisible: mainWindow!.isVisible()
      }
      console.log('保存窗口状态:', savedWindowState)
      // 保存到文件
      saveWindowStateToFile()
      saveStateTimer = null
    }, 100) // 100ms 防抖
  }
}

// 恢复窗口状态
function restoreWindowState() {
  if (mainWindow && savedWindowState) {
    console.log('恢复窗口状态:', savedWindowState)
    mainWindow.setBounds({
      x: savedWindowState.x,
      y: savedWindowState.y,
      width: savedWindowState.width,
      height: savedWindowState.height
    })
    if (savedWindowState.isMaximized) {
      mainWindow.maximize()
    }
  }
}

const preload = path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

async function createWindow() {
  // 尝试从文件加载窗口状态
  const savedState = loadWindowStateFromFile()
  
  // 默认窗口配置
  const defaultConfig = {
    title: '四象限TODO',
    icon: path.join(process.env.ROOT, 'resources/icon.png'),
    width: 450,
    height: 500,
    minWidth: 410, // 调整最小宽度为 400px
    minHeight: 40, // 允许折叠到 40px 高度
    frame: false, // 移除窗口边框和标题栏
    transparent: false, // 不透明背景
    alwaysOnTop: false, // 默认不始终置顶，避免遮挡任务栏 (修复任务栏遮挡问题)
    skipTaskbar: false, // 显示在任务栏，避免点击外部区域时隐藏
    resizable: true, // 允许调整大小
    movable: true, // 允许移动
    minimizable: true, // 允许最小化
    maximizable: true, // 允许最大化
    fullscreenable: false, // 禁用全屏功能，使用最大化替代
  }
  
  // 如果有保存的状态，使用保存的状态
  const windowConfig = savedState ? {
    ...defaultConfig,
    x: savedState.x,
    y: savedState.y,
    width: savedState.width,
    height: savedState.height,
    show: false // 先不显示，等恢复状态后再显示
  } : defaultConfig
  
  mainWindow = new BrowserWindow({
    ...windowConfig,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true,
      // 启用剪贴板权限 - 使用更安全的方式
      webSecurity: true,
      allowRunningInsecureContent: false,
      // 移除 experimentalFeatures 以消除安全警告
      // 剪贴板功能通过 IPC 和 preload 脚本实现
    },
  })

  // 设置 Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob: app:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' ws: wss:; " +
          "media-src 'self' data: blob:; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self'; " +
          "frame-ancestors 'none';"
        ]
      }
    })
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
    
    // 如果有保存的状态，恢复窗口状态
    if (savedState) {
      savedWindowState = savedState
      restoreWindowState()
    }
    
    // 窗口已创建完成
    
    // 显示窗口
    mainWindow?.show()
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

  // 最小化时隐藏窗口而非真正最小化
  mainWindow.on('minimize', (event: any) => {
    event.preventDefault()
    mainWindow?.hide()
  })

  // 窗口显示时通知渲染进程
  mainWindow.on('show', () => {
    mainWindow?.webContents.send('window-shown')
  })

  // 防止意外关闭
  mainWindow.on('close', (event: any) => {
    console.log('窗口关闭事件触发，isQuiting:', isQuiting)
    if (!isQuiting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // 添加窗口失去焦点监听器（调试用）
  mainWindow.on('blur', () => {
    console.log('窗口失去焦点')
  })

  // 添加窗口获得焦点监听器（调试用）
  mainWindow.on('focus', () => {
    console.log('窗口获得焦点')
  })

  // 监听窗口移动事件
  mainWindow.on('move', () => {
    if (mainWindow) {
      const position = mainWindow.getPosition()
      // 发送窗口位置变化事件到渲染进程
      mainWindow.webContents.send('window-moved', { x: position[0], y: position[1] })
      // 实时保存窗口状态
      saveWindowState()
    }
  })
  
  // 监听窗口移动过程中的实时位置变化
  let moveTimer: NodeJS.Timeout | null = null
  mainWindow.on('will-move', () => {
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(() => {
      if (mainWindow) {
        const position = mainWindow.getPosition()
        // 发送窗口位置变化事件到渲染进程
        mainWindow.webContents.send('window-moved', { x: position[0], y: position[1] })
        // 实时保存窗口状态
        saveWindowState()
      }
      moveTimer = null
    }, 50)
  })

  // 窗口拖拽到顶部自动吸顶和收起功能
  
  // 步骤1：判断是否到达顶部，到达之后触发吸顶
  const checkDockToTop = () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition()
      const [width, height] = mainWindow.getSize()
      
      // 检测是否拖拽到屏幕顶部
      if (y !== undefined && y <= 0 && !isDocked) {
        console.log('检测到窗口到达顶部，触发吸顶')
        dockWindow()
      } else if (y !== undefined && y > 50 && isDocked) {
        console.log('检测到窗口离开顶部，取消吸顶')
        undockWindow()
      }
    }
  }
  
  // 步骤2：执行收起的公共方法
  const dockWindow = () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition()
      const [width, height] = mainWindow.getSize()
      
      isDocked = true
      originalHeight = height
      
      // 收起窗口到顶部
      mainWindow.setBounds({
        x: x,
        y: 0,
        width: width,
        height: dockedHeight
      })
      
      // 设置窗口为始终置顶
      mainWindow.setAlwaysOnTop(true)
      
      // 通知渲染进程窗口已吸顶，并传递原始高度信息
      mainWindow.webContents.send('window-docked', { 
        docked: true, 
        originalHeight: height,
        originalWidth: width
      })
      
      console.log('窗口已吸顶并收起，原始高度:', height)
    }
  }
  
  // 取消吸顶的公共方法
  const undockWindow = () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition()
      const [width] = mainWindow.getSize()
      
      isDocked = false
      
      // 恢复窗口高度
      mainWindow.setBounds({
        x: x,
        y: y,
        width: width,
        height: originalHeight
      })
      
      // 取消始终置顶
      mainWindow.setAlwaysOnTop(false)
      
      // 通知渲染进程窗口已取消吸顶，并传递恢复的尺寸信息
      mainWindow.webContents.send('window-docked', { 
        docked: false,
        originalHeight: originalHeight,
        originalWidth: width
      })
      
      console.log('窗口已取消吸顶，恢复高度:', originalHeight)
    }
  }
  
  // 监听窗口移动事件
  mainWindow.on('move', checkDockToTop)

  // 监听窗口大小变化事件
  mainWindow.on('resize', () => {
    if (mainWindow) {
      // 实时保存窗口状态
      saveWindowState()
    }
  })

  // 监听窗口最大化/还原事件
  mainWindow.on('maximize', () => {
    if (mainWindow) {
      // 实时保存窗口状态
      saveWindowState()
    }
  })

  mainWindow.on('unmaximize', () => {
    if (mainWindow) {
      // 实时保存窗口状态
      saveWindowState()
    }
  })
  
  // 监听窗口拖拽开始和结束事件
  let isWindowDragging = false
  
  ipcMain.on('window-drag-start', () => {
    console.log('Window drag started')
    isWindowDragging = true
  })
  
  ipcMain.on('window-drag-end', () => {
    console.log('Window drag ended')
    isWindowDragging = false
  })
  
  // 定期检查窗口位置，检测是否拖拽到顶部
  setInterval(() => {
    if (mainWindow && isWindowDragging) {
      try {
        const position = mainWindow.getPosition()
        const bounds = mainWindow.getBounds()
        
        // 检查窗口是否接近屏幕顶部
        if (position && position[1] !== undefined && position[1] < 10) {
          // 发送窗口位置变化事件到渲染进程
          mainWindow.webContents.send('window-moved', { x: position[0], y: position[1], bounds })
        }
      } catch (error) {
        console.warn('Failed to get window position:', error)
      }
    }
  }, 100)
}

// 创建系统托盘
function createTray() {
  // 创建一个简单的托盘图标
  try {
    let iconLoaded = false
    
    // 先尝试加载自定义图标
    const possibleIconPaths = [
      path.join(__dirname, '../resources/icon.png'),
      path.join(process.cwd(), 'resources/icon.png'),
      path.join(__dirname, '../../resources/icon.png'),
      path.join(process.env.VITE_PUBLIC || '', 'resources/icon.png')
    ]
    
    for (const iconPath of possibleIconPaths) {
      if (fs.existsSync(iconPath)) {
        try {
          tray = new Tray(iconPath)
          console.log('Tray icon loaded successfully from:', iconPath)
          iconLoaded = true
          break
        } catch (error) {
          console.warn('Failed to load icon from:', iconPath, error)
        }
      } else {
        console.log('Icon not found at:', iconPath)
      }
    }
    
    // 如果自定义图标加载失败，使用 Base64 临时图标
    if (!iconLoaded) {
      const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAACBJREFUOBFjZKAC+M8ABYyMo8AoBUYpMEqBUQqMUmCUAgwAAGYgAf9p3LEAAAAASUVORK5CYII='
      
      const icon = nativeImage.createFromDataURL(iconBase64)
      
      if (!icon.isEmpty()) {
        tray = new Tray(icon)
        console.log('Tray icon created with temporary base64 icon')
        iconLoaded = true
      }
    }
    
    // 最后的回退方案
    if (!iconLoaded) {
      const tempIcon = nativeImage.createEmpty()
      tempIcon.resize({ width: 16, height: 16 })
      tray = new Tray(tempIcon)
      console.log('Tray icon created as empty canvas (fallback)')
    }
    
  } catch (error) {
    console.error('Failed to create tray icon:', error)
    // 最后的回退方案
    const fallbackIcon = nativeImage.createEmpty()
    fallbackIcon.resize({ width: 16, height: 16 })
    tray = new Tray(fallbackIcon)
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          // 显示窗口时恢复状态
          restoreWindowState()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '隐藏窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.hide()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuiting = true
        app.quit()
      }
    }
  ])
  
  if (tray) {
    tray.setToolTip('四象限 TODO')
    tray.setContextMenu(contextMenu)
    
    // 双击托盘图标显示/隐藏窗口
    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          // 显示窗口时恢复状态
          restoreWindowState()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
  }
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
  createTray()
  
  // 注册全局快捷键 Ctrl+Shift+T 显示/隐藏窗口
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        // 显示窗口时恢复状态
        restoreWindowState()
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
  
  // 注册 ESC 键退出最大化
  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      // 发送事件通知渲染进程更新状态
      mainWindow.webContents.send('fullscreen-changed', false)
    }
  })
})

app.on('window-all-closed', () => {
  // 在 macOS 上，即使所有窗口关闭，应用也不退出
  if (process.platform !== 'darwin') {
    // 在其他平台上，保持应用运行以便从托盘恢复
    // app.quit()
  }
  mainWindow = null
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

// 应用退出时清理资源
app.on('before-quit', () => {
  isQuiting = true
  globalShortcut.unregisterAll()
  
  // 保存窗口状态
  if (mainWindow) {
    const bounds = mainWindow.getBounds()
    savedWindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: mainWindow.isMaximized(),
      isVisible: mainWindow.isVisible()
    }
    saveWindowStateToFile()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      // 启用剪贴板权限 - 使用更安全的方式
      webSecurity: true,
      allowRunningInsecureContent: false,
      // 移除 experimentalFeatures 以消除安全警告
      // 剪贴板功能通过 IPC 和 preload 脚本实现
    },
  })

  // 为子窗口设置 Content Security Policy
  childWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob: app:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' ws: wss:; " +
          "media-src 'self' data: blob:; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self'; " +
          "frame-ancestors 'none';"
        ]
      }
    })
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
    
    // 验证数据格式
    if (!Array.isArray(data)) {
      console.error('保存的数据不是数组格式:', typeof data)
      return { success: false, error: '数据格式错误：期望数组' }
    }
    
    // 确保数据目录存在
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true })
    }
    
    // 生成 JSON 字符串并验证
    const jsonString = JSON.stringify(data, null, 2)
    
    // 验证生成的 JSON 是否可以正确解析
    try {
      JSON.parse(jsonString)
    } catch (parseError) {
      console.error('生成的 JSON 格式无效:', parseError)
      return { success: false, error: '生成的 JSON 格式无效' }
    }
    
    // 写入文件
    await fs.promises.writeFile(filePath, jsonString, 'utf8')
    console.log('数据保存成功，记录数:', data.length)
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
    
    // 验证 JSON 格式
    if (!data.trim()) {
      console.warn('JSON 文件为空，返回空数组')
      return { success: true, data: [] }
    }
    
    try {
      const parsedData = JSON.parse(data)
      console.log('成功解析 JSON 数据，记录数:', Array.isArray(parsedData) ? parsedData.length : '非数组')
      return { success: true, data: parsedData }
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError)
      console.error('问题数据位置:', (parseError as Error).message)
      console.error('文件内容预览:', data.substring(0, 1000))
      
      // 尝试修复 JSON 格式
      try {
        // 移除可能的 BOM 标记
        const cleanData = data.replace(/^\uFEFF/, '')
        const parsedData = JSON.parse(cleanData)
        console.log('修复后成功解析 JSON 数据')
        return { success: true, data: parsedData }
      } catch (fixError) {
        console.error('JSON 修复失败:', fixError)
        // 返回空数组而不是失败
        console.warn('返回空数组以避免应用崩溃')
        return { success: true, data: [] }
      }
    }
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
            console.log('发现使用的图片:', fileName)
          })
        }
      }
    })
    
    console.log('正在使用的图片数量:', usedImages.size)
    console.log('正在使用的图片列表:', Array.from(usedImages))
    
    // 获取图片目录中的所有文件
    const allImageFiles = await fs.promises.readdir(imagesDir)
    console.log('图片目录中的所有文件数量:', allImageFiles.length)
    console.log('图片目录中的所有文件列表:', allImageFiles)
    
    // 找出未使用的图片
    const unusedImages = allImageFiles.filter(fileName => {
      const stats = fs.statSync(path.join(imagesDir, fileName))
      const isUnused = stats.isFile() && !usedImages.has(fileName)
      if (isUnused) {
        console.log('发现无用图片:', fileName)
      }
      return isUnused
    })
    
    console.log('无用图片数量:', unusedImages.length)
    console.log('无用图片列表:', unusedImages)
    
    // 删除未使用的图片
    let cleanedCount = 0
    for (const fileName of unusedImages) {
      try {
        console.log('正在删除图片:', fileName)
        await fs.promises.unlink(path.join(imagesDir, fileName))
        cleanedCount++
        console.log('成功删除图片:', fileName)
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

// 重启应用
ipcMain.handle('restart-app', async () => {
  try {
    console.log('收到重启应用请求')
    // 重启应用
    app.relaunch()
    app.exit(0)
    return { success: true }
  } catch (error) {
    console.error('Restart app error:', error)
    return { success: false, error: String(error) }
  }
})

// 重启应用 (使用 on 方法)
ipcMain.on('restart-app-now', () => {
  console.log('立即重启应用')
  app.relaunch()
  app.exit(0)
})

// 复制图片到剪贴板
ipcMain.handle('copy-image-to-clipboard', async (_, imageData: string) => {
  try {
    const { clipboard } = require('electron')
    
    // 将base64数据转换为Buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')
    
    // 创建NativeImage对象
    const nativeImage = require('electron').nativeImage.createFromBuffer(imageBuffer)
    
    // 复制到剪贴板
    clipboard.writeImage(nativeImage)
    
    return { success: true }
  } catch (error) {
    console.error('复制图片到剪贴板失败:', error)
    return { success: false, error: String(error) }
  }
})

// 窗口控制 IPC 处理器
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.hide() // 隐藏而非最小化
  }
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.hide() // 隐藏而非关闭
  }
})

ipcMain.handle('app-quit', () => {
  isQuiting = true
  app.quit()
})

ipcMain.handle('window-show', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

ipcMain.handle('window-start-drag', (_, startX: number, startY: number) => {
  if (mainWindow) {
    // 使用 Electron 的原生拖拽功能
    // 通过设置拖拽区域来实现窗口拖拽
    const windowPos = mainWindow.getPosition()
    const dragStartX = startX - windowPos[0]
    const dragStartY = startY - windowPos[1]
    
    // 发送拖拽开始事件
    mainWindow.webContents.send('window-drag-start')
    
    // 使用全局鼠标事件监听来实现拖拽
    const handleGlobalMouseMove = (event: any) => {
      if (event.screenX !== undefined && event.screenY !== undefined) {
        const newX = event.screenX - dragStartX
        const newY = event.screenY - dragStartY
        mainWindow.setPosition(newX, newY)
      }
    }
    
    const handleGlobalMouseUp = () => {
      // 移除全局事件监听器
      mainWindow.webContents.removeListener('before-input-event', handleGlobalMouseMove)
      mainWindow.webContents.removeListener('before-input-event', handleGlobalMouseUp)
      mainWindow.webContents.send('window-drag-end')
    }
    
    // 添加全局事件监听器
    mainWindow.webContents.on('before-input-event', handleGlobalMouseMove)
    mainWindow.webContents.on('before-input-event', handleGlobalMouseUp)
    
    return { success: true }
  }
  return { success: false }
})

ipcMain.handle('window-set-mode', (_, isWidget: boolean) => {
  if (mainWindow) {
    if (isWidget) {
      // 桌面小组件模式 - 默认不置顶，需要手动固定到桌面
      mainWindow.setAlwaysOnTop(false) // 桌面小组件模式默认不置顶
      mainWindow.setSkipTaskbar(true) // 桌面小组件模式不显示在任务栏
      mainWindow.setResizable(true)  // 保持可调整大小
      mainWindow.setMinimizable(true)
      mainWindow.setMaximizable(true)  // 允许最大化 (修复窗口大小问题)
      mainWindow.setFullScreenable(true) // 修复：即使在小组件模式下也允许全屏
    } else {
      // 普通窗口模式
      mainWindow.setAlwaysOnTop(false)
      mainWindow.setSkipTaskbar(false) // 普通窗口模式显示在任务栏
      mainWindow.setResizable(true)
      mainWindow.setMinimizable(true)
      mainWindow.setMaximizable(true)
      mainWindow.setFullScreenable(true)
    }
    return { success: true }
  }
  return { success: false }
})

// 设置固定到桌面
ipcMain.handle('window-set-pin', (_, isPinned: boolean) => {
  if (mainWindow) {
    if (isPinned) {
      // 固定到桌面（类似桌面小组件）
      mainWindow.setAlwaysOnTop(true)
      // 可以考虑设置为粘性窗口，但在 Windows 上可能需要额外的处理
    } else {
      // 取消固定
      mainWindow.setAlwaysOnTop(false)
    }
    return { success: true }
  }
  return { success: false }
})

// 设置窗口最大化（替换原来的全屏功能）
ipcMain.handle('window-set-fullscreen', (_, isFullscreen: boolean) => {
  if (mainWindow) {
    if (isFullscreen) {
      // 进入最大化模式（而不是全屏）
      mainWindow.maximize()
    } else {
      // 退出最大化模式
      mainWindow.unmaximize()
    }
    
    // 发送状态变化事件到渲染进程
    const actualFullscreenState = mainWindow.isMaximized()
    mainWindow.webContents.send('fullscreen-changed', actualFullscreenState)
    
    return { success: true, isFullscreen: actualFullscreenState }
  }
  return { success: false }
})

// 调整窗口大小
ipcMain.handle('window-resize', (_, width: number, height: number) => {
  if (mainWindow) {
    console.log('调整窗口大小到:', width, 'x', height)
    mainWindow.setSize(width, height)
    const newSize = mainWindow.getSize()
    console.log('窗口大小已调整为:', newSize[0], 'x', newSize[1])
    return { success: true, actualSize: { width: newSize[0], height: newSize[1] } }
  }
  console.log('窗口不存在，无法调整大小')
  return { success: false }
})

// 获取当前窗口大小
ipcMain.handle('window-get-size', () => {
  if (mainWindow) {
    const size = mainWindow.getSize()
    return { success: true, width: size[0], height: size[1] }
  }
  return { success: false }
})

// 展开吸顶的窗口
ipcMain.handle('window-expand-docked', () => {
  if (mainWindow && isDocked) {
    const [x, y] = mainWindow.getPosition()
    const [width] = mainWindow.getSize()
    
    // 临时取消吸顶状态，但保持置顶
    isDocked = false
    
    // 恢复窗口高度
    mainWindow.setBounds({
      x: x,
      y: 0,
      width: width,
      height: originalHeight
    })
    
    // 保持始终置顶状态
    mainWindow.setAlwaysOnTop(true)
    
    // 通知渲染进程窗口已展开，并传递恢复的尺寸信息
    mainWindow.webContents.send('window-docked', { 
      docked: false, 
      expanded: true,
      originalHeight: originalHeight,
      originalWidth: width
    })
    
    console.log('吸顶窗口已展开，恢复高度:', originalHeight)
    return true
  }
  return false
})

// 创建独立窗口显示弹框内容
ipcMain.handle('create-modal-window', (_, modalType: string, data?: any) => {
  try {
    const modalWindow = new BrowserWindow({
      width: getModalSize(modalType).width,
      height: getModalSize(modalType).height,
      minWidth: getModalSize(modalType).width,
      minHeight: getModalSize(modalType).height,
      maxWidth: getModalSize(modalType).width,
      maxHeight: getModalSize(modalType).height,
      frame: false, // 隐藏标题栏和菜单栏
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      alwaysOnTop: false, // 允许其他应用覆盖弹框窗口
      webPreferences: {
        preload,
        nodeIntegration: false,
        contextIsolation: true,
        // 启用剪贴板权限 - 使用更安全的方式
        webSecurity: true,
        allowRunningInsecureContent: false,
        // 移除 experimentalFeatures 以消除安全警告
        // 剪贴板功能通过 IPC 和 preload 脚本实现
      },
      title: getModalTitle(modalType),
      icon: path.join(process.env.ROOT, 'resources/icon.png'),
    })

    // 为模态窗口设置 Content Security Policy
    modalWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' data: blob:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob: app:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' ws: wss:; " +
            "media-src 'self' data: blob:; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "frame-ancestors 'none';"
          ]
        }
      })
    })

    // 构建 URL 参数
    let urlParams = `modal=${modalType}`
    if (data) {
      // 将数据编码为 URL 参数
      const dataStr = encodeURIComponent(JSON.stringify(data))
      urlParams += `&data=${dataStr}`
    }

    // 加载页面
    if (process.env.VITE_DEV_SERVER_URL) {
      modalWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#${urlParams}`)
    } else {
      modalWindow.loadFile(indexHtml, { hash: urlParams })
    }

    // 存储窗口引用
    modalWindows.set(modalWindow.id, modalWindow)

    // 窗口关闭时清理
    modalWindow.on('closed', () => {
      // 从映射中移除窗口引用
      modalWindows.delete(modalWindow.id)
    })

    // 居中显示
    modalWindow.center()

    return { success: true, windowId: modalWindow.id }
  } catch (error) {
    console.error('创建模态窗口失败:', error)
    return { success: false, error: error.message }
  }
})

// 关闭模态框窗口
ipcMain.handle('close-modal-window', (_, windowId?: number) => {
  try {
    if (windowId && modalWindows.has(windowId)) {
      // 关闭指定的模态框窗口
      const modalWindow = modalWindows.get(windowId)
      if (modalWindow && !modalWindow.isDestroyed()) {
        modalWindow.close()
      }
    } else {
      // 关闭所有模态框窗口
      modalWindows.forEach((window) => {
        if (!window.isDestroyed()) {
          window.close()
        }
      })
      modalWindows.clear()
    }
    return { success: true }
  } catch (error) {
    console.error('关闭模态窗口失败:', error)
    return { success: false, error: error.message }
  }
})

// 获取模态窗口尺寸（无边框窗口，尺寸更精确）
function getModalSize(modalType: string): { width: number; height: number } {
  switch (modalType) {
    case 'drag-help':
      return { width: 800, height: 700 }
    case 'settings':
      return { width: 800, height: 600 }
    case 'data-manage':
      return { width: 600, height: 500 }
    case 'edit-memo':
      return { width: 900, height: 700 }
    case 'completed-memos':
      return { width: 900, height: 600 }
    case 'completed-memo-detail':
      return { width: 1000, height: 800 }
    default:
      return { width: 600, height: 400 }
  }
}

// 获取模态窗口标题
function getModalTitle(modalType: string): string {
  switch (modalType) {
    case 'drag-help':
      return '系统功能说明 - 四象限TODO'
    case 'settings':
      return '应用设置 - 四象限TODO'
    case 'data-manage':
      return '数据管理 - 四象限TODO'
    case 'edit-memo':
      return '编辑待办 - 四象限TODO'
    case 'completed-memos':
      return '已完成的待办 - 四象限TODO'
    case 'completed-memo-detail':
      return '已完成待办详情 - 四象限TODO'
    default:
      return '弹框 - 四象限TODO'
  }
}
