<template>
  <div class="quadrant-grid">
    <div
      v-for="quadrant in quadrants"
      :key="quadrant.id"
      class="quadrant"
      :class="quadrant.class"
    >
      <div class="quadrant-header">
        <h2>{{ quadrant.title }}</h2>
        <n-button
          size="medium"
          quaternary
          circle
          @click="$emit('add-memo', quadrant.id)"
          class="add-button"
        >
          ✚
        </n-button>
      </div>
      
      <div class="memo-list custom-scrollbar">
        <!-- 可拖拽的备忘录列表 - 始终渲染以支持拖拽 -->
            <DraggableMemoList
              :memos="getQuadrantMemos(quadrant.id)"
              :quadrant="quadrant.id"
              group="memos"
              @update-order="(newOrder) => $emit('update-order', quadrant.id, newOrder)"
              @edit="$emit('edit', $event)"
              @toggle-complete="(id, completed) => $emit('toggle-complete', id, completed)"
              @delete="$emit('delete', $event)"
              @drag-start="handleMemoDragStart"
              @drag-end="handleMemoDragEnd"
              @add="(evt) => handleAdd(quadrant.id, evt)"
              @change="(evt: any) => handleChange(quadrant.id, evt)"
            />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import DraggableMemoList from './DraggableMemoList.vue'
import type { Memo } from '../types'

interface Props {
  memos: Memo[]
}

interface Emits {
  (e: 'update-order', quadrant: string, newOrder: Memo[]): void
  (e: 'move-between-quadrants', memoId: number, fromQuadrant: string, toQuadrant: string, newIndex: number): void
  (e: 'add-memo', quadrant: string): void
  (e: 'edit', memo: Memo): void
  (e: 'toggle-complete', id: number, completed: boolean): void
  (e: 'delete', id: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const draggedQuadrant = ref<string | null>(null)
const draggedMemo = ref<Memo | null>(null)


const quadrants = [
  {
    id: 'urgent-important',
    title: '重要且紧急',
    class: 'urgent-important',
    cardClass: '',
    icon: '🔥',
    description: '需要立即处理的重要任务<br>点击 + 号添加第一个任务',
    hint: '💡 建议：将截止日期临近的重要工作放在这里'
  },
  {
    id: 'important-not-urgent',
    title: '重要不紧急',
    class: 'important-not-urgent',
    cardClass: '',
    icon: '📚',
    description: '重要但不紧急的任务<br>点击 + 号添加第一个任务',
    hint: '💡 建议：将学习、规划、预防性工作放在这里'
  },
  {
    id: 'urgent-not-important',
    title: '紧急不重要',
    class: 'urgent-not-important',
    cardClass: '',
    icon: '⚡',
    description: '紧急但不重要的任务<br>点击 + 号添加第一个任务',
    hint: '💡 建议：将干扰性工作放在这里'
  },
  {
    id: 'not-urgent-not-important',
    title: '不重要不紧急',
    class: 'not-urgent-not-important',
    cardClass: '',
    icon: '🗑️',
    description: '不重要不紧急的任务<br>点击 + 号添加第一个任务',
    hint: '💡 建议：将可做可不做的工作放在这里'
  }
]

const getQuadrantMemos = (quadrant: string) => {
  return props.memos.filter(memo => memo.quadrant === quadrant)
}



// 处理备忘录拖拽开始
const handleMemoDragStart = (memo: Memo) => {
  if (memo && memo.title) {
    draggedMemo.value = memo
  }
}

// 处理备忘录拖拽结束
const handleMemoDragEnd = () => {
  draggedQuadrant.value = null
  draggedMemo.value = null
}


// 处理跨象限拖拽添加
const handleAdd = (targetQuadrant: string, evt: any) => {
  const { item, newIndex } = evt
  const memoId = item?.dataset?.memoId
  
  if (memoId) {
    const memoIdNum = parseInt(memoId)
    const draggedMemo = props.memos.find(memo => memo.id === memoIdNum)
    
    if (draggedMemo && draggedMemo.quadrant !== targetQuadrant) {
      const targetIndex = newIndex !== undefined ? newIndex : 0
      emit('move-between-quadrants', memoIdNum, draggedMemo.quadrant, targetQuadrant, targetIndex)
    }
  }
}

// 处理变化（包括跨象限拖拽）
const handleChange = (_targetQuadrant: string, evt: any) => {
  // 只处理象限内排序，跨象限拖拽由 handleAdd 处理
  if (evt.moved) {
    // 象限内排序由 handleDragEnd 处理，这里不需要额外处理
  }
}


onMounted(() => {
  // vuedraggable 会自动处理所有拖拽事件
})

onUnmounted(() => {
  // 清理工作
})
</script>

<style scoped>
@import '../styles/main.css';
/* 拖拽状态样式 */
.quadrant.drag-over {
  border-color: var(--primary-color);
  background: rgba(64, 169, 255, 0.1);
  box-shadow: 0 0 0 2px var(--primary-color);
}

.quadrant.drag-over::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px dashed var(--primary-color);
  border-radius: 12px;
  pointer-events: none;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
</style>
