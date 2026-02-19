'use client'

import { useState, useCallback, useRef } from 'react'
import { getFollowupStreamUrl, type FollowupMessage } from '@/lib/api'

export type { FollowupMessage }

export function useFollowupStream(params: {
  userId: string | null
  routedSubject: string | null
  level: string | null
}) {
  const [messages, setMessages] = useState<FollowupMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!params.userId || !params.routedSubject || !params.level) return

      // Historique avant la nouvelle question
      const historyBeforeNew = [...messages]

      // Ajouter le message utilisateur + placeholder assistant
      setMessages([
        ...historyBeforeNew,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '' },
      ])
      setIsLoading(true)

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const { url, formData } = getFollowupStreamUrl({
          userId: params.userId,
          routedSubject: params.routedSubject,
          level: params.level,
          conversationHistory: historyBeforeNew,
          message: userMessage,
        })

        const res = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

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
              const event = JSON.parse(raw)
              if (event.type === 'token') {
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.text,
                    }
                  }
                  return updated
                })
              }
            } catch {
              // malformed JSON — ignore
            }
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant' && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: "Une erreur s'est produite. Réessaie.",
            }
          }
          return updated
        })
      } finally {
        setIsLoading(false)
      }
    },
    [messages, params]
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setIsLoading(false)
  }, [])

  return { messages, isLoading, sendMessage, reset }
}
