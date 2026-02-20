export interface Course {
  id: string
  user_id: string
  title: string
  subject: string
  level: string
  keywords: string[]
  raw_content?: string
  chapter_id?: string | null
  created_at: string
  updated_at: string
}

export interface CourseListItem {
  id: string
  title: string
  subject: string
  level: string
  keywords: string[]
  chapter_id?: string | null
  created_at: string
}

export interface CourseResponse {
  id: string
  title: string
  subject: string
  level: string
  keywords: string[]
  chunk_count: number
  created_at: string
}

export interface Chapter {
  id: string
  user_id: string
  title: string
  subject: string
  level: string
  created_at: string
  courses?: CourseListItem[]
}

export type UploadStatus = 'idle' | 'ocr' | 'embedding' | 'done' | 'error'

export interface CorrectionResponse {
  session_id: string
  exercise_statement: string
  subject: string
  level: string
  exercise_type: string
  specialist_used: string
  correction: string
  sources_used: string[]
  chunks_found: number
  evaluation_score: number
  rag_iterations: number
}

export interface UploadJobResponse {
  job_id: string
  status: 'queued' | 'processing' | 'done' | 'error'
  course?: CourseResponse
  error?: string
}

export interface CorrectParams {
  file: File
  subject?: string
  studentAnswer?: string
}

// SSE event types
export type SSEPhase = 'ocr' | 'rag' | 'specialist' | 'evaluating'

export interface SSEStartEvent {
  type: 'start'
  session_id: string
}

export interface SSEPhaseEvent {
  type: 'phase'
  phase: SSEPhase
  status: 'running' | 'done'
  subject?: string
  exercise_type?: string
  chunks_found?: number
  specialist?: string
  level?: string
}

export interface SSETokenEvent {
  type: 'token'
  text: string
}

export interface CourseSource {
  title: string
  subject: string
  course_id: string
}

export interface SSEDoneEvent {
  type: 'done'
  session_id: string
  sources: CourseSource[]
  evaluation_score: number
  chunks_found?: number
  student_attempted?: boolean
}

export interface SSEErrorEvent {
  type: 'error'
  code: string
  message: string
}

export type SSEEvent =
  | SSEStartEvent
  | SSEPhaseEvent
  | SSETokenEvent
  | SSEDoneEvent
  | SSEErrorEvent

export type CorrectionPhase =
  | 'idle'
  | 'ocr'
  | 'rag'
  | 'specialist'
  | 'evaluating'
  | 'done'
  | 'error'

export interface HistoryEntry {
  sessionId: string
  date: string
  subject: string
  level: string
  exerciseStatement: string
  correction: string
  sources: string[]
  evaluationScore: number
  feedback: 1 | -1 | null
}

export const SUBJECTS = [
  'Mathématiques',
  'Français',
  'Physique-Chimie',
  'SVT',
  'Histoire-Géographie',
  'Anglais',
  'Philosophie',
] as const

export type Subject = (typeof SUBJECTS)[number]

export const LEVELS = [
  '6ème',
  '5ème',
  '4ème',
  '3ème',
  '2nde',
  '1ère',
  'Terminale',
] as const

export type Level = (typeof LEVELS)[number]

export const SUBJECT_COLORS: Record<string, string> = {
  Mathématiques: 'bg-blue-100 text-blue-700',
  Français: 'bg-purple-100 text-purple-700',
  'Physique-Chimie': 'bg-orange-100 text-orange-700',
  SVT: 'bg-green-100 text-green-700',
  'Histoire-Géographie': 'bg-amber-100 text-amber-700',
  Anglais: 'bg-cyan-100 text-cyan-700',
  Philosophie: 'bg-rose-100 text-rose-700',
}
