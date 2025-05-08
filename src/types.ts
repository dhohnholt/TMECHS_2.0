export interface Student {
  id: string
  barcode: string
  name: string
  email: string
  grade: number
}

export interface Violation {
  id: string
  student_id: string
  violation_type: string
  assigned_date: string
  detention_date: string
  teacher_id: string
  status: 'pending' | 'attended' | 'absent' | 'reassigned'
  created_at: string
}

export interface Teacher {
  id: string
  name: string
  email: string
}

export interface DetentionSlot {
  id: string
  date: string
  teacher_id: string
  capacity: number
  current_count: number
  location: string
}
