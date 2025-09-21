<template>
  <div class="memo-list custom-scrollbar">
    <!-- 空状态展示 - 当没有数据时显示 -->
    <div 
      v-if="sortableMemos.length === 0"
      class="empty-quadrant-state"
    >
      <div class="empty-icon">{{ getEmptyIcon() }}</div>
      <div class="empty-title">{{ getEmptyTitle() }}</div>
      <div class="empty-description" v-html="getEmptyDescription()"></div>
      <div class="empty-hint">
        {{ getEmptyHint() }}
      </div>
    </div>
    
    <!-- 可拖拽的备忘录列表 - 始终渲染以支持拖拽 -->
    <draggable
      v-model="sortableMemos"
      :group="group"
      :animation="200"
      ghost-class="sortable-ghost"
      chosen-class="sortable-chosen"
      drag-class="sortable-drag"
      @start="handleDragStart"
      @end="handleDragEnd"
      @add="handleAdd"
      @change="handleChange"
      item-key="id"
      :style="{ 
        minHeight: '100px',
        opacity: sortableMemos.length === 0 ? 0 : 1,
        pointerEvents: sortableMemos.length === 0 ? 'none' : 'auto'
      }"
    >
      <template #item="{ element: memo }">
        <div
          :data-memo-id="memo.id"
          class="memo-card"
          :class="{
            completed: memo.completed
          }"
          @dblclick="$emit('edit', memo)"
        >
          <div class="memo-header">
            <n-checkbox
              :checked="memo.completed"
              @update:checked="(checked: boolean) => $emit('toggle-complete', memo.id!, checked)"
              @click.stop
            />
            <div
              class="memo-title"
              :class="{ 'completed-text': memo.completed }"
            >
              {{ memo.title }}
            </div>
            <n-button
              size="tiny"
              quaternary
              type="error"
              @click.stop="$emit('delete', memo.id!)"
              style="margin-left: auto"
              class="memo-delete-btn"
            >
              ×
            </n-button>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import type { Memo } from '../types'

interface Props {
  memos: Memo[]
  quadrant: string
  group?: string
}

interface Emits {
  (e: 'update-order', newOrder: Memo[]): void
  (e: 'edit', memo: Memo): void
  (e: 'toggle-complete', id: number, completed: boolean): void
  (e: 'delete', id: number): void
  (e: 'drag-start', memo: Memo): void
  (e: 'drag-end'): void
  (e: 'add', evt: any): void
}

const props = withDefaults(defineProps<Props>(), {
  group: 'memos'
})

const emit = defineEmits<Emits>()

// 创建本地可排序的数组
const sortableMemos = ref<Memo[]>([...props.memos])

// 监听 props.memos 变化，同步到本地数组
watch(() => props.memos, (newMemos) => {
  sortableMemos.value = [...newMemos]
}, { deep: true, immediate: true })

// 获取空状态信息
const getEmptyIcon = () => {
  const icons: Record<string, string> = {
    'urgent-important': '🔥',
    'important-not-urgent': '📚',
    'urgent-not-important': '⚡',
    'not-urgent-not-important': '🗑️'
  }
  return icons[props.quadrant] || '📝'
}

const getEmptyTitle = () => {
  const titles: Record<string, string> = {
    'urgent-important': '重要且紧急',
    'important-not-urgent': '重要不紧急',
    'urgent-not-important': '紧急不重要',
    'not-urgent-not-important': '不重要不紧急'
  }
  return titles[props.quadrant] || '待办事项'
}

const getEmptyDescription = () => {
  const descriptions: Record<string, string> = {
    'urgent-important': '需要立即处理的重要任务<br>点击 + 号添加第一个任务',
    'important-not-urgent': '重要但不紧急的任务<br>点击 + 号添加第一个任务',
    'urgent-not-important': '紧急但不重要的任务<br>点击 + 号添加第一个任务',
    'not-urgent-not-important': '不重要不紧急的任务<br>点击 + 号添加第一个任务'
  }
  return descriptions[props.quadrant] || '点击 + 号添加第一个任务'
}

const getEmptyHint = () => {
  const hints: Record<string, string> = {
    'urgent-important': '💡 建议：将截止日期临近的重要工作放在这里',
    'important-not-urgent': '💡 建议：将学习、规划、预防性工作放在这里',
    'urgent-not-important': '💡 建议：将干扰性工作放在这里',
    'not-urgent-not-important': '💡 建议：将可做可不做的工作放在这里'
  }
  return hints[props.quadrant] || '💡 建议：将任务拖拽到这里'
}

// 处理拖拽开始
const handleDragStart = (evt: any) => {
  // vuedraggable 的事件对象结构不同，需要从 item 中获取数据
  let memo = null
  
  // 方法1: 从 dataset 中获取 memoId
  if (evt.item && evt.item.dataset && evt.item.dataset.memoId) {
    const memoId = evt.item.dataset.memoId
    memo = sortableMemos.value.find(m => m.id === parseInt(memoId))
  }
  
  // 方法2: 从 Vue 实例中获取
  if (!memo && evt.item && evt.item._underlying_vm_) {
    memo = evt.item._underlying_vm_.element
  }
  
  // 方法3: 从 __vue__ 中获取
  if (!memo && evt.item && evt.item.__vue__) {
    memo = evt.item.__vue__.element
  }
  
  // 方法4: 从 oldIndex 获取
  if (!memo && evt.oldIndex !== undefined) {
    memo = sortableMemos.value[evt.oldIndex]
  }
  
  if (memo) {
    emit('drag-start', memo)
  }
}

// 处理拖拽结束
const handleDragEnd = (evt: any) => {
  const { newIndex, oldIndex } = evt
  
  // 如果是象限内排序，发出更新事件
  if (newIndex !== undefined && oldIndex !== undefined && newIndex !== oldIndex) {
    emit('update-order', [...sortableMemos.value])
  }
  
  emit('drag-end')
}

// 处理添加（跨象限拖拽）
const handleAdd = (evt: any) => {
  // 尝试获取被拖拽的备忘录
  let memo = null
  if (evt.item && evt.item.dataset && evt.item.dataset.memoId) {
    const memoId = evt.item.dataset.memoId
    memo = sortableMemos.value.find(m => m.id === parseInt(memoId))
  }
  
  if (!memo && evt.oldIndex !== undefined) {
    memo = sortableMemos.value[evt.oldIndex]
  }
  
  emit('add', evt)
}

// 处理变化（包括跨象限拖拽）
const handleChange = (evt: any) => {
  // 如果有添加的元素，说明是跨象限拖拽
  if (evt.added) {
    emit('add', evt)
  }
  
  // 如果有移动的元素，说明是象限内排序
  if (evt.moved) {
    emit('update-order', [...sortableMemos.value])
  }
}
</script>

<style scoped>
@import '../styles/main.css';
/* 拖拽状态样式 */
.memo-card.sortable-ghost {
  opacity: 0.5;
  background: var(--primary-color);
  color: white;
}

.memo-card.sortable-chosen {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.memo-card.sortable-drag {
  transform: rotate(5deg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
</style>
