'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, RotateCcw, Type, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SUBJECTS } from '@/types'

interface ExerciseCaptureProps {
  preview: string | null
  selectedSubject: string | null
  onSubjectChange: (subject: string | null) => void
  onSelect: (file: File) => void
  onReset: () => void
  onStart: () => void
  loading?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
const MAX_SIZE = 10 * 1024 * 1024

export function ExerciseCapture({
  preview,
  selectedSubject,
  onSubjectChange,
  onSelect,
  onReset,
  onStart,
  loading,
}: ExerciseCaptureProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [sizeError, setSizeError] = useState(false)

  function handleFile(f: File) {
    if (f.size > MAX_SIZE) {
      setSizeError(true)
      return
    }
    setSizeError(false)
    onSelect(f)
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        aria-label="Choisir une image depuis la galerie"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore capture is a valid HTML attribute for mobile file inputs
        capture="environment"
        aria-label="Prendre une photo avec l'appareil photo"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {/* Erreur taille fichier */}
      {sizeError && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          Image trop lourde (max 10 Mo). Essaie avec une photo moins grande.
        </div>
      )}

      {/* Viewfinder / Preview zone */}
      <div
        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group bg-slate-900"
        onClick={() => !preview && cameraRef.current?.click()}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Énoncé de l'exercice"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 480px"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReset() }}
              className="absolute top-3 right-3 w-11 h-11 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
              aria-label="Reprendre la photo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {/* Corner brackets — viewfinder style */}
            <ViewfinderCorners />

            {/* Guidance text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-2.5">
                <p className="text-white text-sm font-medium text-center">
                  Pointe vers l&apos;énoncé et appuie pour capturer
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subject selector — horizontal scroll tabs */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
          Matière (optionnel)
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <SubjectTab
            label="Auto"
            active={selectedSubject === null}
            onClick={() => onSubjectChange(null)}
          />
          {SUBJECTS.map((s) => (
            <SubjectTab
              key={s}
              label={s}
              active={selectedSubject === s}
              onClick={() => onSubjectChange(s)}
            />
          ))}
        </div>
      </div>

      {/* Action row */}
      {preview ? (
        <Button
          onClick={onStart}
          disabled={loading}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base"
        >
          {loading ? 'Analyse en cours...' : 'Corriger cet exercice'}
        </Button>
      ) : (
        <div className="flex items-center justify-between">
          {/* Gallery */}
          <button
            type="button"
            onClick={() => { setSizeError(false); fileRef.current?.click() }}
            className="flex flex-col items-center gap-1 w-14 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:rounded-lg"
            aria-label="Depuis la galerie"
          >
            <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors duration-150">
              <ImageIcon className="w-5 h-5 text-slate-600" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Galerie</span>
          </button>

          {/* Main shutter button */}
          <button
            type="button"
            onClick={() => { setSizeError(false); cameraRef.current?.click() }}
            className="relative flex items-center justify-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:rounded-full"
            aria-label="Prendre en photo"
          >
            {/* Outer ring */}
            <div className="w-16 h-16 rounded-full border-[3px] border-indigo-500 flex items-center justify-center">
              {/* Inner circle */}
              <div className="w-12 h-12 bg-indigo-600 rounded-full group-active:scale-90 transition-transform duration-100 shadow-lg shadow-indigo-500/40" />
            </div>
          </button>

          {/* Type manually (placeholder — désactivé) */}
          <button
            type="button"
            className="flex flex-col items-center gap-1 w-14 cursor-not-allowed opacity-40"
            aria-label="Saisie manuelle (bientôt disponible)"
            aria-disabled="true"
            tabIndex={-1}
          >
            <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center">
              <Type className="w-5 h-5 text-slate-600" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Texte</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Viewfinder corner brackets
function ViewfinderCorners() {
  const SIZE = 24
  const THICKNESS = 3
  const COLOR = '#6366F1'

  const cornerStyle = (top: boolean, left: boolean): React.CSSProperties => ({
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    ...(top ? { top: '20%' } : { bottom: '20%' }),
    ...(left ? { left: '12%' } : { right: '12%' }),
    borderColor: COLOR,
    borderStyle: 'solid',
    borderWidth: 0,
    ...(top && left && {
      borderTopWidth: THICKNESS,
      borderLeftWidth: THICKNESS,
      borderTopLeftRadius: 6,
    }),
    ...(top && !left && {
      borderTopWidth: THICKNESS,
      borderRightWidth: THICKNESS,
      borderTopRightRadius: 6,
    }),
    ...(!top && left && {
      borderBottomWidth: THICKNESS,
      borderLeftWidth: THICKNESS,
      borderBottomLeftRadius: 6,
    }),
    ...(!top && !left && {
      borderBottomWidth: THICKNESS,
      borderRightWidth: THICKNESS,
      borderBottomRightRadius: 6,
    }),
  })

  return (
    <>
      <div style={cornerStyle(true, true)} />
      <div style={cornerStyle(true, false)} />
      <div style={cornerStyle(false, true)} />
      <div style={cornerStyle(false, false)} />
    </>
  )
}

// Subject tab pill
function SubjectTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
        active
          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
          : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
