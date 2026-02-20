'use client'

import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { SubjectBadge } from '@/components/shared/subject-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useHistory } from '@/hooks/useHistory'
import { useUser } from '@/hooks/useUser'

export default function HistoriquePage() {
  useUser()
  const { entries, loaded } = useHistory()

  return (
    <>
      <Header
        title="Historique"
        subtitle={loaded ? `${entries.length} correction${entries.length > 1 ? 's' : ''}` : ''}
      />
      <PageWrapper>
        {!loaded ? (
          <div className="space-y-3" role="region" aria-busy="true" aria-label="Chargement de l'historique">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
                <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                  <Skeleton className="h-4 w-1/3 rounded-lg" />
                  <Skeleton className={cn('h-3 rounded-lg', i % 2 === 0 ? 'w-2/3' : 'w-1/2')} />
                  <Skeleton className="h-3 w-1/4 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-slate-600 font-medium">Aucune correction pour l&apos;instant</p>
            <p className="text-slate-400 text-sm mt-1">
              Tes corrections apparaîtront ici
            </p>
            <Link
              href="/exercice"
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 h-11 rounded-xl transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Corriger un exercice
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const date = new Date(entry.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <Link
                  key={entry.sessionId}
                  href={`/exercice/${entry.sessionId}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  {/* Score badge */}
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
                      entry.evaluationScore >= 0.7
                        ? 'bg-emerald-50 text-emerald-600'
                        : entry.evaluationScore >= 0.4
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-red-50 text-red-600'
                    )}
                    aria-label={`Score : ${Math.round(entry.evaluationScore * 100)}%`}
                  >
                    {Math.round(entry.evaluationScore * 100)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SubjectBadge subject={entry.subject} />
                      {entry.level && (
                        <span className="text-xs text-slate-400">{entry.level}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {entry.correction}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{date}</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
