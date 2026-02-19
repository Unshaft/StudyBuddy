'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ExerciseCapture } from '@/components/exercice/exercise-capture'
import { CorrectionStream } from '@/components/exercice/correction-stream'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useCorrectionStream } from '@/hooks/useCorrectionStream'
import { useAuthStore } from '@/store/auth.store'
import { useHistoryStore } from '@/store/history.store'
import { useUser } from '@/hooks/useUser'
import { useEffect } from 'react'

export default function ExercicePage() {
  useUser()
  const user = useAuthStore((s) => s.user)
  const addEntry = useHistoryStore((s) => s.addEntry)

  const { state, startCorrection, reset } = useCorrectionStream()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

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

  // Save to history when done
  useEffect(() => {
    if (state.phase === 'done' && state.sessionId && state.tokens) {
      addEntry({
        sessionId: state.sessionId,
        date: new Date().toISOString(),
        subject: state.subject ?? 'Inconnu',
        level: state.level ?? '',
        exerciseStatement: '',
        correction: state.tokens,
        sources: state.sources,
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
          />
        )}

        {state.phase === 'done' && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full h-12 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Nouvel exercice
            </Button>
          </div>
        )}
      </PageWrapper>
    </>
  )
}
