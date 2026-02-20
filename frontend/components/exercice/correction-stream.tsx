'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bot, Search, BookOpen, Sparkles, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { MathRenderer } from '@/components/shared/math-renderer'
import { FeedbackBar } from './feedback-bar'
import { SubjectBadge } from '@/components/shared/subject-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { CorrectionPhase, CourseSource } from '@/types'

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

export interface CorrectionStreamProps {
  phase: CorrectionPhase
  tokens: string
  subject: string | null
  level: string | null
  specialist: string | null
  sources: CourseSource[]
  evaluationScore: number
  sessionId: string | null
  error: string | null
  /** Appelé quand l'élève clique "J'ai compris" ou "J'ai une question" */
  onFollowup?: (understood: boolean) => void
  /** True si la conversation de suivi a déjà commencé */
  followupStarted?: boolean
}

/**
 * Découpe le texte de correction en bulles logiques.
 * Priorité : couper sur les marqueurs de section (Étape X, À retenir, ##...).
 * Fallback : couper sur les doubles sauts de ligne.
 */
function splitIntoBubbles(text: string): string[] {
  // Coupe juste avant un marqueur de section (début de ligne)
  const sectionPattern = /(?=\n(?:\*\*\s*(?:Étape\s+\d+|À retenir|Remarque|Méthode|Correction|Synthèse)|#{1,3}\s))/gi
  const parts = text.split(sectionPattern).map((p) => p.trim()).filter((p) => p.length > 0)
  if (parts.length > 1) return parts

  // Fallback : double saut de ligne
  return text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0)
}

/** Bulle de message IA */
export function BotBubble({
  content,
  isStreaming = false,
}: {
  content: string
  isStreaming?: boolean
}) {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-indigo-200">
        <Bot className="w-4 h-4 text-white" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
        <div className="prose prose-sm max-w-none">
          <MathRenderer
            content={content}
            className="text-slate-800 leading-relaxed text-sm"
          />
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}

/** Bulle de message utilisateur */
export function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-indigo-600 text-white rounded-xl rounded-tr-none px-4 py-3 shadow-sm">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  )
}

export function CorrectionStream({
  phase,
  tokens,
  subject,
  level,
  specialist,
  sources,
  sessionId,
  error,
  onFollowup,
  followupStarted = false,
}: CorrectionStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentPhaseIndex = PHASE_ORDER.indexOf(phase)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [tokens, phase])

  // ── Error ──────────────────────────────────────────────────────────────────
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

  const bubbles = phase === 'done' ? splitIntoBubbles(tokens) : null

  return (
    <div className="flex flex-col gap-3">

      {/* ── Phase tracker ─────────────────────────────────────────────────── */}
      {phase !== 'done' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          {(subject || level) && (
            <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-slate-50">
              {subject && <SubjectBadge subject={subject} />}
              {level && <span className="text-xs text-slate-400">{level}</span>}
              {specialist && (
                <span className="text-[10px] text-slate-400 ml-auto">Agent {specialist}</span>
              )}
            </div>
          )}
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
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Streaming ─────────────────────────────────────────────────────── */}
      {phase === 'specialist' && (
        <div className="flex flex-col gap-2">
          {tokens ? (
            <BotBubble content={tokens} isStreaming />
          ) : (
            <div className="flex gap-2.5 items-start">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-indigo-200">
                <Bot className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-xl rounded-tl-none px-4 py-3 shadow-sm space-y-2">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-5/6 rounded" />
                <Skeleton className="h-3.5 w-4/5 rounded" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Done : bulles + sources + feedback + question ─────────────────── */}
      {phase === 'done' && bubbles && (
        <>
          {(subject || level) && (
            <div className="flex items-center gap-1.5 px-1">
              {subject && <SubjectBadge subject={subject} />}
              {level && <span className="text-xs text-slate-400">{level}</span>}
              {specialist && (
                <span className="text-[10px] text-slate-400 ml-auto">Agent {specialist}</span>
              )}
            </div>
          )}

          {/* Bulles de correction */}
          <div className="flex flex-col gap-2">
            {bubbles.map((bubble, i) => (
              <BotBubble key={i} content={bubble} />
            ))}
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div className="mt-1 space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Basé sur tes cours
              </p>
              {sources.map((src) => (
                <InlineSourceCard key={src.course_id} source={src} />
              ))}
            </div>
          )}

          {/* Feedback 👍/👎 */}
          {sessionId && <FeedbackBar sessionId={sessionId} />}

          {/* Question de clôture — human in the loop */}
          {!followupStarted && onFollowup && (
            <ClosingQuestion onFollowup={onFollowup} />
          )}
        </>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

// ── Closing question ──────────────────────────────────────────────────────────

function ClosingQuestion({ onFollowup }: { onFollowup: (understood: boolean) => void }) {
  return (
    <div className="flex flex-col gap-3 mt-1">
      <BotBubble content="Est-ce que cette correction t'a aidé ? Tu as des questions sur une étape ?" />
      <div className="flex gap-2 pl-10">
        <button
          type="button"
          onClick={() => onFollowup(true)}
          className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm rounded-xl border border-emerald-200 transition-colors duration-150 cursor-pointer"
        >
          ✓ J&apos;ai compris
        </button>
        <button
          type="button"
          onClick={() => onFollowup(false)}
          className="flex-1 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm rounded-xl border border-indigo-200 transition-colors duration-150 cursor-pointer"
        >
          J&apos;ai une question
        </button>
      </div>
    </div>
  )
}

// ── Source card ───────────────────────────────────────────────────────────────

function InlineSourceCard({ source }: { source: CourseSource }) {
  return (
    <Link
      href={`/cours/${source.course_id}`}
      className="flex items-center gap-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 hover:bg-indigo-50 transition-colors duration-150"
    >
      <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
          Cours utilisé
        </p>
        <p className="text-xs font-medium text-slate-800 truncate">{source.title}</p>
      </div>
      <SubjectBadge subject={source.subject} />
    </Link>
  )
}
