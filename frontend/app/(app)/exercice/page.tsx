'use client'

import { useState, useRef, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ExerciseCapture } from '@/components/exercice/exercise-capture'
import { CorrectionStream, BotBubble, UserBubble } from '@/components/exercice/correction-stream'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RotateCcw, Send } from 'lucide-react'
import { Bot } from 'lucide-react'
import { useCorrectionStream } from '@/hooks/useCorrectionStream'
import { useFollowupStream } from '@/hooks/useFollowupStream'
import { useAuthStore } from '@/store/auth.store'
import { useHistoryStore } from '@/store/history.store'

export default function ExercicePage() {
  const user = useAuthStore((s) => s.user)
  const addEntry = useHistoryStore((s) => s.addEntry)

  const { state, startCorrection, reset } = useCorrectionStream()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  // Human in the loop
  const [followupOpen, setFollowupOpen] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const followup = useFollowupStream({
    userId: user?.id ?? null,
    routedSubject: state.specialist,
    level: state.level,
  })

  const isProcessing =
    state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'error'
  const hasStarted = state.phase !== 'idle'

  function handleSelect(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setFollowupOpen(false)
    setUnderstood(false)
    setInputValue('')
    followup.reset()
    reset()
  }

  async function handleStart() {
    if (!file || !user) return
    await startCorrection({
      file,
      userId: user.id,
      subject: selectedSubject ?? undefined,
    })
  }

  function handleFollowupChoice(didUnderstand: boolean) {
    if (didUnderstand) {
      setUnderstood(true)
    } else {
      setFollowupOpen(true)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function handleSend() {
    const msg = inputValue.trim()
    if (!msg || followup.isLoading) return
    setInputValue('')
    await followup.sendMessage(msg)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [followup.messages, understood])

  // Sauvegarde dans l'historique
  useEffect(() => {
    if (state.phase === 'done' && state.sessionId && state.tokens) {
      addEntry({
        sessionId: state.sessionId,
        date: new Date().toISOString(),
        subject: state.subject ?? 'Inconnu',
        level: state.level ?? '',
        exerciseStatement: '',
        correction: state.tokens,
        sources: state.sources.map((s) => `${s.title} (${s.subject})`),
        evaluationScore: state.evaluationScore,
        feedback: null,
      })
    }
  }, [state.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Header
        title="Corriger un exercice"
        subtitle="Prends ton énoncé en photo"
        right={
          hasStarted ? (
            <button
              type="button"
              onClick={handleReset}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
              aria-label="Recommencer"
            >
              <RotateCcw className="w-5 h-5 text-slate-600" strokeWidth={2} />
            </button>
          ) : null
        }
      />

      <PageWrapper>
        {!hasStarted ? (
          <ExerciseCapture
            preview={preview}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            onSelect={handleSelect}
            onReset={handleReset}
            onStart={handleStart}
            loading={isProcessing}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Correction principale */}
            <CorrectionStream
              phase={state.phase}
              tokens={state.tokens}
              subject={state.subject}
              level={state.level}
              specialist={state.specialist}
              sources={state.sources}
              evaluationScore={state.evaluationScore}
              sessionId={state.sessionId}
              error={state.error}
              onFollowup={handleFollowupChoice}
              followupStarted={followupOpen || understood}
            />

            {/* ── "J'ai compris" → message de clôture ── */}
            {understood && (
              <div className="flex flex-col gap-3 mt-1">
                <UserBubble content="J'ai compris ✓" />
                <BotBubble content="Super ! Bon courage pour la suite. N'hésite pas à revenir si tu as d'autres exercices à corriger." />
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full h-12 gap-2 mt-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  Nouvel exercice
                </Button>
              </div>
            )}

            {/* ── Conversation de suivi ── */}
            {followupOpen && (
              <div className="flex flex-col gap-3 mt-1">
                {followup.messages.map((msg, i) =>
                  msg.role === 'user' ? (
                    <UserBubble key={i} content={msg.content} />
                  ) : msg.content ? (
                    <BotBubble
                      key={i}
                      content={msg.content}
                      isStreaming={followup.isLoading && i === followup.messages.length - 1}
                    />
                  ) : (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-indigo-200">
                        <Bot className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1 bg-white border border-slate-100 rounded-xl rounded-tl-none px-4 py-3 shadow-sm space-y-2">
                        <Skeleton className="h-3.5 w-full rounded" />
                        <Skeleton className="h-3.5 w-4/5 rounded" />
                      </div>
                    </div>
                  )
                )}

                {/* Zone de saisie */}
                <div className="flex gap-2 items-end bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pose ta question..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none px-2 py-1.5 max-h-28 leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || followup.isLoading}
                    aria-label="Envoyer"
                    className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl transition-colors duration-150 cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>

                {!followup.isLoading && followup.messages.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="w-full h-12 gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Nouvel exercice
                  </Button>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </PageWrapper>
    </>
  )
}
