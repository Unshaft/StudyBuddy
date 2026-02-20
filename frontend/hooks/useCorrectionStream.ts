'use client'

import { useState, useCallback, useRef } from 'react'
import { getCorrectStreamUrl } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { CorrectionPhase, SSEEvent, CorrectParams, CourseSource } from '@/types'

export interface CorrectionState {
  phase: CorrectionPhase
  tokens: string
  subject: string | null
  level: string | null
  specialist: string | null
  sources: CourseSource[]
  chunksFound: number
  evaluationScore: number
  sessionId: string | null
  studentAttempted: boolean
  error: string | null
}

const INITIAL: CorrectionState = {
  phase: 'idle',
  tokens: '',
  subject: null,
  level: null,
  specialist: null,
  sources: [],
  chunksFound: 0,
  evaluationScore: 0,
  sessionId: null,
  studentAttempted: false,
  error: null,
}

export function useCorrectionStream() {
  const [state, setState] = useState<CorrectionState>(INITIAL)
  const abortRef = useRef<AbortController | null>(null)
  const session = useAuthStore((s) => s.session)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL)
  }, [])

  const startCorrection = useCallback(async (params: CorrectParams) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ ...INITIAL, phase: 'ocr' })

    const { url, formData } = getCorrectStreamUrl(params)

    try {
      const authHeaders: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}

      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => `HTTP ${res.status}`)
        setState((s) => ({ ...s, phase: 'error', error: text }))
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setState((s) => ({ ...s, phase: 'error', error: 'Pas de réponse du serveur.' }))
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue

          try {
            const event = JSON.parse(raw) as SSEEvent

            switch (event.type) {
              case 'start':
                setState((s) => ({ ...s, sessionId: event.session_id }))
                break

              case 'phase':
                if (event.status === 'running') {
                  setState((s) => ({
                    ...s,
                    phase: event.phase,
                    specialist: event.specialist ?? s.specialist,
                    level: event.level ?? s.level,
                  }))
                } else {
                  // status === 'done'
                  if (event.phase === 'ocr') {
                    setState((s) => ({ ...s, subject: event.subject ?? s.subject }))
                  } else if (event.phase === 'rag') {
                    setState((s) => ({ ...s, chunksFound: event.chunks_found ?? s.chunksFound }))
                  }
                }
                break

              case 'token':
                setState((s) => ({ ...s, tokens: s.tokens + event.text }))
                break

              case 'done':
                setState((s) => ({
                  ...s,
                  phase: 'done',
                  sessionId: event.session_id,
                  sources: event.sources,
                  evaluationScore: event.evaluation_score,
                  chunksFound: event.chunks_found ?? s.chunksFound,
                  studentAttempted: event.student_attempted ?? false,
                }))
                break

              case 'error':
                setState((s) => ({
                  ...s,
                  phase: 'error',
                  error: event.message,
                }))
                break
            }
          } catch {
            // malformed JSON line — ignore
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setState((s) => ({
        ...s,
        phase: 'error',
        error: "Une erreur s'est produite. Réessaie.",
      }))
    }
  }, [])

  return { state, startCorrection, reset }
}
