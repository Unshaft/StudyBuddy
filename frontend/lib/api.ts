import { createClient } from '@/lib/supabase'
import type {
  CourseListItem,
  CorrectionResponse,
  CorrectParams,
  UploadJobResponse,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Session expirée. Reconnecte-toi.')
  }
  return `Bearer ${session.access_token}`
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Cours ─────────────────────────────────────────────────────────────────────

/**
 * Lance un upload asynchrone. Retourne immédiatement {job_id, status:'queued'}.
 * Poll getUploadJob(job_id) toutes les 2s jusqu'à status='done' | 'error'.
 */
export async function uploadCourse(file: File): Promise<UploadJobResponse> {
  const form = new FormData()
  form.append('file', file)
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/cours/upload`, {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: form,
  })
  return handleResponse<UploadJobResponse>(res)
}

export async function getUploadJob(jobId: string): Promise<UploadJobResponse> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/cours/jobs/${jobId}`, {
    headers: { Authorization: authHeader },
  })
  return handleResponse<UploadJobResponse>(res)
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

export async function getCourse(courseId: string): Promise<CourseDetail> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/cours/${courseId}`, {
    headers: { Authorization: authHeader },
  })
  return handleResponse<CourseDetail>(res)
}

export async function listCourses(): Promise<CourseListItem[]> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/cours/`, {
    headers: { Authorization: authHeader },
  })
  return handleResponse<CourseListItem[]>(res)
}

export async function deleteCourse(courseId: string): Promise<void> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/cours/${courseId}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
}

// ── Exercice ──────────────────────────────────────────────────────────────────

export async function correctExercise(
  params: CorrectParams
): Promise<CorrectionResponse> {
  const form = new FormData()
  form.append('file', params.file)
  if (params.subject) form.append('subject', params.subject)
  if (params.studentAnswer) form.append('student_answer', params.studentAnswer)
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/exercice/correct`, {
    method: 'POST',
    headers: { Authorization: authHeader },
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
  if (params.subject) form.append('subject', params.subject)
  if (params.studentAnswer) form.append('student_answer', params.studentAnswer)
  return {
    url: `${API_URL}/api/exercice/correct/stream`,
    formData: form,
  }
}

// ── Followup ──────────────────────────────────────────────────────────────────

export interface FollowupMessage {
  role: 'user' | 'assistant'
  content: string
}

export function getFollowupStreamUrl(params: {
  routedSubject: string
  level: string
  conversationHistory: FollowupMessage[]
  message: string
}): { url: string; formData: FormData } {
  const form = new FormData()
  form.append('routed_subject', params.routedSubject)
  form.append('level', params.level)
  form.append('conversation_history', JSON.stringify(params.conversationHistory))
  form.append('message', params.message)
  return {
    url: `${API_URL}/api/exercice/followup/stream`,
    formData: form,
  }
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function submitFeedback(
  sessionId: string,
  rating: 1 | -1,
  comment?: string
): Promise<void> {
  try {
    const authHeader = await getAuthHeader()
    const res = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ session_id: sessionId, rating, comment }),
    })
    if (!res.ok) {
      console.warn('Feedback submission failed:', res.status)
    }
  } catch {
    // Silently fail — feedback is best-effort
  }
}
