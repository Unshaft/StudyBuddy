'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, Upload, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/shared/spinner'
import { uploadCourse, getUploadJob } from '@/lib/api'
import { useCoursStore } from '@/store/cours.store'

type Step = 'select' | 'preview' | 'uploading' | 'done' | 'error'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
const MAX_MB = 10
const POLL_INTERVAL_MS = 2000

export function CourseUploader() {
  const router = useRouter()
  const { setCourses, courses } = useCoursStore()

  const [step, setStep] = useState<Step>('select')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progressLabel, setProgressLabel] = useState('Chargement...')
  const [progressValue, setProgressValue] = useState(10)
  const [error, setError] = useState<string | null>(null)

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  function handleFileSelect(f: File) {
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`L'image est trop lourde (max ${MAX_MB} Mo).`)
      setStep('error')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStep('preview')
    setError(null)
  }

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const job = await getUploadJob(jobId)

      if (job.status === 'done' && job.course) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
        setCourses([{ ...job.course, keywords: job.course.keywords }, ...courses])
        setProgressValue(100)
        setStep('done')
        return
      }

      if (job.status === 'error') {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
        setError(job.error ?? "Une erreur s'est produite. Réessaie avec une photo plus claire.")
        setStep('error')
        return
      }

      // Label progressif basé sur le temps écoulé
      const elapsed = Date.now() - startTimeRef.current
      if (elapsed < 5000) {
        setProgressLabel('Lecture du cours...')
        setProgressValue(30)
      } else if (elapsed < 12000) {
        setProgressLabel('Vectorisation en cours...')
        setProgressValue(65)
      } else {
        setProgressLabel('Finalisation...')
        setProgressValue(85)
      }

      pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
    } catch {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
      setError('Erreur réseau. Vérifie ta connexion et réessaie.')
      setStep('error')
    }
  }, [courses, setCourses])

  async function handleUpload() {
    if (!file) return
    setStep('uploading')
    setProgressLabel('Envoi en cours...')
    setProgressValue(10)
    startTimeRef.current = Date.now()

    try {
      const job = await uploadCourse(file)
      setProgressLabel('Lecture du cours...')
      setProgressValue(25)
      pollTimerRef.current = setTimeout(() => pollJob(job.job_id), POLL_INTERVAL_MS)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur s'est produite. Réessaie avec une photo plus claire."
      )
      setStep('error')
    }
  }

  function reset() {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    setStep('select')
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
    setProgressValue(10)
  }

  // ── Select ────────────────────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="flex flex-col gap-4">
        <input
          type="file"
          accept={ACCEPT}
          aria-label="Choisir une image depuis la galerie"
          className="hidden"
          id="file-gallery"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileSelect(f)
            e.target.value = ''
          }}
        />
        <input
          type="file"
          accept="image/*"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore capture is a valid HTML attribute for mobile inputs
          capture="environment"
          aria-label="Prendre une photo avec l'appareil photo"
          className="hidden"
          id="file-camera"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileSelect(f)
            e.target.value = ''
          }}
        />

        <button
          type="button"
          onClick={() => document.getElementById('file-camera')?.click()}
          className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Camera className="w-6 h-6 text-indigo-600" strokeWidth={1.8} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Prendre en photo</p>
            <p className="text-xs text-slate-500 mt-0.5">Utilise la caméra de ton téléphone</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => document.getElementById('file-gallery')?.click()}
          className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer text-left"
        >
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6 text-slate-500" strokeWidth={1.8} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Choisir depuis la galerie</p>
            <p className="text-xs text-slate-500 mt-0.5">JPEG, PNG, WEBP — max 10 Mo</p>
          </div>
        </button>
      </div>
    )
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  if (step === 'preview' && preview) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
          <Image
            src={preview}
            alt="Aperçu du cours"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 480px"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={reset} className="flex-1 h-12 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Reprendre
          </Button>
          <Button
            onClick={handleUpload}
            className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Envoyer
          </Button>
        </div>
      </div>
    )
  }

  // ── Uploading ─────────────────────────────────────────────────────────────
  if (step === 'uploading') {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <Spinner className="w-7 h-7 text-indigo-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-900">{progressLabel}</p>
          <p className="text-sm text-slate-500 mt-1">Ça peut prendre quelques secondes</p>
        </div>
        <Progress value={progressValue} className="w-full h-1.5" />
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-900">Cours ajouté avec succès !</p>
          <p className="text-sm text-slate-500 mt-1">Ton cours est prêt pour la correction</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="outline" onClick={reset} className="flex-1 h-12">
            Ajouter un autre
          </Button>
          <Button
            onClick={() => router.push('/cours')}
            className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Voir mes cours
          </Button>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-900">Oups, une erreur s&apos;est produite</p>
        <p className="text-sm text-slate-500 mt-1">
          {error ?? 'Essaie avec une photo plus lumineuse.'}
        </p>
      </div>
      <Button onClick={reset} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white">
        Réessayer
      </Button>
    </div>
  )
}
