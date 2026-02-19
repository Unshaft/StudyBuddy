'use client'

import { useEffect, useRef } from 'react'
import { Bot, Search, BookOpen, Sparkles, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { MathRenderer } from '@/components/shared/math-renderer'
import { FeedbackBar } from './feedback-bar'
import { SubjectBadge } from '@/components/shared/subject-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { CorrectionPhase } from '@/types'

interface PhaseStep {
  id: CorrectionPhase
  label: string
  icon: React.ElementType
}

const PHASES: PhaseStep[] = [
  { id: 'ocr', label: "Lecture de l'énoncé", icon: Search },
  { id: 'rag', label: 'Recherche dans tes cours', icon: BookOpen },
  { id: 'specialist', label: 'Correction guidée', icon: Sparkles },
  { id: 'evaluating', label: 'Évaluation', icon: CheckCircle },
]

const PHASE_ORDER: CorrectionPhase[] = ['ocr', 'rag', 'specialist', 'evaluating', 'done']

interface CorrectionStreamProps {
  phase: CorrectionPhase
  tokens: string
  subject: string | null
  level: string | null
  specialist: string | null
  sources: string[]
  evaluationScore: number
  sessionId: string | null
  error: string | null
}

export function CorrectionStream({
  phase,
  tokens,
  subject,
  level,
  specialist,
  sources,
  evaluationScore,
  sessionId,
  error,
}: CorrectionStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentPhaseIndex = PHASE_ORDER.indexOf(phase)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [tokens, phase])

  // Error state
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-500" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Une erreur s&apos;est produite</p>
          <p className="text-sm text-slate-500 mt-1">{error ?? 'Réessaie avec une photo plus claire.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Phase tracker — only while processing */}
      {phase !== 'done' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="space-y-2.5">
            {PHASES.map((step) => {
              const stepIndex = PHASE_ORDER.indexOf(step.id)
              const isDone = currentPhaseIndex > stepIndex
              const isActive = currentPhaseIndex === stepIndex
              const isPending = currentPhaseIndex < stepIndex

              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
                    isDone && 'bg-emerald-100',
                    isActive && 'bg-indigo-100',
                    isPending && 'bg-slate-50'
                  )}>
                    {isDone ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                    ) : (
                      <step.icon className={cn(
                        'w-3.5 h-3.5',
                        isActive && 'text-indigo-600 animate-pulse',
                        isPending && 'text-slate-300'
                      )} strokeWidth={1.8} />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm flex-1 transition-colors duration-200',
                    isDone && 'text-emerald-700 font-medium',
                    isActive && 'text-indigo-700 font-semibold',
                    isPending && 'text-slate-400'
                  )}>
                    {step.label}
                  </span>
                  {isActive && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((n) => (
                        <span
                          key={n}
                          className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${n * 150}ms` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI message bubble — shows during/after streaming */}
      {(tokens || phase === 'specialist') && (
        <div className="flex gap-2.5 items-start">
          {/* Bot avatar */}
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-indigo-200">
            <Bot className="w-4 h-4 text-white" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Subject + level chip */}
            {(subject || level || specialist) && (
              <div className="flex items-center gap-1.5 mb-2">
                {subject && <SubjectBadge subject={subject} />}
                {level && <span className="text-xs text-slate-400">{level}</span>}
                {specialist && (
                  <span className="text-[10px] text-slate-400 ml-auto">
                    Agent {specialist}
                  </span>
                )}
              </div>
            )}

            {/* Message bubble */}
            <div className="bg-white border border-slate-100 rounded-xl rounded-tl-none p-4 shadow-sm">
              {tokens ? (
                <div className="prose prose-sm max-w-none">
                  <MathRenderer
                    content={tokens}
                    className="text-slate-800 leading-relaxed text-sm"
                  />
                  {phase === 'specialist' && (
                    <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full rounded" />
                  <Skeleton className="h-3.5 w-5/6 rounded" />
                  <Skeleton className="h-3.5 w-4/5 rounded" />
                </div>
              )}
            </div>

            {/* Inline source cards — shown when done */}
            {phase === 'done' && sources.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Basé sur tes cours
                </p>
                {sources.map((src, i) => (
                  <InlineSourceCard key={i} source={src} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Done: score + feedback */}
      {phase === 'done' && sessionId && (
        <div className="flex flex-col gap-3 mt-1">
          {/* Score card */}
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3.5">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0',
              evaluationScore >= 0.7 ? 'bg-emerald-50 text-emerald-600'
              : evaluationScore >= 0.4 ? 'bg-amber-50 text-amber-600'
              : 'bg-red-50 text-red-600'
            )}>
              {Math.round(evaluationScore * 100)}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Score de qualité</p>
              <p className="text-xs text-slate-500">
                {evaluationScore >= 0.7
                  ? 'Correction complète et bien guidée'
                  : evaluationScore >= 0.4
                  ? 'Correction acceptable'
                  : 'Quelques points à revoir'}
              </p>
            </div>
          </div>

          <FeedbackBar sessionId={sessionId} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

// Inline source card (inspired by AI Guided Learning reference cards)
function InlineSourceCard({ source, index }: { source: string; index: number }) {
  return (
    <div className="flex items-start gap-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
      <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <FileText className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">
          Extrait {index + 1}
        </p>
        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
          {source}
        </p>
      </div>
    </div>
  )
}
