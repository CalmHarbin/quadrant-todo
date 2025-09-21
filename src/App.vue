<template>
    <n-config-provider>
        <n-message-provider>
            <n-dialog-provider>
                <div class="app" :data-theme="isDark ? 'dark' : 'light'" 
                     :class="{ 'collapsed': isCollapsed, 'expanded': isExpanded }">
                    <!-- 自定义标题栏 -->
                    <!-- 自定义标题栏 -->
                    <div class="custom-titlebar" 
                         v-if="!isModalWindow"
                         @mouseenter="handleTitlebarMouseEnter"
                         @mouseleave="handleTitlebarMouseLeave"
                         ref="titlebarRef">
                        <div class="titlebar-left">
                            <div class="app-icon">🎯</div>
                            <span class="titlebar-title">四象限 TODO</span>
                        </div>
                        <div class="titlebar-right">
                            <button
                                class="titlebar-btn toggle-btn"
                                @click="toggleExpandCollapse"
                                :title="isExpanded ? '折叠' : '展开'"
                            >
                                <span class="btn-icon">{{ isExpanded ? '⬇️' : '⬆️' }}</span>
                            </button>
                            <button
                                class="titlebar-btn help-btn"
                                @click="showModalContent('drag-help')"
                                title="系统功能说明"
                            >
                                <span class="btn-icon">❓</span>
                            </button>
                            <button
                                class="titlebar-btn completed-btn"
                                @click="openCompletedMemosWindow"
                                title="已完成的待办"
                            >
                                <span class="btn-icon">📋</span>
                            </button>
                            <div class="titlebar-dropdown" 
                                 @mouseenter="handleMenuEnter" 
                                 @mouseleave="handleMenuLeave">
                                <button
                                    class="titlebar-btn more-btn"
                                    title="更多"
                                >
                                    <span class="btn-icon">⋯</span>
                                </button>
                                <div class="dropdown-menu" 
                                     v-show="showMoreMenu">
                                    <button
                                        class="dropdown-item"
                                        @click="toggleWindowMode"
                                    >
                                        {{ isWidgetMode ? '切换到普通窗口' : '切换到桌面小组件' }}
                                    </button>
                                    <button
                                        class="dropdown-item"
                                        @click="togglePinToDesktop"
                                        v-show="isWidgetMode"
                                    >
                                        {{ isPinToDesktop ? '取消固定到桌面' : '固定到桌面' }}
                                    </button>
                                    <button
                                        class="dropdown-item"
                                        @click="openDataManageWindow"
                                    >
                                        数据管理
                                    </button>
                                    <button
                                        class="dropdown-item"
                                        @click="openSettingsWindow"
                                    >
                                        设置
                                    </button>
                                    <button
                                        class="dropdown-item"
                                        @click="toggleTheme"
                                    >
                                        {{ isDark ? '浅色主题' : '深色主题' }}
                                    </button>
                                </div>
                            </div>
                            <button
                                class="titlebar-btn minimize-btn"
                                @click="minimizeWindow"
                                title="隐藏窗口（Ctrl+Shift+T 恢复）"
                            >
                                <span class="btn-icon">―</span>
                            </button>
                            <button
                                class="titlebar-btn fullscreen-btn"
                                @click="autoExpand(); toggleMaximize()"
                                title="最大化/还原"
                            >
                                <span class="btn-icon">⛶️</span>
                            </button>
                            <button
                                class="titlebar-btn close-btn"
                                @click="closeWindow"
                                title="关闭"
                            >
                                <span class="btn-icon">×</span>
                            </button>
                        </div>
                    </div>

                    <!-- 主要内容区域 -->
                    <div class="main-content" v-if="showMainContent">
                        <!-- 四象限网格 -->
                        <CrossQuadrantDraggable
                            :memos="memos"
                            @update-order="handleUpdateOrder"
                            @move-between-quadrants="handleMoveBetweenQuadrants"
                            @add-memo="handleAddMemo"
                            @edit="handleEditMemo"
                            @toggle-complete="toggleMemoComplete"
                            @delete="deleteMemo"
                        />



                    </div>

                </div>
            </n-dialog-provider>
        </n-message-provider>
        
        <!-- 模态框容器 -->
        <div class="modal-container" :style="{ display: isModalWindow ? 'block' : 'none' }">
            <!-- 系统功能说明 -->
            <DragHelpModal 
                v-if="currentModalType === 'drag-help'"
                @close="closeModalWindow"
            />
            
            <!-- 设置 -->
            <SettingsModal 
                v-if="currentModalType === 'settings'"
                :app-version="appVersion"
                :build-time="buildTime"
                :current-data-path="currentDataPath"
                @close="closeModalWindow"
                @selectDataDirectory="selectNewDataDirectory"
                @openDataDirectory="openDataDirectory"
            />
            
            <!-- 数据管理 -->
            <DataManageModal 
                v-if="currentModalType === 'data-manage'"
                :memos="memos"
                :getQuadrantMemos="getQuadrantMemos"
                :showMessage="showMessage"
                :loadMemos="loadMemos"
                @close="closeModalWindow"
                @dataCleared="handleDataCleared"
                @themeChanged="handleThemeChanged"
            />
            
            <!-- 已完成待办 -->
            <CompletedMemosModal 
                v-if="currentModalType === 'completed-memos'"
                :completed-memos="getCompletedMemos()"
                :get-completed-memos="getCompletedMemos"
                :getQuadrantName="getQuadrantName"
                :formatCompletedTime="formatCompletedTime"
                @close="closeModalWindow"
                @viewDetail="viewCompletedMemoDetail"
                @uncomplete="uncompleteTask"
                @delete="deleteCompletedMemo"
                @clearCompleted="clearCompletedMemos"
            />
            
            <!-- 编辑待办 - 仅在独立窗口模式下显示 -->
            <EditMemoModal 
                ref="editMemoModalRef"
                v-if="currentModalType === 'edit-memo'"
                v-model:showModal="showEditModal"
                v-model:currentMemo="currentMemo"
                :is-editing="isEditing"
                :quadrant-options="quadrantOptions"
                :is-standalone-window="true"
                @close="closeModalWindow"
                @editorInput="handleEditorInput"
                @paste="handlePaste"
                @editorFocus="handleEditorFocus"
            />
            
            <!-- 已完成待办详情 -->
            <CompletedMemoDetailModal 
                v-if="currentModalType === 'completed-memo-detail'"
                v-model:showCompletedDetailModal="showCompletedDetailModal"
                :selectedCompletedMemo="selectedCompletedMemo"
                :getQuadrantName="getQuadrantName"
                :formatCompletedTime="formatCompletedTime"
                :formatCreatedTime="formatCreatedTime"
                @close="closeModalWindow"
                @uncomplete="uncompleteTaskFromDetail"
            />
        </div>
    </n-config-provider>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import {
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
} from 'naive-ui'
import SettingsModal from './components/modals/SettingsModal.vue'
import DataManageModal from './components/modals/DataManageModal.vue'
import CrossQuadrantDraggable from './components/CrossQuadrantDraggable.vue'
import type { Memo } from './types'
import CompletedMemosModal from './components/modals/CompletedMemosModal.vue'
import EditMemoModal from './components/modals/EditMemoModal.vue'
import CompletedMemoDetailModal from './components/modals/CompletedMemoDetailModal.vue'
import DragHelpModal from './components/modals/DragHelpModal.vue'
// 导入图片复制工具
import { copyImageToClipboard, addImageCopyFeatures } from '@/utils/imageCopy'

// 临时使用文本图标替代，避免导入问题
// import {
//   Add as AddIcon,
//   Trash as DeleteIcon,
//   Moon as MoonIcon,
//   Sunny as SunIcon
// } from '@vicons/ionicons5'

// 类型定义已移至 types/index.ts

// 响应式数据
const memos = ref<Memo[]>([])
const isEditing = ref(false)
const isDark = ref(false)
const isWidgetMode = ref(true) // 是否为桌面小组件模式
const isPinToDesktop = ref(false) // 是否固定到桌面
// 拖拽相关变量已移除，将使用第三方拖拽库

// 拖拽相关函数已移除，将使用第三方拖拽库

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 占位符样式函数已移除，现在使用CSS类控制

// 拖拽相关函数已移除
const editorRef = ref<HTMLElement | null>(null)
const selectedCompletedMemo = ref<Memo | null>(null)
const editMemoModalRef = ref<InstanceType<typeof EditMemoModal> | null>(null)

const currentDataPath = ref('')
const appVersion = ref('1.0.0')

// 拖拽操作标志
const isDragging = ref(false)

// 窗口焦点处理函数
const handleWindowFocus = async () => {
    // 如果正在进行拖拽操作，不重新加载数据
    if (isDragging.value) {
        return
    }
    
    // 延迟加载，避免与拖拽操作冲突
    setTimeout(async () => {
        if (!isDragging.value) {
            await loadMemos()
        }
    }, 100)
}
const buildTime = ref('')
const showMoreMenu = ref(false)
const menuLeaveTimer = ref<number | null>(null)

// 展开/折叠相关状态
const isCollapsed = ref(false) // 是否折叠
const isExpanded = ref(true) // 是否展开，默认展开
const collapseTimer = ref<number | null>(null) // 折叠定时器
const isDraggingToTop = ref(false) // 是否正在拖拽到顶部
const windowCheckTimer = ref<number | null>(null) // 窗口位置检查定时器
const isWindowDocked = ref(false) // 窗口是否吸顶
const isMouseOverApp = ref(false) // 鼠标是否在应用窗口内
const lastToggleTime = ref(0) // 上次切换时间，用于防抖

// 事件监听器引用
const appMouseEnterHandler = ref<((this: Element, ev: MouseEvent) => any) | null>(null)
const appMouseLeaveHandler = ref<((this: Element, ev: MouseEvent) => any) | null>(null)

// 标题栏引用
const titlebarRef = ref<HTMLElement | null>(null)


const currentMemo = ref<Memo>({
    title: '',
    content: '',
    quadrant: 'urgent-important',
    completed: false
})

// 象限选项
const quadrantOptions = [
    { label: '重要且紧急', value: 'urgent-important' },
    { label: '重要不紧急', value: 'important-not-urgent' },
    { label: '紧急不重要', value: 'urgent-not-important' },
    { label: '不重要不紧急', value: 'not-urgent-not-important' }
]


// 主题切换
const toggleTheme = () => {
    isDark.value = !isDark.value
    // TODO: 保存主题设置到本地存储
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// 鼠标按下事件处理
// 拖拽相关函数已移除
// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除
// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 拖拽相关函数已移除

// 处理象限内排序更新
const handleUpdateOrder = async (_quadrant: string, newOrder: Memo[]) => {
    try {
        // 设置拖拽标志
        isDragging.value = true
        
        // 更新主 memos 数组中对应象限的排序
        newOrder.forEach((memo, index) => {
            const mainMemo = memos.value.find(m => m.id === memo.id)
            if (mainMemo) {
                mainMemo.sortOrder = index
            }
        })
        
        // 重新排序 memos 数组以反映新的顺序
        const quadrant = newOrder[0]?.quadrant
        if (quadrant) {
            // 获取该象限的所有备忘录
            const quadrantMemos = memos.value.filter(m => m.quadrant === quadrant)
            const otherMemos = memos.value.filter(m => m.quadrant !== quadrant)
            
            // 按照 newOrder 的顺序重新排列该象限的备忘录
            const sortedQuadrantMemos = newOrder.map(memo => 
                quadrantMemos.find(m => m.id === memo.id)!
            ).filter(Boolean)
            
            // 合并其他象限的备忘录和重新排序的象限备忘录
            memos.value = [...otherMemos, ...sortedQuadrantMemos]
        }
        
        // 保存到数据库
        if (typeof window !== 'undefined' && window.db) {
            // Electron 环境：直接保存整个 memos 数组
            
            // 直接保存整个 memos 数组，避免数据竞争
            // 只保存可序列化的数据，避免克隆错误
            const serializableMemos = memos.value.map(memo => ({
                id: memo.id,
                title: memo.title,
                content: memo.content,
                quadrant: memo.quadrant,
                sortOrder: memo.sortOrder,
                completed: memo.completed,
                completedTime: memo.completedTime,
                created: memo.created
            }))
            const result = await (window.db as any).saveData(serializableMemos)
            if (!result.success) {
                console.error('数据库保存失败:', result.error)
                showMessage('数据保存失败', 'error')
            }
        } else {
            // Web 环境：更新 localStorage
            const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
            
            for (const memo of newOrder) {
                const index = savedMemos.findIndex((m: any) => m.id === memo.id)
                if (index !== -1) {
                    // 更新整个备忘录对象
                    savedMemos[index] = {
                        id: memo.id,
                        title: memo.title,
                        content: memo.content,
                        quadrant: memo.quadrant,
                        sortOrder: memo.sortOrder,
                        completed: memo.completed,
                        completedTime: memo.completedTime,
                        created: memo.created
                    }
                }
            }
            
            localStorage.setItem('memos', JSON.stringify(savedMemos))
        }
        // 清除拖拽标志
        isDragging.value = false
    } catch (error) {
        console.error('更新排序失败:', error)
        showMessage('更新排序失败', 'error')
        // 确保在出错时也清除拖拽标志
        isDragging.value = false
    }
}

// 处理跨象限移动
const handleMoveBetweenQuadrants = async (memoId: number, _fromQuadrant: string, toQuadrant: string, newIndex: number) => {
    try {
        // 设置拖拽标志
        isDragging.value = true
        
        // 找到被移动的备忘录
        const movedMemo = memos.value.find(memo => memo.id === memoId)
        if (!movedMemo) {
            console.error('找不到要移动的备忘录:', memoId)
            isDragging.value = false
            return
        }

        // 更新被移动备忘录的象限
        movedMemo.quadrant = toQuadrant

        // 获取目标象限中除了被移动备忘录之外的所有备忘录
        const targetMemos = memos.value.filter(memo => memo.quadrant === toQuadrant && memo.id !== memoId)
        
        // 将目标象限的备忘录按 sortOrder 排序
        targetMemos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        
        // 在指定位置插入被移动的备忘录
        if (newIndex === 0) {
            // 插入到开头
            movedMemo.sortOrder = 0
            targetMemos.forEach((memo, index) => {
                memo.sortOrder = index + 1
            })
        } else if (newIndex >= targetMemos.length) {
            // 插入到末尾
            movedMemo.sortOrder = targetMemos.length
        } else {
            // 插入到中间
            movedMemo.sortOrder = newIndex
            // 更新插入位置之后的所有备忘录的 sortOrder
            targetMemos.forEach((memo, index) => {
                if (index >= newIndex) {
                    memo.sortOrder = index + 1
                }
            })
        }
        
        // 重新排序 memos 数组以反映新的顺序
        // 获取所有象限的备忘录
        const allQuadrants = ['urgent-important', 'important-not-urgent', 'urgent-not-important', 'not-urgent-not-important']
        const sortedMemos: Memo[] = []
        
        for (const quadrant of allQuadrants) {
            const quadrantMemos = memos.value.filter(m => m.quadrant === quadrant)
            // 按照 sortOrder 排序
            quadrantMemos.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            sortedMemos.push(...quadrantMemos)
        }
        
        // 更新 memos 数组
        memos.value = sortedMemos
        

            // 保存所有更改到数据库
            if (typeof window !== 'undefined' && window.db) {
                // Electron 环境：直接保存整个 memos 数组
                
                // 直接保存整个 memos 数组，避免数据竞争
                // 只保存可序列化的数据，避免克隆错误
                const serializableMemos = memos.value.map(memo => ({
                    id: memo.id,
                    title: memo.title,
                    content: memo.content,
                    quadrant: memo.quadrant,
                    sortOrder: memo.sortOrder,
                    completed: memo.completed,
                    completedTime: memo.completedTime,
                    created: memo.created
                }))
                const result = await (window.db as any).saveData(serializableMemos)
                if (!result.success) {
                    showMessage('数据保存失败', 'error')
                }
        } else {
            // Web 环境：更新 localStorage
            const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
            
            // 更新被移动的备忘录（保存完整对象）
            const movedIndex = savedMemos.findIndex((m: any) => m.id === memoId)
            if (movedIndex !== -1) {
                savedMemos[movedIndex] = {
                    id: movedMemo.id,
                    title: movedMemo.title,
                    content: movedMemo.content,
                    quadrant: toQuadrant,
                    sortOrder: newIndex,
                    completed: movedMemo.completed,
                    completedTime: movedMemo.completedTime,
                    created: movedMemo.created
                }
            }
            
            // 更新目标象限中其他备忘录的排序（保存完整对象）
            for (const memo of targetMemos) {
                const index = savedMemos.findIndex((m: any) => m.id === memo.id)
                if (index !== -1) {
                    savedMemos[index] = {
                        id: memo.id,
                        title: memo.title,
                        content: memo.content,
                        quadrant: memo.quadrant,
                        sortOrder: memo.sortOrder,
                        completed: memo.completed,
                        completedTime: memo.completedTime,
                        created: memo.created
                    }
                }
            }
            
            // 一次性保存所有更改
            localStorage.setItem('memos', JSON.stringify(savedMemos))
        }
        // 清除拖拽标志
        isDragging.value = false
        
    } catch (error) {
        console.error('跨象限移动失败:', error)
        showMessage('移动失败', 'error')
        // 确保在出错时也清除拖拽标志
        isDragging.value = false
    }
}

// 切换备忘录完成状态
const toggleMemoComplete = async (id: number, completed: boolean) => {
    try {
        const completedTime = completed ? Date.now() : undefined

        if (typeof window !== 'undefined' && window.db) {
            // Electron 环境
            const result = await window.db.updateMemo(id, {
                completed,
                completedTime
            })
            if (result.success) {
                await loadMemos()
            } else {
                showMessage('更新失败: ' + result.error, 'error')
            }
        } else {
            // Web 环境
            const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
            const index = savedMemos.findIndex((m: any) => m.id === id)
            if (index !== -1) {
                savedMemos[index].completed = completed
                savedMemos[index].completedTime = completedTime
                localStorage.setItem('memos', JSON.stringify(savedMemos))
                await loadMemos()
            }
        }
    } catch (error) {
        console.error('Toggle complete error:', error)
        showMessage('操作失败', 'error')
    }
}

// 富文本编辑器处理
const handleEditorInput = (event: Event) => {
    const target = event.target as HTMLElement

    // 检查当前光标位置，确保不在图片容器内
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        let currentNode = range.startContainer

        // 检查是否在图片容器内
        while (currentNode && currentNode !== target) {
            if (currentNode.nodeType === Node.ELEMENT_NODE) {
                const element = currentNode as Element
                if (element.classList?.contains('resizable-image-container')) {
                    // 如果在图片容器内，移动到容器后面
                    const parentNode = element.parentNode!
                    const nextSibling = element.nextSibling

                    let targetTextNode: Node
                    if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                        targetTextNode = nextSibling
                    } else {
                        // 创建新的文本节点
                        targetTextNode = document.createTextNode('')
                        parentNode.insertBefore(targetTextNode, nextSibling)
                    }

                    // 移动光标到正确位置
                    const newRange = document.createRange()
                    newRange.setStart(targetTextNode, 0)
                    newRange.collapse(true)
                    selection.removeAllRanges()
                    selection.addRange(newRange)
                    break
                }
            }
            currentNode = currentNode.parentNode as Node
        }
    }

    // 将编辑器中的 base64 图片替换为原始路径用于保存
    let content = target.innerHTML

    // 查找所有具有 data-original-src 属性的图片
    const images = target.querySelectorAll('img[data-original-src]')
    images.forEach((img) => {
        const imgElement = img as HTMLImageElement
        const originalSrc = imgElement.getAttribute('data-original-src')
        const currentSrc = imgElement.getAttribute('src')
        if (originalSrc && currentSrc && originalSrc !== currentSrc) {
            // 在内容中替换为原始路径
            content = content.replace(
                new RegExp(`src="${currentSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
                `src="${originalSrc}"`
            )
            // 同时移除 data-original-src 属性以避免在保存的 HTML 中出现
            content = content.replace(/\s*data-original-src="[^"]*"/g, '')
        }
    })

    // 更新内容
    currentMemo.value.content = content
}

// 处理编辑器获得焦点
const handleEditorFocus = () => {
    // 确保编辑器获得焦点时，内容同步
    if (editorRef.value) {
        currentMemo.value.content = editorRef.value.innerHTML
    }
}

// 设置编辑器内容（保持光标位置）
// setEditorContent 函数已移除，由编辑模态框处理

// 处理粘贴事件
const handlePaste = async (event: ClipboardEvent) => {
    event.preventDefault()

    const items = event.clipboardData?.items
    if (!items) return

    let hasImage = false
    let textContent = ''

    // 首先检查是否有图片
    for (let i = 0; i < items.length; i++) {
        const item = items[i]

        if (item.type.indexOf('image') !== -1) {
            hasImage = true
            const file = item.getAsFile()
            if (file) {
                try {
                    const imageUrl = await saveImageToLocal(file)
                    await insertImageToEditor(imageUrl)
                } catch (error) {
                    console.error('Save image error:', error)
                    showMessage('图片保存失败', 'error')
                }
            }
        } else if (item.type === 'text/plain' && !hasImage) {
            // 只有在没有图片时才处理文本
            textContent = await new Promise<string>((resolve) => {
                item.getAsString(resolve)
            })
        }
    }

    // 如果没有图片但有文本，插入文本
    if (!hasImage && textContent) {
        insertTextToEditor(textContent)
    }
}

// 保存图片到本地
const saveImageToLocal = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async () => {
            const base64 = reader.result as string

            // 如果在 Electron 环境中，尝试使用文件系统存储
            if (typeof window !== 'undefined' && window.db && window.db.saveImage) {
                try {
                    const result = await window.db.saveImage(base64, file.name)
                    if (result.success) {
                        // 返回本地文件路径，而不是 base64
                        const localPath = `app://local-file/${result.path}`
                        resolve(localPath)
                    } else {
                        console.warn('文件系统保存失败，使用 base64:', result.error)
                        resolve(base64)
                    }
                } catch (error) {
                    console.warn('文件系统保存失败，使用 base64:', error)
                    resolve(base64)
                }
            } else {
                // Web 环境或者旧版本，使用 base64
                resolve(base64)
            }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// 将本地文件路径转换为 base64（用于显示）
// convertLocalPathToBase64 函数已移除，由编辑模态框处理

// 绑定图片事件的函数
const bindImageEvents = (imgContainer: HTMLElement) => {
    const img = imgContainer.querySelector('img') as HTMLImageElement
    const resizeHandle = imgContainer.querySelector('.resize-handle') as HTMLElement

    if (!img || !resizeHandle) return

    // 绑定图片点击事件
    img.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.getSelection()?.removeAllRanges()
        selectImage(imgContainer)
    }

    // 添加图片复制功能
    addImageCopyFeatures(img, {
        showMessage,
        onSuccess: () => {},
        onError: (error) => console.error('图片复制失败:', error)
    })

    // 绑定拖拽事件
    let isResizing = false
    let startX = 0,
        startY = 0,
        startWidth = 0,
        startHeight = 0

    resizeHandle.onmousedown = (e) => {
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
                const aspectRatio = startWidth / startHeight
                const newWidth = Math.max(50, startWidth + deltaX)
                const newHeight = newWidth / aspectRatio

                img.style.width = newWidth + 'px'
                img.style.height = newHeight + 'px'
            } else {
                img.style.width = Math.max(50, startWidth + deltaX) + 'px'
                img.style.height = Math.max(30, startHeight + deltaY) + 'px'
            }

            currentMemo.value.content = editorRef.value!.innerHTML
        }

        const stopResize = () => {
            isResizing = false
            document.removeEventListener('mousemove', handleResize)
            document.removeEventListener('mouseup', stopResize)
        }

        document.addEventListener('mousemove', handleResize)
        document.addEventListener('mouseup', stopResize)
    }
}

// 插入图片到编辑器
const insertImageToEditor = async (imageUrl: string) => {
    if (!editorRef.value) return

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
            } else {
                // 如果转换失败，尝试直接使用原路径
                displayUrl = imageUrl
            }
        } catch (error) {
            console.warn('无法获取图片 base64，使用原路径:', error)
            // 如果转换失败，尝试直接使用原路径
            displayUrl = imageUrl
        }
    }

    // 创建一个包装容器div，而不是span
    const wrapperDiv = document.createElement('div')
    wrapperDiv.style.cssText = `
    display: inline-block;
    margin: 0;
    vertical-align: top;
  `

    // 创建图片容器
    const imgContainer = document.createElement('span')
    imgContainer.className = 'resizable-image-container'
    imgContainer.style.cssText = `
    position: relative;
    display: inline-block;
    margin: 0 4px;
    border: 2px solid transparent;
    border-radius: 4px;
    vertical-align: top;
    max-width: fit-content;
  `

    const img = document.createElement('img')
    img.src = displayUrl // 使用转换后的 base64 显示
    // 保存原始路径信息作为数据属性用于保存
    img.setAttribute('data-original-src', imageUrl)
    img.style.cssText = `
    max-width: 200px;
    max-height: 150px;
    height: auto;
    display: inline-block;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    vertical-align: top;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  `

    // 创建调整手柄
    const resizeHandle = document.createElement('div')
    resizeHandle.className = 'resize-handle'
    resizeHandle.style.cssText = `
    position: absolute;
    bottom: -5px;
    right: -5px;
    width: 10px;
    height: 10px;
    background: #40a9ff;
    border: 2px solid white;
    border-radius: 50%;
    cursor: nw-resize;
    display: none;
    z-index: 10;
  `

    imgContainer.appendChild(img)
    imgContainer.appendChild(resizeHandle)
    wrapperDiv.appendChild(imgContainer)

    // 使用document.execCommand插入HTML，这样可以确保正确的光标位置
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()

        // 使用insertHTML替代直接插入DOM节点
        try {
            document.execCommand('insertHTML', false, wrapperDiv.outerHTML + '&nbsp;')

            // 重新绑定事件监听器到新插入的图片
            setTimeout(() => {
                const newImgContainers = editorRef.value!.querySelectorAll(
                    '.resizable-image-container'
                )
                const lastContainer = newImgContainers[newImgContainers.length - 1] as HTMLElement
                if (lastContainer) {
                    bindImageEvents(lastContainer)
                }
            }, 0)
        } catch (error) {
            // 如果execCommand不支持，使用备用方案
            range.insertNode(wrapperDiv)
            bindImageEvents(imgContainer)

            // 在图片后面添加一个非断空格和换行
            const spacer = document.createTextNode('\u00A0')
            const br = document.createElement('br')

            range.setStartAfter(wrapperDiv)
            range.insertNode(spacer)
            range.setStartAfter(spacer)
            range.insertNode(br)

            range.setStartAfter(br)
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
        }
    } else {
        editorRef.value.innerHTML += wrapperDiv.outerHTML + '&nbsp;<br>'

        // 重新绑定事件监听器
        setTimeout(() => {
            const newImgContainers = editorRef.value!.querySelectorAll('.resizable-image-container')
            const lastContainer = newImgContainers[newImgContainers.length - 1] as HTMLElement
            if (lastContainer) {
                bindImageEvents(lastContainer)
            }
        }, 0)
    }

    // 更新内容
    currentMemo.value.content = editorRef.value.innerHTML
}

// 选中图片
const selectImage = (container: HTMLElement) => {
    // 清除文本选中
    window.getSelection()?.removeAllRanges()

    // 清除其他选中状态
    document.querySelectorAll('.resizable-image-container').forEach((el) => {
        (el as HTMLElement).style.border = '2px solid transparent'
        const handle = el.querySelector('.resize-handle') as HTMLElement
        if (handle) handle.style.display = 'none'
    })

    // 设置当前选中状态，只在图片容器上显示边框
    container.style.border = '2px solid #40a9ff'
    const handle = container.querySelector('.resize-handle') as HTMLElement
    if (handle) handle.style.display = 'block'

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
            const img = container.querySelector('img') as HTMLImageElement
            if (img) {
                copyImageToClipboard(img, {
                    showMessage,
                    onSuccess: () => {},
                    onError: (error) => console.error('图片复制失败:', error)
                })
            }
        }
    }

    // 点击其他地方取消选中
    const clearSelection = (e: Event) => {
        const target = e.target as Node
        if (!container.contains(target) && target !== container) {
            container.style.border = '2px solid transparent'
            if (handle) handle.style.display = 'none'
            document.removeEventListener('click', clearSelection)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }

    setTimeout(() => {
        document.addEventListener('click', clearSelection)
        document.addEventListener('keydown', handleKeyDown)
    }, 100)
}

// 插入文本到编辑器
const insertTextToEditor = (text: string) => {
    if (!editorRef.value || !text) return

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)

        // 确保我们在正确的位置插入文本
        let targetNode = range.startContainer
        let targetOffset = range.startOffset

        // 如果光标在图片容器内，移动到容器外
        while (targetNode && targetNode.nodeType === Node.ELEMENT_NODE) {
            const element = targetNode as Element
            if (element.classList?.contains('resizable-image-container')) {
                // 如果在图片容器内，移动到容器后面
                const parentNode = element.parentNode!
                const nextSibling = element.nextSibling

                if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                    range.setStart(nextSibling, 0)
                } else {
                    // 创建新的文本节点
                    const newTextNode = document.createTextNode('')
                    parentNode.insertBefore(newTextNode, nextSibling)
                    range.setStart(newTextNode, 0)
                }
                break
            }

            // 检查父级
            if (targetOffset < element.childNodes.length) {
                targetNode = element.childNodes[targetOffset]
                targetOffset = 0
            } else {
                break
            }
        }

        // 使用document.execCommand插入文本，这样可以保持正确的光标位置
        try {
            // 将文本转义HTML字符以避免问题
            const escapedText = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>')

            document.execCommand('insertHTML', false, escapedText)
        } catch (error) {
            // 如果execCommand失败，使用备用方案
            range.deleteContents()

            // 创建文本节点
            const lines = text.split('\n')
            for (let i = 0; i < lines.length; i++) {
                if (i > 0) {
                    range.insertNode(document.createElement('br'))
                }
                if (lines[i]) {
                    const textNode = document.createTextNode(lines[i])
                    range.insertNode(textNode)
                    range.setStartAfter(textNode)
                }
            }

            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
        }
    } else {
        // 如枟没有选中区域，直接添加到末尾
        const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')

        editorRef.value.innerHTML += escapedText
    }

    // 更新内容
    currentMemo.value.content = editorRef.value.innerHTML
}

// 处理新增待办
const handleAddMemo = (quadrant: string) => {
    // 设置编辑状态为新增
    isEditing.value = false
    currentMemo.value.id = undefined
    currentMemo.value.title = ''
    currentMemo.value.content = ''
    currentMemo.value.quadrant = quadrant
    currentMemo.value.completed = false
    
    // 创建纯对象用于传递，避免 reactive 对象序列化问题
    const memoData = {
        id: currentMemo.value.id,
        title: currentMemo.value.title,
        content: currentMemo.value.content,
        quadrant: currentMemo.value.quadrant,
        completed: currentMemo.value.completed,
        created: currentMemo.value.created,
        completedTime: currentMemo.value.completedTime,
        sortOrder: currentMemo.value.sortOrder
    }
    
    // 创建独立窗口
    createModalWindow('edit-memo', { memo: memoData, isEditing: false })
}

// 处理编辑待办
const handleEditMemo = async (memo: Memo) => {
    // 设置编辑状态为编辑
    isEditing.value = true
    currentMemo.value.id = memo.id
    currentMemo.value.title = memo.title
    currentMemo.value.content = memo.content
    currentMemo.value.quadrant = memo.quadrant
    currentMemo.value.completed = memo.completed || false
    
    // 创建纯对象用于传递，避免 reactive 对象序列化问题
    const memoData = {
        id: memo.id,
        title: memo.title,
        content: memo.content,
        quadrant: memo.quadrant,
        completed: memo.completed || false,
        created: memo.created,
        completedTime: memo.completedTime,
        sortOrder: memo.sortOrder
    }
    
    // 创建独立窗口
    createModalWindow('edit-memo', { memo: memoData, isEditing: true })
}

// 使用全局通知方法
const showMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    // 使用原生 DOM 显示通知，避免 useMessage 问题
    const notification = document.createElement('div')
    notification.style.cssText = `
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 16px 24px;
    background: ${type === 'success' ? '#52c41a' : '#ff4d4f'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    max-width: 400px;
    text-align: center;
    backdrop-filter: blur(4px);
    animation: messageSlideIn 0.3s ease-out;
  `

    // 添加CSS动画样式
    if (!document.querySelector('#message-styles')) {
        const style = document.createElement('style')
        style.id = 'message-styles'
        style.textContent = `
      @keyframes messageSlideIn {
        0% {
          opacity: 0;
          transform: translate(-50%, -60%);
          scale: 0.9;
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%);
          scale: 1;
        }
      }
      @keyframes messageSlideOut {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%);
          scale: 1;
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -40%);
          scale: 0.9;
        }
      }
    `
        document.head.appendChild(style)
    }

    notification.textContent = message
    document.body.appendChild(notification)

    // 添加消失动画并移除
    setTimeout(() => {
        notification.style.animation = 'messageSlideOut 0.3s ease-in'
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification)
            }
        }, 300)
    }, 2700) // 2.7秒后开始消失动画
}





// 删除备忘录
const deleteMemo = async (id: number) => {
    if (confirm('确定要删除这条备忘录吗？')) {
        try {
            if (typeof window !== 'undefined' && window.db) {
                // Electron 环境
                const result = await window.db.deleteMemo(id)
                if (result.success) {
                    showMessage('删除成功')
                    await loadMemos()

                    // 在删除后自动清理无用图片
                    setTimeout(async () => {
                        try {
                            await window.db.cleanupUnusedImages()
                        } catch (error) {
                            console.warn('Auto cleanup failed:', error)
                        }
                    }, 1000)
                } else {
                    showMessage('删除失败: ' + result.error, 'error')
                }
            } else {
                // Web 环境
                const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
                const filteredMemos = savedMemos.filter((memo: any) => memo.id !== id)
                localStorage.setItem('memos', JSON.stringify(filteredMemos))
                showMessage('删除成功')
                await loadMemos()
            }
        } catch (error) {
            console.error('Delete memo error:', error)
            showMessage('删除失败', 'error')
        }
    }
}

// 加载备忘录数据
const loadMemos = async () => {
    try {
        // 检查是否在 Electron 环境中
        if (typeof window !== 'undefined' && window.db) {
            const result = await window.db.getMemos()
            if (result.success) {
                
                // 验证数据格式
                if (Array.isArray(result.data)) {
                    // 按照象限和 sortOrder 排序
                    const sortedData = result.data.sort((a, b) => {
                        // 首先按象限排序
                        const quadrantOrder = ['urgent-important', 'important-not-urgent', 'urgent-not-important', 'not-urgent-not-important']
                        const aQuadrantIndex = quadrantOrder.indexOf(a.quadrant)
                        const bQuadrantIndex = quadrantOrder.indexOf(b.quadrant)
                        
                        if (aQuadrantIndex !== bQuadrantIndex) {
                            return aQuadrantIndex - bQuadrantIndex
                        }
                        
                        // 同一象限内按 sortOrder 排序
                        return (a.sortOrder || 0) - (b.sortOrder || 0)
                    })
                    
                    memos.value = sortedData
                } else {
                    console.error('数据库返回的数据不是数组格式:', typeof result.data)
                    showMessage('数据格式错误，已重置为空列表', 'warning')
                    memos.value = []
                }

                // 在首次加载后执行一次 base64 图片迁移
                try {
                    const migrationResult = await window.db.migrateBase64Images?.()
                    if (migrationResult?.success && migrationResult.migrated && migrationResult.migrated > 0) {

                        // 迁移后重新加载数据
                        const reloadResult = await window.db.getMemos()
                        if (reloadResult.success && Array.isArray(reloadResult.data)) {
                            // 按照象限和 sortOrder 排序
                            const sortedData = reloadResult.data.sort((a, b) => {
                                // 首先按象限排序
                                const quadrantOrder = ['urgent-important', 'important-not-urgent', 'urgent-not-important', 'not-urgent-not-important']
                                const aQuadrantIndex = quadrantOrder.indexOf(a.quadrant)
                                const bQuadrantIndex = quadrantOrder.indexOf(b.quadrant)
                                
                                if (aQuadrantIndex !== bQuadrantIndex) {
                                    return aQuadrantIndex - bQuadrantIndex
                                }
                                
                                // 同一象限内按 sortOrder 排序
                                return (a.sortOrder || 0) - (b.sortOrder || 0)
                            })
                            
                            memos.value = sortedData
                        }
                    }
                } catch (migrationError) {
                    console.warn('图片迁移失败:', migrationError)
                }
            } else {
                console.error('数据库加载失败:', result.error)
                showMessage('加载数据失败: ' + result.error, 'error')
                // 即使加载失败，也设置空数组避免应用崩溃
                memos.value = []
            }
        } else {
            // Web 环境使用 localStorage
            const savedMemos = localStorage.getItem('memos')
            if (savedMemos) {
                try {
                    const parsedMemos = JSON.parse(savedMemos)
                    
                    // 按照象限和 sortOrder 排序
                    const sortedMemos = parsedMemos.sort((a: any, b: any) => {
                        // 首先按象限排序
                        const quadrantOrder = ['urgent-important', 'important-not-urgent', 'urgent-not-important', 'not-urgent-not-important']
                        const aQuadrantIndex = quadrantOrder.indexOf(a.quadrant)
                        const bQuadrantIndex = quadrantOrder.indexOf(b.quadrant)
                        
                        if (aQuadrantIndex !== bQuadrantIndex) {
                            return aQuadrantIndex - bQuadrantIndex
                        }
                        
                        // 同一象限内按 sortOrder 排序
                        return (a.sortOrder || 0) - (b.sortOrder || 0)
                    })
                    
                    memos.value = sortedMemos
                } catch (parseError) {
                    console.error('localStorage JSON 解析失败:', parseError)
                    console.error('问题数据:', savedMemos.substring(0, 500))
                    showMessage('数据格式错误，已重置为空列表', 'warning')
                    memos.value = []
                    // 清除损坏的数据
                    localStorage.removeItem('memos')
                }
            }
        }
    } catch (error) {
        console.error('Load memos error:', error)
        showMessage('加载数据失败', 'error')
    }
}

// 重新整理象限备忘录排序，确保新增的在最前面
// reorderQuadrantMemos 函数已移除，由拖拽组件处理排序

// 点击外部区域关闭更多菜单
const handleClickOutside = (event: MouseEvent) => {
    const dropdown = document.querySelector('.titlebar-dropdown')
    if (dropdown && !dropdown.contains(event.target as Node)) {
        showMoreMenu.value = false
    }
}

// 鼠标进入菜单区域
const handleMenuEnter = async () => {
    // 清除可能存在的隐藏定时器
    if (menuLeaveTimer.value) {
        clearTimeout(menuLeaveTimer.value)
        menuLeaveTimer.value = null
    }
    
    // 自动展开窗口
    await autoExpand()
    
    showMoreMenu.value = true
}

// 鼠标离开菜单区域
const handleMenuLeave = () => {
    // 设置短暂延迟，确保鼠标有时间移动到菜单
    menuLeaveTimer.value = setTimeout(() => {
        showMoreMenu.value = false
        menuLeaveTimer.value = null
    }, 150) as any
}


// 组件挂载时初始化
onMounted(async () => {
  // 检查是否是模态框窗口
  const urlParams = new URLSearchParams(window.location.hash.substring(1))
  const modalType = urlParams.get('modal')
  const dataParam = urlParams.get('data')
  
  // 初始化版本信息（无论是否独立弹窗都应设置）
  initVersionInfo()
  
  if (modalType) {
    // 解析传递的数据
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam))
        modalData.value = data
        
        // 如果是编辑待办，设置当前备忘录数据
        if (modalType === 'edit-memo' && data.memo) {
          currentMemo.value.id = data.memo.id
          currentMemo.value.title = data.memo.title
          currentMemo.value.content = data.memo.content
          currentMemo.value.quadrant = data.memo.quadrant
          currentMemo.value.completed = data.memo.completed
          currentMemo.value.created = data.memo.created
          currentMemo.value.completedTime = data.memo.completedTime
          currentMemo.value.sortOrder = data.memo.sortOrder
          isEditing.value = data.isEditing || false
        }
        
        // 如果是已完成待办详情，设置选中的备忘录
        if (modalType === 'completed-memo-detail' && data.memo) {
          selectedCompletedMemo.value = data.memo
        }
      } catch (error) {
        console.error('解析模态框数据失败:', error)
      }
    }
    
    // 如果是模态框窗口，显示对应的内容
    if (modalType === 'drag-help') {
      // 对于系统功能说明，直接设置状态显示模态框
      isModalWindow.value = true
      currentModalType.value = modalType
    } else {
      showModalContent(modalType)
    }
    return
  }
  
  // 加载主题设置
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'

  // 加载窗口模式设置
  const savedWidgetMode = localStorage.getItem('widget-mode')
  isWidgetMode.value = savedWidgetMode !== 'false' // 默认为 true

  // 加载固定到桌面设置
  const savedPinToDesktop = localStorage.getItem('pin-to-desktop')
  isPinToDesktop.value = savedPinToDesktop === 'true' // 默认为 false

  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeyDown)
  // 添加点击外部区域关闭菜单监听器
  document.addEventListener('click', handleClickOutside)

  // 添加窗口状态变化监听器
  if (typeof window !== 'undefined' && window.ipcRenderer && typeof window.ipcRenderer.on === 'function') {
    try {
      window.ipcRenderer.on('fullscreen-changed', (_, isMaximizedState) => {
        isMaximized.value = isMaximizedState
      })
      
      // 监听窗口显示事件，用于修复最小化后恢复的样式问题
      window.ipcRenderer.on('window-shown', async () => {
        // 自动切换到展开状态
        isExpanded.value = true
        isCollapsed.value = false
        
        // 延迟修复，确保窗口完全显示后再进行修复
        setTimeout(() => {
          fixWindowRestoreStyles()
        }, 100)
      })
    } catch (error) {
      console.warn('Failed to set up IPC listeners:', error)
    }
  }

  // 添加窗口焦点监听器，当主窗口重新获得焦点时重新加载数据
  window.addEventListener('focus', handleWindowFocus)
  
  // 添加窗口大小变化监听器，确保空状态能够自适应
  window.addEventListener('resize', () => {
    // 触发重新渲染，确保空状态布局正确
    nextTick(() => {
      // 强制重新计算布局
      document.body.style.display = 'none'
      document.body.offsetHeight // 触发重排
      document.body.style.display = ''
    })
  })
  
  // 监听来自独立窗口的消息
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'refreshData') {
      await loadMemos()
    } else if (event.data && event.data.type === 'getCompletedMemos') {
      // 返回已完成待办数据给请求的窗口
      const completedMemos = getCompletedMemos()
      // 创建纯对象，避免克隆错误
      const serializableMemos = completedMemos.map(memo => ({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        quadrant: memo.quadrant,
        completed: memo.completed,
        created: memo.created,
        completedTime: memo.completedTime,
        sortOrder: memo.sortOrder
      }))
      if (event.source && event.source.postMessage) {
        event.source.postMessage({ 
          type: 'completedMemosData', 
          completedMemos: serializableMemos 
        }, { targetOrigin: '*' })
      }
    } else if (event.data && event.data.type === 'refreshCompletedMemos') {
      // 接收到刷新已完成待办列表的通知
      // 重新加载数据并触发自定义事件
      await loadMemos()
      // 触发自定义事件通知所有监听器
      window.dispatchEvent(new CustomEvent('completedMemoUpdated'))
    }
  })

  // 添加窗口移动监听器，用于检测是否拖拽到顶部
  if (typeof window !== 'undefined' && window.electronAPI) {
    // 监听鼠标移动事件，检测窗口拖拽到顶部
    let isDraggingWindow = false
    let lastDragPosition = { x: 0, y: 0 }
    
    // 监听标题栏鼠标按下事件，标记开始拖拽
    const titlebar = document.querySelector('.custom-titlebar')
    if (titlebar) {
      titlebar.addEventListener('mousedown', () => {
        isDraggingWindow = true
        // 通知主进程开始拖拽
        if (window.ipcRenderer) {
          window.ipcRenderer.send('window-drag-start')
        }
      })
    }
    
    // 监听鼠标释放事件，标记结束拖拽
    document.addEventListener('mouseup', () => {
      isDraggingWindow = false
      isDraggingToTop.value = false
      // 通知主进程结束拖拽
      if (window.ipcRenderer) {
        window.ipcRenderer.send('window-drag-end')
      }
    })
    
    // 监听鼠标移动事件
    document.addEventListener('mousemove', (event) => {
      // 更新拖拽位置
      lastDragPosition = { x: event.clientX, y: event.clientY }
      
      // 检查是否正在拖拽窗口且接近屏幕顶部
      if (isDraggingWindow && event.clientY < 10 && !isExpanded.value) {
        // 拖拽到顶部，自动折叠
        // 添加防抖机制，避免频繁触发
        if (!isDraggingToTop.value) {
          // 防抖机制，避免频繁切换
          const now = Date.now();
          if (now - lastToggleTime.value < 300) return;
          
          isCollapsed.value = true
          isDraggingToTop.value = true
          lastToggleTime.value = now;
        }
      } else if (isDraggingToTop.value && event.clientY >= 10) {
        // 鼠标离开顶部区域，重置状态
        isDraggingToTop.value = false
      }
    })
    
    // 通过 IPC 监听窗口位置变化（如果支持）
    if (window.ipcRenderer && typeof window.ipcRenderer.on === 'function') {
      try {
        window.ipcRenderer.on('window-moved', (_, position) => {
          // 检查窗口是否接近屏幕顶部
          if (position.y < 10 && !isExpanded.value) {
            // 窗口移动到顶部，自动折叠
            // 添加防抖机制，避免频繁触发
            if (!isDraggingToTop.value) {
              // 防抖机制，避免频繁切换
              const now = Date.now();
              if (now - lastToggleTime.value < 300) return;
              
              isCollapsed.value = true
              isDraggingToTop.value = true
              lastToggleTime.value = now;
            }
          } else {
            // 窗口离开顶部，重置状态
            isDraggingToTop.value = false
          }
        })

        // 监听窗口吸顶状态变化
        window.ipcRenderer.on('window-docked', (_, data) => {
          if (data.docked) {
            // 窗口已吸顶，确保应用处于折叠状态
            isWindowDocked.value = true
            isCollapsed.value = true
            isExpanded.value = false
            
            // 如果主进程传递了原始尺寸信息，保存到beforeCollapseSize
            if (data.originalHeight && data.originalWidth) {
              beforeCollapseSize.value = {
                width: data.originalWidth,
                height: data.originalHeight
              }
            }
            
          } else {
            // 窗口取消吸顶，可以恢复展开状态
            isWindowDocked.value = false
            
            // 如果明确标记为展开，则设置展开状态
            if (data.expanded) {
              isExpanded.value = true
              isCollapsed.value = false
            }
            
          }
        })
      } catch (error) {
        console.warn('Failed to set up window position listeners:', error)
      }
    }
    
    // 定期检查窗口位置（备用方案）
    const checkWindowPosition = () => {
      if (isDraggingWindow && lastDragPosition.y < 10 && !isExpanded.value) {
        // 拖拽到顶部，自动折叠
        // 添加防抖机制，避免频繁触发
        if (!isDraggingToTop.value) {
          // 防抖机制，避免频繁切换
          const now = Date.now();
          if (now - lastToggleTime.value < 300) return;
          
          isCollapsed.value = true
          isDraggingToTop.value = true
          lastToggleTime.value = now;
        }
      } else if (isDraggingToTop.value && lastDragPosition.y >= 10) {
        // 鼠标离开顶部区域，重置状态
        isDraggingToTop.value = false
      }
    }
    
    // 每100ms检查一次窗口位置
    windowCheckTimer.value = setInterval(checkWindowPosition, 100) as any
  }
  
  // 添加鼠标进入和离开整个应用窗口的事件监听器
  const appElement = document.querySelector('.app');
  if (appElement) {
    appMouseEnterHandler.value = async () => {
      isMouseOverApp.value = true;
      // 防抖机制，避免频繁切换
      const now = Date.now();
      if (now - lastToggleTime.value < 100) return;
      
      // 如果当前是折叠状态，则临时展开
      if (isCollapsed.value && !isExpanded.value) {
        // 直接调用展开的公共方法
        await autoExpand()
        lastToggleTime.value = now;
      }
      // 清除可能存在的折叠定时器
      if (collapseTimer.value) {
        clearTimeout(collapseTimer.value);
        collapseTimer.value = null;
      }
    };
    
    appMouseLeaveHandler.value = () => {
      isMouseOverApp.value = false;
      // 防抖机制，避免频繁切换
      const now = Date.now();
      if (now - lastToggleTime.value < 100) return;
      
      // 如果不是展开模式且当前是临时展开状态，则延迟折叠
      if (!isExpanded.value && !isCollapsed.value) {
        // 清除之前的定时器
        if (collapseTimer.value) {
          clearTimeout(collapseTimer.value);
        }
        
        // 设置新的定时器，延迟折叠
        collapseTimer.value = setTimeout(async () => {
          // 再次检查鼠标是否真的不在应用窗口内
          const appEl = document.querySelector('.app');
          if (appEl && !appEl.matches(':hover')) {
            // 直接调用折叠的公共方法
            await autoCollapse()
            lastToggleTime.value = Date.now();
          }
          collapseTimer.value = null;
        }, 300) as any;
      }
    };
    
    appElement.addEventListener('mouseenter', appMouseEnterHandler.value as EventListener);
    appElement.addEventListener('mouseleave', appMouseLeaveHandler.value as EventListener);
  }

  // 获取当前数据存储目录
  await loadCurrentDataPath()

  // 加载数据
  await loadMemos()

  // 开发环境下添加测试数据（如果没有数据且不是刚清空数据的情况）
  if (process.env.NODE_ENV === 'development' && memos.value.length === 0) {
    // 检查是否是刚清空数据的情况，通过localStorage中的标记来判断
    const isJustCleared = localStorage.getItem('dataJustCleared') === 'true';
    if (!isJustCleared) {
      await addTestData()
    } else {
      // 清除标记
      localStorage.removeItem('dataJustCleared');
    }
  }

  // 初始化窗口大小记忆
  await initializeWindowSizes()
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('click', handleClickOutside)
    // 清除可能存在的菜单定时器
    if (menuLeaveTimer.value) {
        clearTimeout(menuLeaveTimer.value)
    }
    // 清除可能存在的折叠定时器
    if (collapseTimer.value) {
        clearTimeout(collapseTimer.value)
    }
    // 清除窗口位置检查定时器
    if (windowCheckTimer.value) {
        clearInterval(windowCheckTimer.value)
    }
    if (typeof window !== 'undefined' && window.ipcRenderer) {
        window.ipcRenderer.removeAllListeners('fullscreen-changed')
        window.ipcRenderer.removeAllListeners('window-moved')
        window.ipcRenderer.removeAllListeners('window-shown')
        window.ipcRenderer.removeAllListeners('window-docked')
    }
    
    // 清理应用窗口的鼠标事件监听器
    const appElement = document.querySelector('.app');
    if (appElement && appMouseEnterHandler.value && appMouseLeaveHandler.value) {
        appElement.removeEventListener('mouseenter', appMouseEnterHandler.value as EventListener);
        appElement.removeEventListener('mouseleave', appMouseLeaveHandler.value as EventListener);
    }
    
    // 清理窗口焦点监听器
    window.removeEventListener('focus', handleWindowFocus)
})

// 添加测试数据
const addTestData = async () => {
  const testMemos = [
    {
      title: '完成项目报告',
      content: '这是一个重要且紧急的任务',
      quadrant: 'urgent-important'
    },
    {
      title: '学习新技术',
      content: '重要但不紧急的学习任务',
      quadrant: 'important-not-urgent'
    },
    {
      title: '回复邮件',
      content: '紧急但不太重要的日常事务',
      quadrant: 'urgent-not-important'
    },
    {
      title: '整理桌面',
      content: '既不紧急也不重要的杂事',
      quadrant: 'not-urgent-not-important'
    },
    {
      title: '准备会议材料',
      content: '另一个重要且紧急的任务',
      quadrant: 'urgent-important'
    }
  ]

  for (const memo of testMemos) {
    if (typeof window !== 'undefined' && window.db) {
      await window.db.addMemo(memo)
    } else {
      const newMemo = {
        ...memo,
        id: Date.now() + Math.random(),
        created: Date.now()
      }
      const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
      savedMemos.push(newMemo)
      localStorage.setItem('memos', JSON.stringify(savedMemos))
    }
    // 添加延迟确保ID唯一
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  await loadMemos()
  
  // 清除标记
  if (process.env.NODE_ENV === 'development') {
    localStorage.removeItem('dataJustCleared');
  }
}



// 处理数据清空事件
const handleDataCleared = () => {
  // 重置主题
  isDark.value = false
  
  // 设置标记，表示刚清空了数据
  if (process.env.NODE_ENV === 'development') {
    localStorage.setItem('dataJustCleared', 'true');
  }
}

// 处理主题变化事件
const handleThemeChanged = (theme: string) => {
  isDark.value = theme === 'dark'
}


// 获取已完成的待办（按完成时间倒序）
const getCompletedMemos = () => {
    return memos.value
        .filter((memo) => memo.completed && memo.completedTime)
        .sort((a, b) => (b.completedTime || 0) - (a.completedTime || 0))
}

// 格式化完成时间
const formatCompletedTime = (timestamp?: number) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now.getTime() - timestamp
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
        return `${diffHours}小时前`
    } else if (diffDays === 1) {
        return '昨天'
    } else if (diffDays < 7) {
        return `${diffDays}天前`
    } else {
        // 显示月日格式
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}月${day}日`
    }
}

// 恢复任务为未完成状态
const uncompleteTask = async (id: number) => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      const result = await window.db.updateMemo(id, {
        completed: false,
        completedTime: undefined
      })
      if (result.success) {
        await loadMemos()
        // showMessage('任务已恢复')
        
        // 通知已完成待办列表刷新
        window.dispatchEvent(new CustomEvent('completedMemoUpdated'))
        
        // 如果有 opener window，也通知它刷新
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'refreshCompletedMemos' }, '*')
          } catch (e) {
            console.warn('向 opener window 发送刷新通知失败:', e)
          }
        }
      } else {
        showMessage('恢复失败: ' + result.error, 'error')
      }
    } else {
      const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
      const index = savedMemos.findIndex((m: any) => m.id === id)
      if (index !== -1) {
        savedMemos[index].completed = false
        delete savedMemos[index].completedTime
        localStorage.setItem('memos', JSON.stringify(savedMemos))
        await loadMemos()
        // showMessage('任务已恢复')
        
        // 通知已完成待办列表刷新
        window.dispatchEvent(new CustomEvent('completedMemoUpdated'))
        
        // 如果有 opener window，也通知它刷新
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'refreshCompletedMemos' }, '*')
          } catch (e) {
            console.warn('向 opener window 发送刷新通知失败:', e)
          }
        }
      }
    }
  } catch (error) {
    console.error('恢复任务失败:', error)
    showMessage('恢复失败', 'error')
  }
}

// 删除已完成的待办
const deleteCompletedMemo = async (id: number) => {
    if (confirm('确定要删除这条已完成的备忘录吗？')) {
        await deleteMemo(id)
    }
}

// 清空所有已完成的待办
const clearCompletedMemos = async () => {
    if (confirm('确定要清空所有已完成的待办吗？此操作不可恢复。')) {
        const completedIds = getCompletedMemos().map((memo) => memo.id!)

        try {
            for (const id of completedIds) {
                if (typeof window !== 'undefined' && window.db) {
                    await window.db.deleteMemo(id)
                } else {
                    const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
                    const filteredMemos = savedMemos.filter((memo: any) => memo.id !== id)
                    localStorage.setItem('memos', JSON.stringify(filteredMemos))
                }
            }

            await loadMemos()
            showMessage(`已清空 ${completedIds.length} 条已完成待办`)

            // 在清空后自动清理无用图片
            if (typeof window !== 'undefined' && window.db) {
                setTimeout(async () => {
                    try {
                        await window.db.cleanupUnusedImages()
                    } catch (error) {
                        console.warn('Auto cleanup failed:', error)
                    }
                }, 1000)
            }
        } catch (error) {
            console.error('Clear completed memos error:', error)
            showMessage('清空失败', 'error')
        }
    }
}

// 查看已完成待办详情
const viewCompletedMemoDetail = (memo: Memo) => {
    selectedCompletedMemo.value = memo
    
    // 创建纯对象用于传递，避免 reactive 对象序列化问题
    const memoData = {
        id: memo.id,
        title: memo.title,
        content: memo.content,
        quadrant: memo.quadrant,
        completed: memo.completed,
        created: memo.created,
        completedTime: memo.completedTime,
        sortOrder: memo.sortOrder
    }
    
    createModalWindow('completed-memo-detail', { memo: memoData })
}

// 从详情页恢复任务
const uncompleteTaskFromDetail = async (id?: number) => {
  try {
    if (id) {
      // 独立窗口模式，直接使用传递的 ID
      await uncompleteTask(id)
      // 关闭独立窗口
      if (window.close) {
        window.close()
      }
    } else if (selectedCompletedMemo.value) {
      // 普通模式，使用选中的备忘录 ID
      await uncompleteTask(selectedCompletedMemo.value.id!)
      selectedCompletedMemo.value = null
      // 关闭详情弹框
      showCompletedDetailModal.value = false
      
      // 通知已完成待办列表刷新
      window.dispatchEvent(new CustomEvent('completedMemoUpdated'))
    } else {
    }
  } catch (error) {
    console.error('恢复任务失败:', error)
    showMessage('恢复任务失败', 'error')
  }
}

// 格式化创建时间
const formatCreatedTime = (timestamp?: number) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

// 初始化版本信息
const initVersionInfo = () => {
    // 这里可以从构建时注入的环境变量获取，或者使用默认值
    appVersion.value = '1.0.0'
    buildTime.value = new Date().toLocaleDateString()
}

// 加载当前数据存储目录
const loadCurrentDataPath = async () => {
    try {
        if (typeof window !== 'undefined' && window.db) {
            const result = await window.db.getCurrentDataPath()
            if (result.success) {
                currentDataPath.value = result.path || ''

                // 如果图片目录不存在但有图片内容，提示用户
                if (!result.imagesExists && result.imageCount === 0) {
                    console.warn('图片目录不存在或为空')
                }
            } else {
                console.warn('Failed to get current data path:', result.error || 'Unknown error')
                currentDataPath.value = '获取失败'
            }
        } else {
            console.warn('window.db is not available')
            currentDataPath.value = 'Web环境'
        }
    } catch (error) {
        console.error('Failed to load current data path:', error)
        currentDataPath.value = '获取失败'
    }
}

// 选择新的数据存储目录
const selectNewDataDirectory = async () => {
    try {
        if (typeof window !== 'undefined' && window.db) {
            const result = await window.db.selectDataDirectory()
            if (result.success && result.path) {
                // 先显示选择的目录，让用户确认
                if (
                    confirm(`您选择了以下目录：

${result.path}

确定要将数据迁移到此目录吗？

数据将被复制到新位置，应用需要重启后生效。`)
                ) {
                    // 用户确认后，开始迁移
                    const migrateResult = await window.db.migrateDataDirectory(result.path)
                    if (migrateResult.success) {
                        showMessage(migrateResult.message || '数据迁移成功')
                        currentDataPath.value = result.path

                        // 提示用户重启应用
                        setTimeout(() => {
                            if (confirm('数据迁移完成，是否立即重启应用？')) {
                                // 先关闭设置弹框
                                closeModalWindow()
                                // 使用Electron API重启应用
                                if (typeof window !== 'undefined' && window.electronAPI) {
                                    // 先尝试立即重启方法
                                    if (window.electronAPI.restartAppNow) {
                                        window.electronAPI.restartAppNow()
                                    } else if (window.electronAPI.restartApp) {
                                        window.electronAPI.restartApp().then((result: any) => {
                                            if (!result.success) {
                                                console.error('重启失败:', result.error)
                                                // 如果重启失败，尝试使用location.reload()
                                                location.reload()
                                            }
                                        }).catch((error: any) => {
                                            console.error('重启API调用异常:', error)
                                            // 如果API调用异常，尝试使用location.reload()
                                            location.reload()
                                        })
                                    } else {
                                        location.reload()
                                    }
                                } else {
                                    // 如果不在Electron环境中，使用location.reload()
                                    location.reload()
                                }
                            }
                        }, 1000)
                    } else {
                        showMessage('迁移失败: ' + migrateResult.error, 'error')
                    }
                }
                // 如果用户取消确认，什么都不做，保持当前状态
            } else if (!result.canceled) {
                showMessage('选择目录失败', 'error')
            }
            // 如果用户取消了目录选择，什么都不做
        } else {
            showMessage('Web 环境不支持此功能', 'warning')
        }
    } catch (error) {
        console.error('Select data directory error:', error)
        showMessage('选择目录失败', 'error')
    }
}

// 打开数据存储目录
const openDataDirectory = async () => {
    if (currentDataPath.value) {
        try {
            if (typeof window !== 'undefined' && window.db) {
                const result = await window.db.openDirectory(currentDataPath.value)
                if (!result.success) {
                    showMessage('打开目录失败', 'error')
                }
            } else {
                // Web 环境复制路径到剪贴板
                navigator.clipboard?.writeText(currentDataPath.value)
                showMessage('路径已复制到剪贴板')
            }
        } catch (error) {
            console.error('Open directory error:', error)
            showMessage('打开目录失败', 'error')
        }
    }
}

// 窗口控制函数
const minimizeWindow = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        // 在最小化前记录窗口大小
        const currentSize = await getCurrentWindowSize()
        if (currentSize) {
            // 如果当前是折叠状态，需要更新beforeCollapseSize的宽度（用户可能调整了宽度）
            if (isCollapsed.value) {
                // 保持原来的高度，但更新宽度（用户可能在折叠后调整了宽度）
                beforeCollapseSize.value = { 
                    width: currentSize.width, 
                    height: beforeCollapseSize.value.height 
                }
            } else {
                // 如果当前是展开状态，记录当前尺寸
                beforeCollapseSize.value = { width: currentSize.width, height: currentSize.height }
            }
            
            // 同时更新originalWindowSize，确保它始终是最新的用户调整尺寸
            originalWindowSize.value = { width: currentSize.width, height: currentSize.height }
        }
        
        window.electronAPI.minimize()
    }
}

const closeWindow = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.quitApp()
    }
}
// 处理标题栏鼠标进入事件
const handleTitlebarMouseEnter = () => {
    // 清除可能存在的折叠定时器
    if (collapseTimer.value) {
        clearTimeout(collapseTimer.value)
        collapseTimer.value = null
    }
    
    // 拖拽功能由CSS的-webkit-app-region: drag自动处理
    // 移除自动展开逻辑，让用户手动控制展开/折叠状态
}

// 处理标题栏鼠标离开事件
const handleTitlebarMouseLeave = () => {
    // 拖拽功能由CSS自动处理，这里不需要额外操作
    // 移除自动折叠逻辑，让用户手动控制展开/折叠状态
}

// 自动展开函数（用于弹窗显示时）
const autoExpand = async () => {
    // 如果当前是折叠状态，则自动展开
    if (isCollapsed.value || !isExpanded.value) {
        isExpanded.value = true
        isCollapsed.value = false
        
        // 调整窗口大小
        if (typeof window !== 'undefined' && window.electronAPI) {
            // 获取当前窗口宽度，使用当前宽度和之前记录的高度
            const currentSize = await getCurrentWindowSize()
            if (currentSize) {
                // 使用当前宽度，保持之前记录的高度
                await window.electronAPI.resizeWindow(currentSize.width, beforeCollapseSize.value.height)
            } else {
                // 如果获取失败，使用之前记录的尺寸
                await window.electronAPI.resizeWindow(beforeCollapseSize.value.width, beforeCollapseSize.value.height)
            }
        }
        
        // 重新应用CSS样式
        await nextTick()
        const appElement = document.querySelector('.app') as HTMLElement
        if (appElement) {
            appElement.classList.add('expanded')
            appElement.classList.remove('collapsed')
        }
    }
}

// 自动折叠函数（用于鼠标离开时）
const autoCollapse = async () => {
    // 如果当前是展开状态，则自动折叠
    if (!isCollapsed.value && !isExpanded.value) {
        isCollapsed.value = true
        isExpanded.value = false
        
        // 调整窗口大小
        if (typeof window !== 'undefined' && window.electronAPI) {
            // 获取当前窗口宽度，高度设为40px
            const currentSize = await getCurrentWindowSize()
            if (currentSize) {
                await window.electronAPI.resizeWindow(currentSize.width, 40)
            } else {
                await window.electronAPI.resizeWindow(beforeCollapseSize.value.width, 40)
            }
        }
        
        // 重新应用CSS样式
        await nextTick()
        const appElement = document.querySelector('.app') as HTMLElement
        if (appElement) {
            appElement.classList.add('collapsed')
            appElement.classList.remove('expanded')
        }
    }
}

// 创建独立窗口显示弹框
const createModalWindow = async (modalType: string, data?: any) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        try {
            const result = await window.electronAPI.createModalWindow(modalType, data)
            if (result.success) {
            } else {
                console.error(`创建${modalType}独立窗口失败:`, result.error)
            }
        } catch (error) {
            console.error(`创建${modalType}独立窗口出错:`, error)
        }
    }
}

// 打开数据管理窗口
const openDataManageWindow = async () => {
    await loadMemos() // 确保数据是最新的
    await createModalWindow('data-manage')
}

// 打开设置窗口
const openSettingsWindow = async () => {
    // 重新加载当前数据路径
    await loadCurrentDataPath()
    // 创建独立设置窗口
    await createModalWindow('settings')
}

// 打开已完成待办窗口
const openCompletedMemosWindow = async () => {
    await loadMemos() // 确保数据是最新的
    const completedMemos = getCompletedMemos()
    // 创建纯对象，避免克隆错误
    const serializableMemos = completedMemos.map(memo => ({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        quadrant: memo.quadrant,
        completed: memo.completed,
        created: memo.created,
        completedTime: memo.completedTime,
        sortOrder: memo.sortOrder
    }))
    await createModalWindow('completed-memos', { completedMemos: serializableMemos })
}

// 模态框窗口状态
const isModalWindow = ref(false)
const currentModalType = ref('')
const modalData = ref<any>(null)

// 模态框显示状态
const showEditModal = ref(false)
const showCompletedDetailModal = ref(false)

// 计算属性：是否显示主界面
const showMainContent = computed(() => !isModalWindow.value && isExpanded.value)

// 防抖标志
const isCreatingModal = ref(false)

// 显示模态框内容
const showModalContent = async (modalType: string) => {
    
    // 防止重复创建
    if (isCreatingModal.value) {
        return
    }
    
    // 如果是系统功能说明模态框，创建独立窗口
    if (modalType === 'drag-help') {
        isCreatingModal.value = true
        try {
            await createModalWindow('drag-help')
        } finally {
            // 延迟重置标志，防止快速重复点击
            setTimeout(() => {
                isCreatingModal.value = false
            }, 1000)
        }
        return
    }
    
    // 对于其他模态框，设置状态
    isModalWindow.value = true
    currentModalType.value = modalType
    
    // 如果是设置模态框，需要加载当前数据路径
    if (modalType === 'settings') {
        await loadCurrentDataPath()
    }
    
    // 如果是数据管理模态框，需要加载数据
    if (modalType === 'data-manage') {
        await loadMemos()
    }
    
    // 如果是已完成待办模态框，需要加载数据
    if (modalType === 'completed-memos') {
        await loadMemos()
    }
    
    // 如果是编辑待办模态框，需要加载数据
    if (modalType === 'edit-memo') {
        await loadMemos()
        showEditModal.value = true
    }
    
    // 如果是已完成待办详情模态框
    if (modalType === 'completed-memo-detail') {
        showCompletedDetailModal.value = true
    }

    // 等待下一个 tick 确保 DOM 更新
    await nextTick()
}

// 关闭模态框窗口
const closeModalWindow = () => {
    // 检查是否在独立窗口中
    const urlParams = new URLSearchParams(window.location.hash.substring(1))
    const modalType = urlParams.get('modal')
    const isInModalWindow = !!modalType
    
    // 重置模态框状态
    isModalWindow.value = false
    currentModalType.value = ''
    showEditModal.value = false
    showCompletedDetailModal.value = false
    // showDragHelpModal.value = false // 变量已移除
    
    // 重置其他状态
    isEditing.value = false
    currentMemo.value.id = undefined
    currentMemo.value.title = ''
    currentMemo.value.content = ''
    currentMemo.value.quadrant = ''
    currentMemo.value.completed = false
    selectedCompletedMemo.value = null
    
    // 只有在独立窗口中才关闭窗口
    if (isInModalWindow && typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.closeModalWindow()
    }
}

// 保存所有待办数据
// saveMemos 函数已移除，由拖拽组件处理保存




// 获取象限待办
const getQuadrantMemos = (quadrant: string) => {
    return memos.value
        .filter(memo => memo.quadrant === quadrant)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
}

// 获取象限名称
const getQuadrantName = (quadrant: string) => {
    const names: Record<string, string> = {
        'urgent-important': '重要且紧急',
        'important-not-urgent': '重要不紧急',
        'urgent-not-important': '紧急不重要',
        'not-urgent-not-important': '不重要不紧急'
    }
    return names[quadrant] || quadrant
}

// getDisplayMemos 函数已移除，由拖拽组件处理排序

// 切换展开/折叠状态
const toggleExpandCollapse = async () => {
    // 防抖机制，避免频繁切换
    const now = Date.now();
    if (now - lastToggleTime.value < 300) return;
    
    // 步骤1：判断是否到达顶部，到达之后触发吸顶
    // 如果窗口吸顶且当前是折叠状态，调用吸顶展开API
    if (isWindowDocked.value && isCollapsed.value) {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const success = await window.electronAPI.expandDockedWindow()
            if (success) {
                isExpanded.value = true
                isCollapsed.value = false
            }
        }
        lastToggleTime.value = now;
        return;
    }
    
    // 步骤2：执行收起的公共方法
    // 普通窗口的展开/折叠逻辑
    isExpanded.value = !isExpanded.value
    isCollapsed.value = !isExpanded.value
    
    // 如果展开，则清除折叠状态
    if (isExpanded.value) {
        isCollapsed.value = false
    }
    
    // 调整窗口大小
    if (typeof window !== 'undefined' && window.electronAPI) {
        if (isExpanded.value) {
            // 展开时，使用当前宽度和之前记录的高度
            const currentSize = await getCurrentWindowSize()
            if (currentSize) {
                // 使用当前宽度，保持之前记录的高度
                await window.electronAPI.resizeWindow(currentSize.width, beforeCollapseSize.value.height)
            } else {
                // 如果获取失败，使用之前记录的尺寸
                await window.electronAPI.resizeWindow(beforeCollapseSize.value.width, beforeCollapseSize.value.height)
            }
        } else {
            // 折叠时，先记录当前尺寸，然后只改变高度
            const currentSize = await getCurrentWindowSize()
            if (currentSize) {
                // 记录折叠前的尺寸
                beforeCollapseSize.value = { width: currentSize.width, height: currentSize.height }
                await window.electronAPI.resizeWindow(currentSize.width, 40)
            } else {
                // 如果获取失败，使用记录的宽度
                await window.electronAPI.resizeWindow(originalWindowSize.value.width, 40)
            }
        }
    }
    
    lastToggleTime.value = now;
}

// 切换窗口模式
const toggleWindowMode = async () => {
    isWidgetMode.value = !isWidgetMode.value
    localStorage.setItem('widget-mode', isWidgetMode.value ? 'true' : 'false')

    if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.setWindowMode(isWidgetMode.value)
    }

    // showMessage(isWidgetMode.value ? '已切换到桌面小组件模式' : '已切换到普通窗口模式')
}

// 响应式状态：跟踪窗口是否处于最大化状态
const isMaximized = ref(false)

// 窗口大小记忆
const originalWindowSize = ref({ width: 600, height: 450 })
const isSizeRestored = ref(false)

// 折叠前的窗口尺寸记忆
const beforeCollapseSize = ref({ width: 600, height: 450 })

// 初始化时同步尺寸
const initializeWindowSizes = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        const currentSize = await getCurrentWindowSize()
        if (currentSize) {
            originalWindowSize.value = { width: currentSize.width, height: currentSize.height }
            beforeCollapseSize.value = { width: currentSize.width, height: currentSize.height }
        } else {
            console.warn('无法获取当前窗口尺寸，使用默认值')
        }
    }
}

// 修复窗口恢复时的样式问题
const fixWindowRestoreStyles = async () => {
    try {
        // 强制重新渲染组件
        await nextTick()
        
        // 重新应用CSS样式
        const appElement = document.querySelector('.app') as HTMLElement
        if (appElement) {
            // 强制重新计算样式 - 使用更强力的方法
            appElement.style.visibility = 'hidden'
            appElement.style.display = 'none'
            appElement.offsetHeight // 触发重排
            appElement.style.display = ''
            appElement.style.visibility = 'visible'
            
            // 重新应用窗口状态
            if (isCollapsed.value) {
                appElement.classList.add('collapsed')
                appElement.classList.remove('expanded')
            } else {
                appElement.classList.add('expanded')
                appElement.classList.remove('collapsed')
            }
        }
        
        // 重新应用主题
        const savedTheme = localStorage.getItem('theme')
        isDark.value = savedTheme === 'dark'
        
        // 强制重新计算所有样式
        document.body.style.display = 'none'
        document.body.offsetHeight // 触发重排
        document.body.style.display = ''
        
        // 重新初始化所有状态
        await nextTick()
        
        // 重新应用窗口模式
        if (isWidgetMode.value) {
            const savedWidgetMode = localStorage.getItem('widget-mode')
            isWidgetMode.value = savedWidgetMode !== 'false'
        }
        
        // 重新应用固定到桌面设置
        if (isPinToDesktop.value) {
            const savedPinToDesktop = localStorage.getItem('pin-to-desktop')
            isPinToDesktop.value = savedPinToDesktop !== 'false'
        }
        
        
    } catch (error) {
        console.error('窗口恢复样式修复失败:', error)
    }
}

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
    // ESC 键退出最大化
    if (event.key === 'Escape' && isMaximized.value) {
        event.preventDefault()
        toggleMaximize()
    }
}

// 切换最大化状态
const toggleMaximize = async () => {
    const newMaximizeState = !isMaximized.value

    if (typeof window !== 'undefined' && window.electronAPI) {
        if (newMaximizeState) {
            // 最大化时，记录当前窗口大小
            if (!isSizeRestored.value) {
                // 获取当前窗口大小并保存
                const currentSize = await getCurrentWindowSize()
                if (currentSize) {
                    originalWindowSize.value = currentSize
                }
            }
            
            // 使用Electron原生最大化
            const result = await window.electronAPI.setMaximize(true)
        if (result.success) {
                isMaximized.value = true
                isSizeRestored.value = false
        } else {
                showMessage('窗口最大化失败', 'error')
            }
        } else {
            // 恢复时，恢复到原始大小
            await window.electronAPI.setMaximize(false)
            await window.electronAPI.resizeWindow(originalWindowSize.value.width, originalWindowSize.value.height)
            isMaximized.value = false
            isSizeRestored.value = true
        }
    } else {
        // Web 环境下的最大化处理
        if (newMaximizeState) {
            try {
                await document.documentElement.requestFullscreen()
                isMaximized.value = true
            } catch (error) {
                showMessage('最大化失败', 'error')
            }
        } else {
            try {
                await document.exitFullscreen()
                isMaximized.value = false
            } catch (error) {
                showMessage('退出最大化失败', 'error')
            }
        }
    }
}

// 获取当前窗口大小
const getCurrentWindowSize = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        try {
            const result = await window.electronAPI.getWindowSize()
            if (result.success) {
                return { width: result.width, height: result.height }
            }
            return null
        } catch (error) {
            console.error('获取窗口大小失败:', error)
            return null
        }
    }
    return null
}

// 切换固定到桌面
const togglePinToDesktop = async () => {
    isPinToDesktop.value = !isPinToDesktop.value
    localStorage.setItem('pin-to-desktop', isPinToDesktop.value ? 'true' : 'false')

    if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.setPinToDesktop(isPinToDesktop.value)
    }

    // showMessage(isPinToDesktop.value ? '已固定到桌面' : '已取消固定到桌面')
}

// 全屏功能已替换为最大化功能
// toggleFullscreen 函数已移除
</script>

<style scoped>
@import './styles/main.css';
</style>
