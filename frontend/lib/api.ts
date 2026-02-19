import type {
  CourseResponse,
  CourseListItem,
  CorrectionResponse,
  CorrectParams,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function uploadCourse(
  file: File,
  userId: string
): Promise<CourseResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('user_id', userId)
  const res = await fetch(`${API_URL}/api/cours/upload`, {
    method: 'POST',
    body: form,
  })
  return handleResponse<CourseResponse>(res)
}

export interface CourseDetail {
  id: string
  title: string
  subject: string
  level: string
  keywords: string[]
  raw_content: string
  created_at: string
}

export async function getCourse(courseId: string, userId: string): Promise<CourseDetail> {
  const res = await fetch(
    `${API_URL}/api/cours/${courseId}?user_id=${encodeURIComponent(userId)}`
  )
  return handleResponse<CourseDetail>(res)
}

export async function listCourses(userId: string): Promise<CourseListItem[]> {
  const res = await fetch(
    `${API_URL}/api/cours/?user_id=${encodeURIComponent(userId)}`
  )
  return handleResponse<CourseListItem[]>(res)
}

export async function deleteCourse(
  courseId: string,
  userId: string
): Promise<void> {
  const res = await fetch(
    `${API_URL}/api/cours/${courseId}?user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
}

export async function correctExercise(
  params: CorrectParams
): Promise<CorrectionResponse> {
  const form = new FormData()
  form.append('file', params.file)
  form.append('user_id', params.userId)
  if (params.subject) form.append('subject', params.subject)
  if (params.studentAnswer) form.append('student_answer', params.studentAnswer)
  const res = await fetch(`${API_URL}/api/exercice/correct`, {
    method: 'POST',
    body: form,
  })
  return handleResponse<CorrectionResponse>(res)
}

export function getCorrectStreamUrl(params: CorrectParams): {
  url: string
  formData: FormData
} {
  const form = new FormData()
  form.append('file', params.file)
  form.append('user_id', params.userId)
  if (params.subject) form.append('subject', params.subject)
  if (params.studentAnswer) form.append('student_answer', params.studentAnswer)
  return {
    url: `${API_URL}/api/exercice/correct/stream`,
    formData: form,
  }
}

export interface FollowupMessage {
  role: 'user' | 'assistant'
  content: string
}

export function getFollowupStreamUrl(params: {
  userId: string
  routedSubject: string
  level: string
  conversationHistory: FollowupMessage[]
  message: string
}): { url: string; formData: FormData } {
  const form = new FormData()
  form.append('user_id', params.userId)
  form.append('routed_subject', params.routedSubject)
  form.append('level', params.level)
  form.append('conversation_history', JSON.stringify(params.conversationHistory))
  form.append('message', params.message)
  return {
    url: `${API_URL}/api/exercice/followup/stream`,
    formData: form,
  }
}

export async function submitFeedback(
  sessionId: string,
  userId: string,
  rating: 1 | -1,
  comment?: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, user_id: userId, rating, comment }),
  })
  if (!res.ok) {
    // Silently fail — feedback is best-effort
    console.warn('Feedback submission failed:', res.status)
  }
}
