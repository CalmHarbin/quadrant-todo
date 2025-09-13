<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <div class="app" :data-theme="isDark ? 'dark' : 'light'">
          <!-- 顶部工具栏 -->
          <div class="toolbar">
            <div class="toolbar-left">
              <h1 class="app-title">四象限 TODO</h1>
            </div>
            <div class="toolbar-right">
              <!-- TODO: 添加搜索、设置等功能按钮 -->
              <n-button 
                quaternary 
                circle 
                @click="showCompletedModal = true"
                title="已完成的待办"
              >
                📋
              </n-button>
              <n-button 
                quaternary 
                circle 
                @click="showDataManageModal = true"
                title="数据管理"
              >
                📁
              </n-button>
              <n-button 
                quaternary 
                circle 
                @click="showSettingsModal = true"
                title="设置"
              >
                ⚙️
              </n-button>
              <n-button 
                quaternary 
                circle 
                @click="toggleTheme"
              >
                {{ isDark ? '☀️' : '🌙' }}
              </n-button>
            </div>
          </div>

          <!-- 主要内容区域 -->
          <div class="main-content">
            <!-- 四象限网格 -->
            <div class="quadrant-grid">
              <!-- 重要且紧急 -->
              <div class="quadrant urgent-important" 
                   :class="{ 'drag-over': dragOverQuadrant === 'urgent-important' }"
                   @dragenter="dragOverQuadrant = 'urgent-important'"
                   @dragleave="handleDragLeave"
                   @dragover="handleDragOver($event)"
                   @drop="handleQuadrantDrop('urgent-important', $event)">
                <div class="quadrant-header">
                  <h2>重要且紧急</h2>
                  <n-button size="medium" quaternary @click="openAddModal('urgent-important')" class="add-button">
                    ✚
                  </n-button>
                </div>
                <div class="memo-list">
                  <div 
                    v-for="(memo, index) in getQuadrantMemos('urgent-important')" 
                    :key="memo.id"
                    class="memo-card urgent-important-card"
                    :class="{ 'completed': memo.completed, 'dragging': draggedMemo?.id === memo.id, 'long-pressed': currentPressedMemo?.id === memo.id && isDraggable }"
                    draggable="true"
                    @dragstart="handleDragStart(memo, $event)"
                    @drag="handleDrag"
                    @dragover="handleDragOver($event)"
                    @dragenter="handleDragEnter($event)"
                    @drop="handleDrop(memo, 'urgent-important', $event)"
                    @dragend="handleDragEnd()"
                    @mousedown="handleMouseDown(memo, $event)"
                    @mouseup="handleMouseUp()"
                    @dblclick="openEditModal(memo)"
                  >
                    <div class="memo-header">
                      <n-checkbox 
                        :checked="memo.completed"
                        @update:checked="(checked) => toggleMemoComplete(memo.id, checked)"
                        @click.stop
                        @mousedown.stop
                        @dragstart.stop
                      />
                      <div class="memo-title" :class="{ 'completed-text': memo.completed }">
                        {{ memo.title }}
                      </div>
                    </div>
                    <div class="memo-actions">
                      <n-dropdown trigger="hover" :options="getMoveOptions(memo)" @select="handleMoveToQuadrant">
                        <n-button 
                          size="tiny" 
                          quaternary 
                          type="info"
                          @click.stop
                          @mousedown.stop
                        >
                          移动
                        </n-button>
                      </n-dropdown>
                      <n-button 
                        size="tiny" 
                        quaternary 
                        type="error"
                        @click.stop="deleteMemo(memo.id)"
                        @mousedown.stop
                        @dragstart.stop
                      >
                        ×
                      </n-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 重要不紧急 -->
              <div class="quadrant important-not-urgent"
                   :class="{ 'drag-over': dragOverQuadrant === 'important-not-urgent' }"
                   @dragenter="dragOverQuadrant = 'important-not-urgent'"
                   @dragleave="handleDragLeave"
                   @dragover="handleDragOver($event)"
                   @drop="handleQuadrantDrop('important-not-urgent', $event)">
                <div class="quadrant-header">
                  <h2>重要不紧急</h2>
                  <n-button size="medium" quaternary @click="openAddModal('important-not-urgent')" class="add-button">
                    ✚
                  </n-button>
                </div>
                <div class="memo-list">
                  <div 
                    v-for="(memo, index) in getQuadrantMemos('important-not-urgent')" 
                    :key="memo.id"
                    class="memo-card important-not-urgent-card"
                    :class="{ 'completed': memo.completed, 'dragging': draggedMemo?.id === memo.id, 'long-pressed': currentPressedMemo?.id === memo.id && isDraggable }"
                    draggable="true"
                    @dragstart="handleDragStart(memo, $event)"
                    @dragover="handleDragOver($event)"
                    @drop="handleDrop(memo, 'important-not-urgent', $event)"
                    @dragend="handleDragEnd()"
                    @mousedown="handleMouseDown(memo, $event)"
                    @mouseup="handleMouseUp()"
                    @dblclick="openEditModal(memo)"
                  >
                    <div class="memo-header">
                      <n-checkbox 
                        :checked="memo.completed"
                        @update:checked="(checked) => toggleMemoComplete(memo.id, checked)"
                        @click.stop
                      />
                      <div class="memo-title" :class="{ 'completed-text': memo.completed }">
                        {{ memo.title }}
                      </div>
                    </div>
                    <div class="memo-actions">
                      <n-dropdown trigger="hover" :options="getMoveOptions(memo)" @select="handleMoveToQuadrant">
                        <n-button 
                          size="tiny" 
                          quaternary 
                          type="info"
                          @click.stop
                          @mousedown.stop
                        >
                          移动
                        </n-button>
                      </n-dropdown>
                      <n-button 
                        size="tiny" 
                        quaternary 
                        type="error"
                        @click.stop="deleteMemo(memo.id)"
                        @mousedown.stop
                        @dragstart.stop
                      >
                        ×
                      </n-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 紧急不重要 -->
              <div class="quadrant urgent-not-important"
                   :class="{ 'drag-over': dragOverQuadrant === 'urgent-not-important' }"
                   @dragenter="dragOverQuadrant = 'urgent-not-important'"
                   @dragleave="handleDragLeave"
                   @dragover="handleDragOver($event)"
                   @drop="handleQuadrantDrop('urgent-not-important', $event)">
                <div class="quadrant-header">
                  <h2>紧急不重要</h2>
                  <n-button size="medium" quaternary @click="openAddModal('urgent-not-important')" class="add-button">
                    ✚
                  </n-button>
                </div>
                <div class="memo-list">
                  <div 
                    v-for="(memo, index) in getQuadrantMemos('urgent-not-important')" 
                    :key="memo.id"
                    class="memo-card urgent-not-important-card"
                    :class="{ 'completed': memo.completed, 'dragging': draggedMemo?.id === memo.id, 'long-pressed': currentPressedMemo?.id === memo.id && isDraggable }"
                    draggable="true"
                    @dragstart="handleDragStart(memo, $event)"
                    @dragover="handleDragOver($event)"
                    @drop="handleDrop(memo, 'urgent-not-important', $event)"
                    @dragend="handleDragEnd()"
                    @mousedown="handleMouseDown(memo, $event)"
                    @mouseup="handleMouseUp()"
                    @dblclick="openEditModal(memo)"
                  >
                    <div class="memo-header">
                      <n-checkbox 
                        :checked="memo.completed"
                        @update:checked="(checked) => toggleMemoComplete(memo.id, checked)"
                        @click.stop
                      />
                      <div class="memo-title" :class="{ 'completed-text': memo.completed }">
                        {{ memo.title }}
                      </div>
                    </div>
                    <div class="memo-actions">
                      <n-dropdown trigger="hover" :options="getMoveOptions(memo)" @select="handleMoveToQuadrant">
                        <n-button 
                          size="tiny" 
                          quaternary 
                          type="info"
                          @click.stop
                          @mousedown.stop
                        >
                          移动
                        </n-button>
                      </n-dropdown>
                      <n-button 
                        size="tiny" 
                        quaternary 
                        type="error"
                        @click.stop="deleteMemo(memo.id)"
                        @mousedown.stop
                        @dragstart.stop
                      >
                        ×
                      </n-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 不重要不紧急 -->
              <div class="quadrant not-urgent-not-important"
                   :class="{ 'drag-over': dragOverQuadrant === 'not-urgent-not-important' }"
                   @dragenter="dragOverQuadrant = 'not-urgent-not-important'"
                   @dragleave="handleDragLeave"
                   @dragover="handleDragOver($event)"
                   @drop="handleQuadrantDrop('not-urgent-not-important', $event)">
                <div class="quadrant-header">
                  <h2>不重要不紧急</h2>
                  <n-button size="medium" quaternary @click="openAddModal('not-urgent-not-important')" class="add-button">
                    ✚
                  </n-button>
                </div>
                <div class="memo-list">
                  <div 
                    v-for="(memo, index) in getQuadrantMemos('not-urgent-not-important')" 
                    :key="memo.id"
                    class="memo-card not-urgent-not-important-card"
                    :class="{ 'completed': memo.completed, 'dragging': draggedMemo?.id === memo.id, 'long-pressed': currentPressedMemo?.id === memo.id && isDraggable }"
                    draggable="true"
                    @dragstart="handleDragStart(memo, $event)"
                    @dragover="handleDragOver($event)"
                    @drop="handleDrop(memo, 'not-urgent-not-important', $event)"
                    @dragend="handleDragEnd()"
                    @mousedown="handleMouseDown(memo, $event)"
                    @mouseup="handleMouseUp()"
                    @dblclick="openEditModal(memo)"
                  >
                    <div class="memo-header">
                      <n-checkbox 
                        :checked="memo.completed"
                        @update:checked="(checked) => toggleMemoComplete(memo.id, checked)"
                        @click.stop
                      />
                      <div class="memo-title" :class="{ 'completed-text': memo.completed }">
                        {{ memo.title }}
                      </div>
                    </div>
                    <div class="memo-actions">
                      <n-dropdown trigger="hover" :options="getMoveOptions(memo)" @select="handleMoveToQuadrant">
                        <n-button 
                          size="tiny" 
                          quaternary 
                          type="info"
                          @click.stop
                          @mousedown.stop
                        >
                          移动
                        </n-button>
                      </n-dropdown>
                      <n-button 
                        size="tiny" 
                        quaternary 
                        type="error"
                        @click.stop="deleteMemo(memo.id)"
                        @mousedown.stop
                        @dragstart.stop
                      >
                        ×
                      </n-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 编辑/新增 Modal -->
          <n-modal v-model:show="showModal" preset="card" style="width: 800px; max-width: 90vw;">
            <template #header>
              <span>{{ isEditing ? '编辑备忘录' : '新增备忘录' }}</span>
            </template>
            
            <div class="modal-content">
              <n-form ref="formRef" :model="currentMemo" :rules="formRules">
                <n-form-item label="标题" path="title">
                  <n-input 
                    v-model:value="currentMemo.title" 
                    placeholder="请输入标题（最多50个字符）"
                    clearable
                    maxlength="50"
                    show-count
                  />
                </n-form-item>
                
                <n-form-item label="象限" path="quadrant" v-if="isEditing">
                  <n-select 
                    v-model:value="currentMemo.quadrant" 
                    :options="quadrantOptions"
                    placeholder="选择象限"
                  />
                </n-form-item>
                
                <n-form-item label="内容" path="content">
                  <div class="rich-editor-container">
                    <div 
                      ref="editorRef"
                      class="rich-editor"
                      contenteditable="true"
                      @input="handleEditorInput"
                      @paste="handlePaste"
                      @focus="handleEditorFocus"
                    ></div>
                    <div class="editor-toolbar">
                      <small>支持直接粘贴图片，图片将保存在本地</small>
                    </div>
                  </div>
                </n-form-item>
              </n-form>
            </div>
            
            <template #footer>
              <div class="modal-footer">
                <n-button @click="showModal = false">取消</n-button>
                <n-button type="primary" @click="saveMemo">
                  {{ isEditing ? '更新' : '保存' }}
                </n-button>
              </div>
            </template>
          </n-modal>

          <!-- 数据管理 Modal -->
          <n-modal v-model:show="showDataManageModal" preset="card" style="width: 500px; max-width: 90vw; max-height: 80vh;">
            <template #header>
              <span>📁 数据管理</span>
            </template>
            
            <div class="data-manage-content custom-scrollbar" style="max-height: 60vh; overflow-y: auto;">
              <n-space vertical size="medium">
                <!-- 数据导出 -->
                <div class="data-section">
                  <h3>📤 数据导出</h3>
                  <p>将您的所有 TODO 数据和图片导出为压缩包，完整备份和迁移。</p>
                  <n-space>
                    <n-button type="primary" @click="exportPackage">
                      📦 导出压缩包
                    </n-button>
                  </n-space>
                </div>

                <n-divider />

                <!-- 数据导入 -->
                <div class="data-section">
                  <h3>📥 数据导入</h3>
                  <p>从压缩包中恢复数据，支持图片恢复。</p>
                  <n-space>
                    <n-upload
                      :show-file-list="false"
                      @before-upload="handlePackageUpload"
                      accept=".zip,.rar,.7z"
                    >
                      <n-button type="primary">📦 导入压缩包</n-button>
                    </n-upload>
                  </n-space>
                </div>

                <n-divider />

                <!-- 数据统计 -->
                <div class="data-section">
                  <h3>📊 数据统计</h3>
                  <n-space>
                    <n-statistic label="总备忘录数" :value="memos.length" />
                    <n-statistic label="重要且紧急" :value="getQuadrantMemos('urgent-important').length" />
                    <n-statistic label="重要不紧急" :value="getQuadrantMemos('important-not-urgent').length" />
                    <n-statistic label="紧急不重要" :value="getQuadrantMemos('urgent-not-important').length" />
                    <n-statistic label="不重要不紧急" :value="getQuadrantMemos('not-urgent-not-important').length" />
                  </n-space>
                </div>

                <n-divider />

                <!-- 图片清理 -->
                <div class="data-section">
                  <h3>🖼️ 图片清理</h3>
                  <p>清理未被使用的图片文件，释放存储空间。建议定期执行此操作。</p>
                  <n-button @click="cleanupUnusedImages">
                    🧹 清理无用图片
                  </n-button>
                </div>

                <n-divider />

                <!-- 危险操作 -->
                <div class="data-section danger-section">
                  <h3>⚠️ 危险操作</h3>
                  <p>请谨慎操作，此操作不可恢夏！</p>
                  <n-button 
                    type="error" 
                    @click="confirmClearData"
                    secondary
                  >
                    🗑️ 清空所有数据
                  </n-button>
                </div>
              </n-space>
            </div>
            
            <template #footer>
              <div class="modal-footer">
                <n-button @click="showDataManageModal = false">关闭</n-button>
              </div>
            </template>
          </n-modal>

          <!-- 已完成待办 Modal -->
          <n-modal v-model:show="showCompletedModal" preset="card" style="width: 800px; max-width: 90vw;">
            <template #header>
              <span>📋 已完成的待办</span>
            </template>
            
            <div class="completed-memo-content">
              <div v-if="getCompletedMemos().length === 0" class="empty-state">
                <div class="empty-icon">✓</div>
                <p>还没有已完成的待办</p>
              </div>
              <div v-else class="completed-memo-list">
                <div 
                  v-for="memo in getCompletedMemos()" 
                  :key="memo.id"
                  class="completed-memo-item"
                  @dblclick="viewCompletedMemoDetail(memo)"
                >
                  <div class="completed-memo-header">
                    <div class="completed-memo-title">{{ memo.title }}</div>
                    <div class="completed-memo-meta">
                      <span class="quadrant-tag" :class="memo.quadrant">{{ getQuadrantName(memo.quadrant) }}</span>
                      <span class="completed-time">{{ formatCompletedTime(memo.completedTime) }}</span>
                    </div>
                  </div>
                  <div class="completed-memo-actions">
                    <n-button 
                      size="small" 
                      @click="uncompleteTask(memo.id)"
                      type="warning"
                      secondary
                    >
                      恢复
                    </n-button>
                    <n-button 
                      size="small" 
                      @click="deleteCompletedMemo(memo.id)"
                      type="error"
                      secondary
                    >
                      删除
                    </n-button>
                  </div>
                </div>
              </div>
            </div>
            
            <template #footer>
              <div class="modal-footer">
                <n-button @click="showCompletedModal = false">关闭</n-button>
                <n-button 
                  v-if="getCompletedMemos().length > 0"
                  @click="clearCompletedMemos"
                  type="error"
                  secondary
                >
                  清空已完成
                </n-button>
              </div>
            </template>
          </n-modal>
          
          <!-- 已完成待办详情 Modal -->
          <n-modal v-model:show="showCompletedDetailModal" preset="card" style="width: 700px; max-width: 90vw;">
            <template #header>
              <span>📋 已完成待办详情</span>
            </template>
            
            <div class="completed-detail-content" v-if="selectedCompletedMemo">
              <div class="detail-section">
                <h4>标题</h4>
                <p class="detail-title">{{ selectedCompletedMemo.title }}</p>
              </div>
              
              <div class="detail-section">
                <h4>象限</h4>
                <span class="quadrant-tag" :class="selectedCompletedMemo.quadrant">
                  {{ getQuadrantName(selectedCompletedMemo.quadrant) }}
                </span>
              </div>
              
              <div class="detail-section">
                <h4>完成时间</h4>
                <p class="detail-time">{{ formatCompletedTime(selectedCompletedMemo.completedTime) }}</p>
              </div>
              
              <div class="detail-section" v-if="selectedCompletedMemo.content">
                <h4>内容详情</h4>
                <div class="detail-content" v-html="selectedCompletedMemo.content"></div>
              </div>
              
              <div class="detail-section" v-if="selectedCompletedMemo.created">
                <h4>创建时间</h4>
                <p class="detail-created">{{ formatCreatedTime(selectedCompletedMemo.created) }}</p>
              </div>
            </div>
            
            <template #footer>
              <div class="modal-footer">
                <n-button @click="showCompletedDetailModal = false">关闭</n-button>
                <n-button 
                  v-if="selectedCompletedMemo"
                  @click="uncompleteTaskFromDetail"
                  type="warning"
                  secondary
                >
                  恢复为未完成
                </n-button>
              </div>
            </template>
          </n-modal>
          
          <!-- 设置 Modal -->
          <n-modal v-model:show="showSettingsModal" preset="card" style="width: 600px; max-width: 90vw;">
            <template #header>
              <span>⚙️ 应用设置</span>
            </template>
            
            <div class="settings-content">
              <n-space vertical size="large">
                <!-- 版本信息 -->
                <div class="settings-section">
                  <h3>📟 版本信息</h3>
                  <div class="version-info">
                    <p><strong>应用名称：</strong>四象限TODO</p>
                    <p><strong>应用版本：</strong>{{ appVersion }}</p>
                    <p><strong>构建时间：</strong>{{ buildTime }}</p>
                  </div>
                </div>

                <n-divider />

                <!-- 数据存储目录 -->
                <div class="settings-section">
                  <h3>📁 数据存储目录</h3>
                  <div class="data-path-section">
                    <p><strong>当前目录：</strong></p>
                    <div class="current-path">
                      <n-input 
                        :value="currentDataPath" 
                        readonly 
                        placeholder="获取中..."
                      />
                    </div>
                    <n-space style="margin-top: 12px;">
                      <n-button @click="selectNewDataDirectory">
                        📂 选择新目录
                      </n-button>
                      <n-button @click="openDataDirectory" v-if="currentDataPath">
                        🖼️ 打开目录
                      </n-button>
                    </n-space>
                    <p class="setting-description">
                      您可以更改数据存储位置，数据将被迁移到新位置。
                    </p>
                  </div>
                </div>
              </n-space>
            </div>
            
            <template #footer>
              <div class="modal-footer">
                <n-button @click="showSettingsModal = false">关闭</n-button>
              </div>
            </template>
          </n-modal>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { 
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NButton, 
  NModal, 
  NForm, 
  NFormItem, 
  NInput, 
  NSelect,
  NSpace,
  NDivider,
  NStatistic,
  NUpload,
  NCheckbox,
  NDropdown
} from 'naive-ui'
// 临时使用文本图标替代，避免导入问题
// import { 
//   Add as AddIcon, 
//   Trash as DeleteIcon,
//   Moon as MoonIcon,
//   Sunny as SunIcon
// } from '@vicons/ionicons5'

// TODO: 类型定义应该放在单独的类型文件中
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

// 响应式数据
const memos = ref<Memo[]>([])
const showModal = ref(false)
const isEditing = ref(false)
const isDark = ref(false)
const showDataManageModal = ref(false)
const draggedMemo = ref<Memo | null>(null)
const dragOverQuadrant = ref<string | null>(null)
const autoScrollInterval = ref<number | null>(null)
const isDraggable = ref(false)
const currentPressedMemo = ref<Memo | null>(null)
const pressTimer = ref<number | null>(null)
const editorRef = ref<HTMLElement | null>(null)
const showCompletedModal = ref(false)
const showCompletedDetailModal = ref(false)
const selectedCompletedMemo = ref<Memo | null>(null)
const completedMemos = ref<Memo[]>([])
const showSettingsModal = ref(false)
const currentDataPath = ref('')
const appVersion = ref('1.0.0')
const buildTime = ref('')

const currentMemo = reactive<Memo>({
  title: '',
  content: '',
  quadrant: 'urgent-important',
  completed: false
})

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { max: 50, message: '标题不能超过50个字符', trigger: 'blur' }
  ],
  quadrant: [
    { required: true, message: '请选择象限', trigger: 'change' }
  ]
}

// 象限选项
const quadrantOptions = [
  { label: '重要且紧急', value: 'urgent-important' },
  { label: '重要不紧急', value: 'important-not-urgent' },
  { label: '紧急不重要', value: 'urgent-not-important' },
  { label: '不重要不紧急', value: 'not-urgent-not-important' }
]

// 计算属性：根据象限获取备忘录
const getQuadrantMemos = (quadrant: string) => {
  const now = Date.now()
  const oneDayAgo = now - (24 * 60 * 60 * 1000) // 24小时前
  
  return memos.value
    .filter(memo => {
      // 过滤象限
      if (memo.quadrant !== quadrant) return false
      
      // 如果是已完成的待办，且完成时间超过24小时，则不在主页面展示
      if (memo.completed && memo.completedTime && memo.completedTime < oneDayAgo) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      // 按排序顺序排列，如果没有排序则按创建时间倒序排列（新的在前）
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder
      }
      if (a.sortOrder !== undefined) return -1
      if (b.sortOrder !== undefined) return 1
      return (b.created || 0) - (a.created || 0)  // 改为倒序，新的在前
    })
}

// 主题切换
const toggleTheme = () => {
  isDark.value = !isDark.value
  // TODO: 保存主题设置到本地存储
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// 鼠标按下事件处理
const handleMouseDown = (memo: Memo, event: MouseEvent) => {
  // 不阻止默认行为，让拖拽能正常开始
  currentPressedMemo.value = memo
  
  // 设置长按定时器（300ms后显示视觉反馈）
  pressTimer.value = setTimeout(() => {
    if (currentPressedMemo.value?.id === memo.id) {
      isDraggable.value = true
    }
  }, 300) as any
}

// 鼠标松开事件处理
const handleMouseUp = () => {
  // 清除定时器
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
  
  // 重置状态
  currentPressedMemo.value = null
  
  // 延迟重置拖拽状态，给拖拽操作时间
  setTimeout(() => {
    if (!draggedMemo.value) {
      isDraggable.value = false
    }
  }, 100)
}

// 拖拽开始
const handleDragStart = (memo: Memo, event: DragEvent) => {
  console.log('拖拽开始:', memo.title) // 调试日志
  
  draggedMemo.value = memo
  isDraggable.value = true
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', memo.id?.toString() || '')
    
    // 优化拖拽图像
    try {
      const dragElement = document.createElement('div')
      dragElement.textContent = memo.title.length > 15 ? memo.title.substring(0, 15) + '...' : memo.title
      dragElement.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `
      document.body.appendChild(dragElement)
      
      event.dataTransfer.setDragImage(dragElement, 80, 20)
      
      setTimeout(() => {
        if (document.body.contains(dragElement)) {
          document.body.removeChild(dragElement)
        }
      }, 100)
    } catch (error) {
      console.log('设置拖拽图像失败:', error)
    }
  }
}

// 拖拽过程中
const handleDrag = (event: DragEvent) => {
  // 此事件在拖拽过程中持续触发
  console.log('拖拽中...', event.clientX, event.clientY)
}

// 拖拽进入
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  console.log('拖拽进入')
}

// 拖拽经过
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  
  // 自动滚动功能
  const target = event.currentTarget as HTMLElement
  const memoList = target.closest('.memo-list') as HTMLElement
  if (memoList) {
    const rect = memoList.getBoundingClientRect()
    const scrollThreshold = 50
    const scrollSpeed = 10
    
    // 清除之前的自动滚动
    if (autoScrollInterval.value) {
      clearInterval(autoScrollInterval.value)
      autoScrollInterval.value = null
    }
    
    // 检查是否需要向上滚动
    if (event.clientY - rect.top < scrollThreshold) {
      autoScrollInterval.value = setInterval(() => {
        memoList.scrollTop = Math.max(0, memoList.scrollTop - scrollSpeed)
      }, 16) as any
    }
    // 检查是否需要向下滚动
    else if (rect.bottom - event.clientY < scrollThreshold) {
      autoScrollInterval.value = setInterval(() => {
        memoList.scrollTop = Math.min(
          memoList.scrollHeight - memoList.clientHeight,
          memoList.scrollTop + scrollSpeed
        )
      }, 16) as any
    }
  }
}

// 放置
const handleDrop = async (targetMemo: Memo, targetQuadrant: string, event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  console.log('放置事件:', targetMemo.title, targetQuadrant)
  
  if (!draggedMemo.value || draggedMemo.value.id === targetMemo.id) {
    console.log('拖拽取消或目标相同')
    return
  }
  
  const sourceQuadrant = draggedMemo.value.quadrant
  const targetMemos = getQuadrantMemos(targetQuadrant)
  const targetIndex = targetMemos.findIndex(m => m.id === targetMemo.id)
  
  try {
    // 1. 先更新象限（如果需要）
    if (sourceQuadrant !== targetQuadrant) {
      await updateMemoQuadrant(draggedMemo.value.id!, targetQuadrant)
      console.log('已更新象限:', sourceQuadrant, '->', targetQuadrant)
    }
    
    // 2. 再更新排序
    await updateMemosOrder(targetQuadrant, draggedMemo.value.id!, targetIndex)
    console.log('已更新排序在位置:', targetIndex)
    
    // 3. 刷新数据
    await loadMemos()
    showMessage('移动成功')
  } catch (error) {
    console.error('Drag drop error:', error)
    showMessage('拖拽失败', 'error')
  }
}

// 象限区域拖拽放置
const handleQuadrantDrop = async (targetQuadrant: string, event: DragEvent) => {
  event.preventDefault()
  console.log('象限放置:', targetQuadrant)
  
  if (!draggedMemo.value) {
    return
  }
  
  const sourceQuadrant = draggedMemo.value.quadrant
  
  try {
    // 如果是跨象限拖拽，更新象限
    if (sourceQuadrant !== targetQuadrant) {
      await updateMemoQuadrant(draggedMemo.value.id!, targetQuadrant)
      await loadMemos()
      showMessage(`已移动到${getQuadrantName(targetQuadrant)}`)
    }
  } catch (error) {
    console.error('Quadrant drop error:', error)
    showMessage('移动失败', 'error')
  }
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

// 拖拽离开象限
const handleDragLeave = (event: DragEvent) => {
  // 检查是否真的离开了象限区域
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    dragOverQuadrant.value = null
  }
}

// 拖拽结束
const handleDragEnd = () => {
  draggedMemo.value = null
  dragOverQuadrant.value = null
  isDraggable.value = false
  currentPressedMemo.value = null
  
  // 清除定时器
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
  
  // 清除自动滚动
  if (autoScrollInterval.value) {
    clearInterval(autoScrollInterval.value)
    autoScrollInterval.value = null
  }
}

// 更新备忘录的象限
const updateMemoQuadrant = async (memoId: number, newQuadrant: string) => {
  if (typeof window !== 'undefined' && window.db) {
    const result = await window.db.updateMemo(memoId, { quadrant: newQuadrant })
    if (!result.success) {
      throw new Error(result.error)
    }
  } else {
    const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
    const index = savedMemos.findIndex((m: any) => m.id === memoId)
    if (index !== -1) {
      savedMemos[index].quadrant = newQuadrant
      localStorage.setItem('memos', JSON.stringify(savedMemos))
    }
  }
}

// 更新备忘录排序
const updateMemosOrder = async (quadrant: string, draggedMemoId: number, targetIndex: number) => {
  const quadrantMemos = getQuadrantMemos(quadrant)
  const newOrder: { id: number; sortOrder: number }[] = []
  
  // 重新计算排序
  let orderCounter = 0
  for (let i = 0; i < quadrantMemos.length; i++) {
    if (i === targetIndex) {
      // 在目标位置插入拖拽的备忘录
      newOrder.push({ id: draggedMemoId, sortOrder: orderCounter++ })
    }
    
    if (quadrantMemos[i].id !== draggedMemoId) {
      newOrder.push({ id: quadrantMemos[i].id!, sortOrder: orderCounter++ })
    }
  }
  
  // 如果目标位置在最后，且还没有添加拖拽的备忘录
  if (!newOrder.find(item => item.id === draggedMemoId)) {
    newOrder.push({ id: draggedMemoId, sortOrder: orderCounter })
  }
  
  // 批量更新排序
  for (const item of newOrder) {
    if (typeof window !== 'undefined' && window.db) {
      await window.db.updateMemo(item.id, { sortOrder: item.sortOrder })
    } else {
      const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
      const index = savedMemos.findIndex((m: any) => m.id === item.id)
      if (index !== -1) {
        savedMemos[index].sortOrder = item.sortOrder
        localStorage.setItem('memos', JSON.stringify(savedMemos))
      }
    }
  }
}

// 获取移动选项
const getMoveOptions = (memo: Memo) => {
  const currentQuadrant = memo.quadrant
  const allQuadrants = [
    { key: 'urgent-important', label: '重要且紧急' },
    { key: 'important-not-urgent', label: '重要不紧急' },
    { key: 'urgent-not-important', label: '紧急不重要' },
    { key: 'not-urgent-not-important', label: '不重要不紧急' }
  ]
  
  return allQuadrants
    .filter(q => q.key !== currentQuadrant)
    .map(q => ({
      key: `${memo.id}-${q.key}`,
      label: `移动到 ${q.label}`,
      quadrant: q.key,
      memoId: memo.id
    }))
}

// 处理移动到象限
const handleMoveToQuadrant = async (key: string) => {
  const [memoId, targetQuadrant] = key.split('-').slice(0, 2)
  const fullTargetQuadrant = key.split('-').slice(1).join('-')
  
  try {
    await updateMemoQuadrant(Number(memoId), fullTargetQuadrant)
    await loadMemos()
    showMessage(`已移动到${getQuadrantName(fullTargetQuadrant)}`)
  } catch (error) {
    console.error('Move memo error:', error)
    showMessage('移动失败', 'error')
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
      currentNode = currentNode.parentNode
    }
  }
  
  // 将编辑器中的 base64 图片替换为原始路径用于保存
  let content = target.innerHTML
  
  // 查找所有具有 data-original-src 属性的图片
  const images = target.querySelectorAll('img[data-original-src]')
  images.forEach((img: HTMLImageElement) => {
    const originalSrc = img.getAttribute('data-original-src')
    const currentSrc = img.getAttribute('src')
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
  currentMemo.content = content
}

// 处理编辑器获得焦点
const handleEditorFocus = () => {
  // 确保编辑器获得焦点时，内容同步
  if (editorRef.value) {
    currentMemo.content = editorRef.value.innerHTML
  }
}

// 设置编辑器内容（保持光标位置）
const setEditorContent = async (content: string) => {
  if (!editorRef.value) return
  
  // 如果内容相同，不更新
  if (editorRef.value.innerHTML === content) return
  
  // 在显示前将本地路径转换为 base64
  const displayContent = await convertLocalPathToBase64(content)
  
  // 保存当前光标位置
  const selection = window.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null
  const cursorOffset = range ? range.startOffset : 0
  const cursorContainer = range ? range.startContainer : null
  
  // 更新内容
  editorRef.value.innerHTML = displayContent
  
  // 重新绑定所有图片事件
  const imgContainers = editorRef.value.querySelectorAll('.resizable-image-container')
  imgContainers.forEach(container => {
    bindImageEvents(container as HTMLElement)
  })
  
  // 恢复光标位置
  if (cursorContainer && range) {
    setTimeout(() => {
      try {
        const newSelection = window.getSelection()
        const newRange = document.createRange()
        
        // 尝试在原位置恢复光标
        if (editorRef.value!.contains(cursorContainer)) {
          newRange.setStart(cursorContainer, Math.min(cursorOffset, cursorContainer.textContent?.length || 0))
        } else {
          // 如果原位置不存在，放在末尾
          const lastChild = editorRef.value!.lastChild
          if (lastChild) {
            if (lastChild.nodeType === Node.TEXT_NODE) {
              newRange.setStart(lastChild, lastChild.textContent?.length || 0)
            } else {
              newRange.setStartAfter(lastChild)
            }
          } else {
            newRange.setStart(editorRef.value!, 0)
          }
        }
        
        newRange.collapse(true)
        newSelection?.removeAllRanges()
        newSelection?.addRange(newRange)
      } catch (error) {
        // 如果恢复失败，将光标移到末尾
        try {
          const newSelection = window.getSelection()
          const newRange = document.createRange()
          newRange.selectNodeContents(editorRef.value!)
          newRange.collapse(false) // 倒数第二个参数为false表示在末尾
          newSelection?.removeAllRanges()
          newSelection?.addRange(newRange)
        } catch (fallbackError) {
          console.warn('无法设置光标位置:', fallbackError)
        }
      }
    }, 0)
  } else {
    // 如果没有保存的光标位置，将光标放在末尾
    setTimeout(() => {
      try {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(editorRef.value!)
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      } catch (error) {
        console.warn('无法设置初始光标位置:', error)
      }
    }, 0)
  }
}

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
            console.log('图片保存成功，文件路径:', result.path)
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

// 将编辑器内容中的 base64 图片转换为本地文件路径（用于保存）
const convertBase64ToLocalPath = async (content: string): Promise<string> => {
  if (!content || typeof window === 'undefined' || !window.db) {
    return content
  }

  // 匹配 base64 图片
  const base64Regex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"[^>]*>/g
  let convertedContent = content
  let match
  
  while ((match = base64Regex.exec(content)) !== null) {
    const fullMatch = match[0]
    const base64Data = `data:image/jpeg;base64,${match[1]}`
    
    try {
      // 保存图片到本地文件系统
      const timestamp = Date.now()
      const fileName = `converted_${timestamp}.jpg`
      const result = await window.db.saveImage(base64Data, fileName)
      
      if (result.success) {
        const localPath = `app://local-file/${result.path}`
        const newImgTag = fullMatch.replace(/src="data:image\/[^;]+;base64,[^"]+"/, `src="${localPath}"`)
        convertedContent = convertedContent.replace(fullMatch, newImgTag)
        console.log('转换图片路径:', fileName, '->', localPath)
      }
    } catch (error) {
      console.warn('转换图片失败:', error)
    }
  }
  
  return convertedContent
}

// 将本地文件路径转换为 base64（用于显示）
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
      // 获取图片的 base64 数据（通过 IPC 通信）
      const result = await window.db.getImageBase64?.(relativePath)
      
      if (result?.success && result.base64) {
        const newImgTag = fullMatch.replace(/src="app:\/\/local-file\/[^"]+"/, `src="${result.base64}"`)
        convertedContent = convertedContent.replace(fullMatch, newImgTag)
        console.log('恢复图片显示:', relativePath)
      } else {
        console.warn('获取图片 base64 失败:', relativePath, result?.error)
      }
    } catch (error) {
      console.warn('获取图片路径失败:', error)
    }
  }
  
  return convertedContent
}

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
  
  // 绑定拖拽事件
  let isResizing = false
  let startX = 0, startY = 0, startWidth = 0, startHeight = 0
  
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
      
      currentMemo.content = editorRef.value!.innerHTML
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
  if (imageUrl.startsWith('app://local-file/') && typeof window !== 'undefined' && window.db?.getImageBase64) {
    try {
      const relativePath = imageUrl.replace('app://local-file/', '')
      const result = await window.db.getImageBase64(relativePath)
      if (result.success && result.base64) {
        displayUrl = result.base64
        console.log('转换本地路径为 base64 显示:', relativePath)
      }
    } catch (error) {
      console.warn('无法获取图片 base64，使用原路径:', error)
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
  img.src = displayUrl  // 使用转换后的 base64 显示
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
        const newImgContainers = editorRef.value!.querySelectorAll('.resizable-image-container')
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
  currentMemo.content = editorRef.value.innerHTML
}

// 选中图片
const selectImage = (container: HTMLElement) => {
  // 清除文本选中
  window.getSelection()?.removeAllRanges()
  
  // 清除其他选中状态
  document.querySelectorAll('.resizable-image-container').forEach(el => {
    el.style.border = '2px solid transparent'
    const handle = el.querySelector('.resize-handle') as HTMLElement
    if (handle) handle.style.display = 'none'
  })
  
  // 设置当前选中状态，只在图片容器上显示边框
  container.style.border = '2px solid #40a9ff'
  const handle = container.querySelector('.resize-handle') as HTMLElement
  if (handle) handle.style.display = 'block'
  
  // 点击其他地方取消选中
  const clearSelection = (e: Event) => {
    const target = e.target as Node
    if (!container.contains(target) && target !== container) {
      container.style.border = '2px solid transparent'
      if (handle) handle.style.display = 'none'
      document.removeEventListener('click', clearSelection)
    }
  }
  
  setTimeout(() => {
    document.addEventListener('click', clearSelection)
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
  currentMemo.content = editorRef.value.innerHTML
}

// 打开新增模态框
const openAddModal = (quadrant: string) => {
  isEditing.value = false
  currentMemo.id = undefined
  currentMemo.title = ''
  currentMemo.content = ''
  currentMemo.quadrant = quadrant
  currentMemo.completed = false
  showModal.value = true
  
  // 清空编辑器，但不自动聚焦
  setTimeout(() => {
    if (editorRef.value) {
      editorRef.value.innerHTML = ''
    }
  }, 100)
}

// 打开编辑模态框
const openEditModal = async (memo: Memo) => {
  isEditing.value = true
  currentMemo.id = memo.id
  currentMemo.title = memo.title
  currentMemo.content = memo.content
  currentMemo.quadrant = memo.quadrant
  currentMemo.completed = memo.completed || false
  showModal.value = true
  
  // 设置编辑器内容，但不自动聚焦
  setTimeout(async () => {
    if (editorRef.value) {
      await setEditorContent(memo.content || '')
    }
  }, 100)
}

// 使用全局通知方法
const showMessage = (message: string, type: 'success' | 'error' = 'success') => {
  // 使用原生 DOM 显示通知，避免 useMessage 问题
  const notification = document.createElement('div')
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#52c41a' : '#ff4d4f'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-size: 14px;
  `
  notification.textContent = message
  document.body.appendChild(notification)
  
  setTimeout(() => {
    document.body.removeChild(notification)
  }, 3000)
}

// 保存备忘录
const saveMemo = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      // Electron 环境
      if (isEditing.value && currentMemo.id) {
        const result = await window.db.updateMemo(currentMemo.id, {
          title: currentMemo.title,
          content: currentMemo.content,
          quadrant: currentMemo.quadrant
        })
        
        if (result.success) {
          showMessage('更新成功')
          await loadMemos()
        } else {
          showMessage('更新失败: ' + result.error, 'error')
        }
      } else {
        const result = await window.db.addMemo({
          title: currentMemo.title,
          content: currentMemo.content,
          quadrant: currentMemo.quadrant
        })
        
        if (result.success) {
          showMessage('保存成功')
          await loadMemos()
        } else {
          showMessage('保存失败: ' + result.error, 'error')
        }
      }
    } else {
      // Web 环境使用 localStorage
      const savedMemos = JSON.parse(localStorage.getItem('memos') || '[]')
      
      if (isEditing.value && currentMemo.id) {
        // 更新
        const index = savedMemos.findIndex((m: any) => m.id === currentMemo.id)
        if (index !== -1) {
          savedMemos[index] = { ...currentMemo }
          localStorage.setItem('memos', JSON.stringify(savedMemos))
          showMessage('更新成功')
          await loadMemos()
        }
      } else {
        // 新增
        const newMemo = {
          ...currentMemo,
          id: Date.now(),
          created: Date.now()
        }
        savedMemos.push(newMemo)
        localStorage.setItem('memos', JSON.stringify(savedMemos))
        showMessage('保存成功')
        await loadMemos()
      }
    }
    
    showModal.value = false
  } catch (error) {
    console.error('Save memo error:', error)
    showMessage('操作失败', 'error')
  }
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
        memos.value = result.data
        
        // 在首次加载后执行一次 base64 图片迁移
        try {
          const migrationResult = await window.db.migrateBase64Images?.()
          if (migrationResult?.success && migrationResult.migrated > 0) {
            console.log(`自动迁移了 ${migrationResult.migrated} 张 base64 图片到本地文件`)
            // 迁移后重新加载数据
            const reloadResult = await window.db.getMemos()
            if (reloadResult.success) {
              memos.value = reloadResult.data
            }
          }
        } catch (migrationError) {
          console.warn('图片迁移失败:', migrationError)
        }
      } else {
        showMessage('加载数据失败: ' + result.error, 'error')
      }
    } else {
      // Web 环境使用 localStorage
      const savedMemos = localStorage.getItem('memos')
      if (savedMemos) {
        memos.value = JSON.parse(savedMemos)
      }
    }
  } catch (error) {
    console.error('Load memos error:', error)
    showMessage('加载数据失败', 'error')
  }
}

// 组件挂载时初始化
onMounted(async () => {
  // 加载主题设置
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  
  // 初始化版本信息
  initVersionInfo()
  
  // 获取当前数据存储目录
  await loadCurrentDataPath()
  
  // 加载数据
  await loadMemos()
})

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
        const blob = new Blob([result.data], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `四象限TODO_完整备份_${new Date().toISOString().split('T')[0]}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        showMessage('压缩包导出成功！包含所有数据和图片')
      } else {
        console.error('导出失败:', result.error)
        showMessage('导出失败: ' + result.error, 'error')
      }
    } else {
      // Web 环境不支持压缩包导出
      showMessage('Web 环境不支持压缩包导出', 'warning')
    }
  } catch (error) {
    console.error('Export package error:', error)
    showMessage('导出失败', 'error')
  }
}

// 压缩包上传处理
const handlePackageUpload = async (data: { file: { file?: File } }) => {
  const file = data.file.file
  if (!file) return false
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    await importPackage(buffer)
  } catch (error) {
    console.error('Package upload error:', error)
    showMessage('文件读取失败', 'error')
  }
  
  return false // 阻止默认上传行为
}

// 压缩包导入功能
const importPackage = async (zipData: Uint8Array) => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      const result = await window.db.importPackage(zipData)
      if (result.success) {
        showMessage(`压缩包导入成功！共导入 ${result.imported} 条记录`)
        
        // 应用主题设置
        if (result.theme) {
          localStorage.setItem('theme', result.theme)
        }
        
        await loadMemos()
        showDataManageModal.value = false
        
        // 导入后自动清理无用图片（延迟执行以确保数据已加载）
        setTimeout(async () => {
          try {
            const cleanupResult = await window.db.cleanupUnusedImages()
            if (cleanupResult.success && cleanupResult.cleaned && cleanupResult.cleaned > 0) {
              showMessage(`清理了 ${cleanupResult.cleaned} 个无用图片文件`)
            }
          } catch (error) {
            console.warn('Auto cleanup after import failed:', error)
          }
        }, 2000)
        
        // 刷新页面以应用主题设置
        setTimeout(() => {
          location.reload()
        }, 3000)
      } else {
        showMessage('导入失败: ' + result.error, 'error')
      }
    } else {
      // Web 环境不支持压缩包导入
      showMessage('Web 环境不支持压缩包导入，请使用 JSON 导入', 'warning')
    }
  } catch (error) {
    console.error('Import package error:', error)
    showMessage('导入失败：文件格式错误', 'error')
  }
}

// 确认清空数据
const confirmClearData = () => {
  if (confirm('警告！此操作将清空所有数据，且不可恢夏！\n\n请在操作前先导出数据进行备份。\n\n确定要继续吗？')) {
    clearAllData()
  }
}

// 清空所有数据
const clearAllData = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      const result = await window.db.clearAllData()
      if (result.success) {
        showMessage('所有数据已清空')
        await loadMemos()
        showDataManageModal.value = false
        
        // 重置主题
        isDark.value = false
      } else {
        showMessage('清空失败: ' + result.error, 'error')
      }
    } else {
      // Web 环境
      localStorage.removeItem('memos')
      localStorage.removeItem('theme')
      
      showMessage('所有数据已清空')
      await loadMemos()
      showDataManageModal.value = false
      
      // 重置主题
      isDark.value = false
    }
  } catch (error) {
    console.error('Clear data error:', error)
    showMessage('清空失败', 'error')
  }
}

// 清理无用图片
const cleanupUnusedImages = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      const result = await window.db.cleanupUnusedImages()
      if (result.success) {
        if (result.cleaned && result.cleaned > 0) {
          showMessage(result.message || `清理完成，删除了 ${result.cleaned} 个无用图片`)
        } else {
          showMessage('没有发现无用图片')
        }
      } else {
        showMessage('清理失败: ' + result.error, 'error')
      }
    } else {
      // Web 环境不支持图片清理
      showMessage('Web 环境不支持图片清理功能', 'warning')
    }
  } catch (error) {
    console.error('Cleanup images error:', error)
    showMessage('清理失败', 'error')
  }
}

// 获取已完成的待办（按完成时间倒序）
const getCompletedMemos = () => {
  return memos.value
    .filter(memo => memo.completed && memo.completedTime)
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
        showMessage('任务已恢复')
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
        showMessage('任务已恢复')
      }
    }
  } catch (error) {
    console.error('Uncomplete task error:', error)
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
    const completedIds = getCompletedMemos().map(memo => memo.id!)
    
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
      showCompletedModal.value = false
      
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
  showCompletedDetailModal.value = true
}

// 从详情页恢复任务
const uncompleteTaskFromDetail = async () => {
  if (selectedCompletedMemo.value) {
    await uncompleteTask(selectedCompletedMemo.value.id!)
    showCompletedDetailModal.value = false
    selectedCompletedMemo.value = null
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
        
        // 输出调试信息
        console.log('Data path info:', {
          currentPath: result.path,
          userData: result.userData,
          imagesDir: result.imagesDir,
          imagesExists: result.imagesExists,
          imageCount: result.imageCount
        })
        
        // 如果图片目录不存在但有图片内容，提示用户
        if (!result.imagesExists && result.imageCount === 0) {
          console.warn('图片目录不存在或为空')
        }
      }
    }
  } catch (error) {
    console.error('Failed to load current data path:', error)
  }
}

// 选择新的数据存储目录
const selectNewDataDirectory = async () => {
  try {
    if (typeof window !== 'undefined' && window.db) {
      const result = await window.db.selectDataDirectory()
      if (result.success && result.path) {
        // 确认迁移
        if (confirm(`确定要将数据迁移到以下目录吗？

${result.path}

数据将被复制到新位置，应用需要重启后生效。`)) {
          const migrateResult = await window.db.migrateDataDirectory(result.path)
          if (migrateResult.success) {
            showMessage(migrateResult.message || '数据迁移成功')
            currentDataPath.value = result.path
            
            // 提示用户重启应用
            setTimeout(() => {
              if (confirm('数据迁移完成，是否立即重启应用？')) {
                location.reload()
              }
            }, 1000)
          } else {
            showMessage('迁移失败: ' + migrateResult.error, 'error')
          }
        }
      } else if (!result.canceled) {
        showMessage('选择目录失败', 'error')
      }
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
</script>

<style scoped>
/* 应用主容器 */
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 主题变量定义 */
.app[data-theme="light"] {
  --bg-color: #f5f5f5;
  --text-color: #333;
  --toolbar-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --toolbar-text: #fff;
  --border-color: #e0e0e0;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --radius: 8px;
}

.app[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --toolbar-bg: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
  --toolbar-text: #fff;
  --border-color: #333;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  --radius: 8px;
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--toolbar-text);
  margin: 0;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

/* 四象限网格布局 */
.quadrant-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
  height: 100%;
}

/* 象限样式 */
.quadrant {
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.quadrant.drag-over {
  background: rgba(135, 206, 250, 0.15);
  border: 2px dashed #4CAF50;
  transform: scale(1.02);
}

[data-theme="dark"] .quadrant {
  background: rgba(42, 42, 42, 0.9);
  border: 1px solid var(--border-color);
}

[data-theme="dark"] .quadrant.drag-over {
  background: rgba(76, 175, 80, 0.15);
  border: 2px dashed #4CAF50;
}

/* 象限特定颜色 */
.urgent-important {
  border-left: 4px solid #ff4757;
}

.important-not-urgent {
  border-left: 4px solid #3742fa;
}

.urgent-not-important {
  border-left: 4px solid #ffa502;
}

.not-urgent-not-important {
  border-left: 4px solid #2ed573;
}

/* 象限头部 */
.quadrant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.quadrant-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
}

/* 添加按钮样式 */
.add-button {
  font-size: 18px !important;
  font-weight: bold !important;
  min-width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  transition: all 0.2s ease !important;
}

.add-button:hover {
  transform: scale(1.1) !important;
  background: rgba(64, 169, 255, 0.1) !important;
}

[data-theme="dark"] .add-button {
  color: #e0e0e0 !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

[data-theme="dark"] .add-button:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: #fff !important;
}

/* 备忘录列表 */
.memo-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

/* 备忘录头部布局 */
.memo-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

/* 备忘录卡片 */
.memo-card {
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  position: relative;
  user-select: none;
}

.memo-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.memo-card.dragging {
  opacity: 0.3;
  transform: rotate(2deg) scale(0.95);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  pointer-events: none;
}

.memo-card.long-pressed {
  background: rgba(135, 206, 250, 0.2);
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  cursor: grabbing !important;
}

[data-theme="dark"] .memo-card.long-pressed {
  background: rgba(76, 175, 80, 0.2);
}

[data-theme="dark"] .memo-card {
  background: rgba(60, 60, 60, 0.8);
  border-color: var(--border-color);
}

[data-theme="dark"] .memo-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 备忘录卡片颜色变体 */
.urgent-important-card {
  border-left: 3px solid #ff4757;
}

.important-not-urgent-card {
  border-left: 3px solid #3742fa;
}

.urgent-not-important-card {
  border-left: 3px solid #ffa502;
}

.not-urgent-not-important-card {
  border-left: 3px solid #2ed573;
}

/* 备忘录标题 */
.memo-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-color);
  flex: 1;
  word-break: break-word;
}

[data-theme="dark"] .memo-title {
  color: #f0f0f0;
}

/* 已完成的文字样式 */
.completed-text {
  color: #999 !important;
  text-decoration: line-through;
}

[data-theme="dark"] .completed-text {
  color: #666 !important;
}

/* 已完成的卡片样式 */
.memo-card.completed {
  opacity: 0.7;
  background: rgba(0, 0, 0, 0.03);
}

[data-theme="dark"] .memo-card.completed {
  background: rgba(255, 255, 255, 0.03);
}

/* 备忘录预览 */
.memo-preview {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

[data-theme="light"] .memo-preview {
  color: #666;
}

[data-theme="dark"] .memo-preview {
  color: #bbb;
}

/* 备忘录操作按钮 */
.memo-actions {
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.memo-card:hover .memo-actions {
  opacity: 1;
}

/* 模态框样式 */
.modal-content {
  padding: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 数据管理模态框样式 */
.data-manage-content {
  padding: 0;
}

.data-section h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.data-section p {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

[data-theme="light"] .data-section p {
  color: #666;
}

[data-theme="dark"] .data-section p {
  color: #bbb;
}

.danger-section {
  background: rgba(255, 71, 87, 0.05);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 71, 87, 0.2);
}

[data-theme="dark"] .danger-section {
  background: rgba(255, 71, 87, 0.1);
  border-color: rgba(255, 71, 87, 0.3);
}

.import-text-content {
  padding: 0;
}

/* 已完成待办模态框样式 */
.completed-memo-content {
  padding: 0;
  max-height: calc(80vh - 200px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.completed-memo-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.completed-memo-item {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.completed-memo-item:hover {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .completed-memo-item {
  background: rgba(60, 60, 60, 0.8);
  border-color: #434343;
}

[data-theme="dark"] .completed-memo-item:hover {
  background: rgba(60, 60, 60, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.completed-memo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.completed-memo-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-color);
  text-decoration: line-through;
  opacity: 0.8;
  flex: 1;
  margin-right: 16px;
}

.completed-memo-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.completed-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.quadrant-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
}

.quadrant-tag.urgent-important {
  background: #ff4757;
}

.quadrant-tag.important-not-urgent {
  background: #3742fa;
}

.quadrant-tag.urgent-not-important {
  background: #ffa502;
}

.quadrant-tag.not-urgent-not-important {
  background: #2ed573;
}



.completed-memo-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* 已完成待办详情样式 */
.completed-detail-content {
  padding: 0;
}

.detail-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

[data-theme="dark"] .detail-section h4 {
  color: #bbb;
}

[data-theme="dark"] .detail-section {
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

[data-theme="dark"] .detail-time,
[data-theme="dark"] .detail-created {
  color: #bbb;
}

.detail-content {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 16px;
  line-height: 1.6;
  font-size: 14px;
  color: var(--text-color);
  max-height: 300px;
  overflow-y: auto;
}

[data-theme="dark"] .detail-content {
  background: rgba(255, 255, 255, 0.02);
  border-color: #333;
}

.detail-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

.completed-memo-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.completed-memo-item:hover {
  background: rgba(255, 255, 255, 0.95) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

[data-theme="dark"] .completed-memo-item:hover {
  background: rgba(60, 60, 60, 0.95) !important;
}

/* 设置模态框样式 */
.settings-content {
  padding: 0;
}

.settings-section {
  padding: 16px 0;
}

.settings-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.version-info {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
}

[data-theme="dark"] .version-info {
  background: rgba(255, 255, 255, 0.02);
  border-color: #333;
}

.version-info p {
  margin: 0 0 8px 0;
}

.version-info p:last-child {
  margin-bottom: 0;
}

.data-path-section {
  line-height: 1.6;
}

.data-path-section p {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.current-path {
  margin-bottom: 12px;
}

.setting-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-top: 8px !important;
}

[data-theme="dark"] .setting-description {
  color: #bbb;
}

/* 富文本编辑器样式 */
.rich-editor-container {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.rich-editor {
  width: 100%;
  min-height: 250px;
  max-height: 450px;
  padding: 12px;
  overflow-y: auto;
  background: white;
  line-height: 1.6;
  outline: none;
  border: none;
  box-sizing: border-box;
  word-wrap: break-word;
}

.rich-editor:focus {
  outline: none;
}

.rich-editor-container:focus-within {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

[data-theme="dark"] .rich-editor {
  background: rgba(255, 255, 255, 0.05);
  color: #e0e0e0;
}

[data-theme="dark"] .rich-editor-container {
  border-color: #434343;
}

[data-theme="dark"] .rich-editor-container:focus-within {
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

/* 可调整大小的图片容器 */
.resizable-image-container {
  position: relative;
  display: inline-block;
  margin: 0 4px;
  border: 2px solid transparent;
  border-radius: 4px;
  transition: border-color 0.2s ease;
  vertical-align: top;
  max-width: fit-content;
}

.resizable-image-container:hover {
  border-color: rgba(64, 169, 255, 0.3) !important;
}

.resizable-image-container img {
  display: inline-block;
  margin: 0;
  cursor: pointer;
  vertical-align: top;
  border-radius: 4px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.resize-handle {
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.resize-handle:hover {
  background: #1890ff;
  transform: scale(1.2);
}

.editor-toolbar {
  background: rgba(0, 0, 0, 0.02);
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: #666;
}

[data-theme="dark"] .editor-toolbar {
  background: rgba(255, 255, 255, 0.02);
  color: #999;
}

/* TODO: 添加响应式设计 */
@media (max-width: 768px) {
  .quadrant-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 1fr);
  }
  
  .main-content {
    padding: 10px;
  }
  
  .toolbar {
    padding: 8px 12px;
  }
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
  transition: all 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* hover 时显示滚动条 */
*:hover::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
}

*:hover::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

/* 深色主题滚动条 */
[data-theme="dark"] ::-webkit-scrollbar-track {
  background: transparent;
}

[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: transparent;
}

[data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}

[data-theme="dark"] *:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] *:hover::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

/* 滚动条样式 */
</style>