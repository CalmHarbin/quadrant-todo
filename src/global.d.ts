// 全局类型声明文件

// Window 接口扩展
declare global {
  interface Window {
    // 数据库 API
    db: {
      addMemo: (memo: {
        title: string
        content: string
        quadrant: string
      }) => Promise<{ success: boolean; id?: number; error?: string }>
      
      getMemos: () => Promise<{
        success: boolean
        data?: Memo[]
        error?: string
      }>
      
      deleteMemo: (id: number) => Promise<{
        success: boolean
        changes?: number
        error?: string
      }>
      
      updateMemo: (id: number, memo: {
        title?: string
        content?: string
        quadrant?: string
        completed?: boolean
        completedTime?: number
        sortOrder?: number
      }) => Promise<{
        success: boolean
        changes?: number
        error?: string
      }>
      
      exportPackage: (theme?: string) => Promise<{
        success: boolean
        data?: ArrayBuffer
        error?: string
      }>
      
      importPackage: (zipData: Uint8Array) => Promise<{
        success: boolean
        imported?: number
        theme?: string
        error?: string
      }>
      
      clearAllData: () => Promise<{
        success: boolean
        error?: string
      }>
      
      saveImage: (imageData: string, fileName?: string) => Promise<{
        success: boolean
        path?: string
        error?: string
      }>
      
      getImagePath: (relativePath: string) => Promise<{
        success: boolean
        path?: string
        error?: string
      }>
      
      getImageBase64: (relativePath: string) => Promise<{
        success: boolean
        base64?: string
        error?: string
      }>
      
      cleanupUnusedImages: () => Promise<{
        success: boolean
        cleaned?: number
        total?: number
        used?: number
        message?: string
        error?: string
      }>
      
      migrateBase64Images: () => Promise<{
        success: boolean
        migrated?: number
        message?: string
        error?: string
      }>
      
      getCurrentDataPath: () => Promise<{
        success: boolean
        path?: string
        userData?: string
        imagesDir?: string
        imagesExists?: boolean
        imageCount?: number
        error?: string
      }>
      
      selectDataDirectory: () => Promise<{
        success: boolean
        path?: string
        canceled?: boolean
        error?: string
      }>
      
      migrateDataDirectory: (newPath: string) => Promise<{
        success: boolean
        message?: string
        oldPath?: string
        newPath?: string
        error?: string
      }>
      
      openDirectory: (dirPath: string) => Promise<{
        success: boolean
        error?: string
      }>
    }
    
    // Electron API
    electronAPI: any
    ipcRenderer: any
  }
}

// 备忘录数据类型
export interface Memo {
  id?: number
  title: string
  content: string
  quadrant: 'urgent-important' | 'important-not-urgent' | 'urgent-not-important' | 'not-urgent-not-important'
  created?: number
  completed?: boolean
  completedTime?: number
  sortOrder?: number
}

// 象限类型
export type QuadrantType = 'urgent-important' | 'important-not-urgent' | 'urgent-not-important' | 'not-urgent-not-important'

// 数据库操作结果类型
export interface DbResult<T = any> {
  success: boolean
  data?: T
  error?: string
  id?: number
  changes?: number
}

// TODO: 添加更多应用相关的类型定义
export interface AppSettings {
  theme: 'light' | 'dark'
  language: 'zh-CN' | 'en-US'
  autoSave: boolean
  fontSize: 'small' | 'medium' | 'large'
}

export interface SearchResult {
  memos: Memo[]
  total: number
  page: number
  pageSize: number
}

// 组件 Props 类型
export interface MemoCardProps {
  memo: Memo
  onEdit: (memo: Memo) => void
  onDelete: (id: number) => void
}

export interface QuadrantProps {
  title: string
  type: QuadrantType
  memos: Memo[]
  onAddMemo: (quadrant: QuadrantType) => void
  onEditMemo: (memo: Memo) => void
  onDeleteMemo: (id: number) => void
}

// 表单数据类型
export interface MemoFormData {
  title: string
  content: string
  quadrant: QuadrantType
}

// Milkdown 编辑器相关类型（预留）
export interface EditorConfig {
  placeholder?: string
  theme?: 'light' | 'dark'
  readonly?: boolean
  toolbar?: boolean
}

export {}