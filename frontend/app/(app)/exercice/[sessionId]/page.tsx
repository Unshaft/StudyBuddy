'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { MathRenderer } from '@/components/shared/math-renderer'
import { SourceCard } from '@/components/exercice/source-card'
import { FeedbackBar } from '@/components/exercice/feedback-bar'
import { SubjectBadge } from '@/components/shared/subject-badge'
import { useHistory } from '@/hooks/useHistory'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default function SessionPage({ params }: Props) {
  const { sessionId } = use(params)
  const { entries } = useHistory()
  const entry = entries.find((e) => e.sessionId === sessionId)

  if (!entry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-slate-600 font-medium">Session introuvable</p>
        <p className="text-slate-400 text-sm mt-1">Cette correction n&apos;est plus disponible</p>
        <Link href="/exercice" className="mt-4 text-indigo-600 text-sm font-medium">
          Retour
        </Link>
      </div>
    )
  }

  const date = new Date(entry.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white border-b border-slate-100">
        <Link
          href="/historique"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" strokeWidth={2} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <SubjectBadge subject={entry.subject} />
            {entry.level && (
              <span className="text-xs text-slate-500">{entry.level}</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{date}</p>
        </div>
      </header>

      <PageWrapper>
        <div className="space-y-4">
          {/* Correction */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <MathRenderer
              content={entry.correction}
              className="text-slate-800 leading-relaxed text-sm"
            />
          </div>

          {/* Sources */}
          {entry.sources.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
                Extraits de cours utilisés
              </p>
              <div className="space-y-2">
                {entry.sources.map((src, i) => (
                  <SourceCard key={i} source={src} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Score */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                entry.evaluationScore >= 0.7
                  ? 'bg-emerald-50 text-emerald-600'
                  : entry.evaluationScore >= 0.4
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {Math.round(entry.evaluationScore * 100)}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Score de qualité</p>
              <p className="text-xs text-slate-500">
                {entry.evaluationScore >= 0.7
                  ? 'Correction complète'
                  : 'Correction acceptable'}
              </p>
            </div>
          </div>

          {/* Feedback */}
          <FeedbackBar sessionId={sessionId} />
        </div>
      </PageWrapper>
    </>
  )
}
