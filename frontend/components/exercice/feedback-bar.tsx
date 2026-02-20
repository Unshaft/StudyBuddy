'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitFeedback } from '@/lib/api'
import { useHistoryStore } from '@/store/history.store'

interface FeedbackBarProps {
  sessionId: string
}

export function FeedbackBar({ sessionId }: FeedbackBarProps) {
  const updateFeedback = useHistoryStore((s) => s.updateFeedback)
  const [selected, setSelected] = useState<1 | -1 | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleFeedback(rating: 1 | -1) {
    if (sent || sending) return
    setSending(true)
    setSelected(rating)
    updateFeedback(sessionId, rating)
    await submitFeedback(sessionId, rating)
    setSending(false)
    setSent(true)
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-4">
      <p className="text-sm text-slate-600 flex-1">
        {sent ? 'Merci pour ton retour !' : "Cette correction t'a été utile ?"}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleFeedback(1)}
          disabled={sent || sending}
          aria-label="Marquer comme utile"
          className={cn(
            'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
            selected === 1
              ? 'bg-emerald-500 text-white scale-105'
              : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600',
            sent && selected !== 1 && 'opacity-30 cursor-not-allowed'
          )}
        >
          <ThumbsUp className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => handleFeedback(-1)}
          disabled={sent || sending}
          aria-label="Marquer comme pas utile"
          className={cn(
            'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2',
            selected === -1
              ? 'bg-red-500 text-white scale-105'
              : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500',
            sent && selected !== -1 && 'opacity-30 cursor-not-allowed'
          )}
        >
          <ThumbsDown className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
