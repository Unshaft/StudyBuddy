'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitFeedback } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useHistoryStore } from '@/store/history.store'

interface FeedbackBarProps {
  sessionId: string
}

export function FeedbackBar({ sessionId }: FeedbackBarProps) {
  const user = useAuthStore((s) => s.user)
  const updateFeedback = useHistoryStore((s) => s.updateFeedback)
  const [selected, setSelected] = useState<1 | -1 | null>(null)
  const [sent, setSent] = useState(false)

  async function handleFeedback(rating: 1 | -1) {
    if (sent) return
    setSelected(rating)
    setSent(true)
    updateFeedback(sessionId, rating)
    if (user) {
      await submitFeedback(sessionId, user.id, rating)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-4">
      <p className="text-sm text-slate-600 flex-1">
        {sent ? 'Merci pour ton retour !' : 'Cette correction t\'a été utile ?'}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleFeedback(1)}
          disabled={sent}
          aria-label="Utile"
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
            selected === 1
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600',
            sent && selected !== 1 && 'opacity-40'
          )}
        >
          <ThumbsUp className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          onClick={() => handleFeedback(-1)}
          disabled={sent}
          aria-label="Pas utile"
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer',
            selected === -1
              ? 'bg-red-500 text-white'
              : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500',
            sent && selected !== -1 && 'opacity-40'
          )}
        >
          <ThumbsDown className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
