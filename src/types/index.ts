export interface Memo {
  id?: number
  title: string
  content: string
  quadrant: string
  created?: number
  completed?: boolean
  completedTime?: number
  sortOrder?: number
}

export interface Quadrant {
  id: string
  title: string
  class: string
  cardClass: string
  icon: string
  description: string
  hint: string
}
