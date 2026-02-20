'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, BookOpen, Calendar, Tag } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { SubjectBadge } from '@/components/shared/subject-badge'
import { MathRenderer } from '@/components/shared/math-renderer'
import { Skeleton } from '@/components/ui/skeleton'
import { getCourse } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { CourseDetail } from '@/lib/api'

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !courseId) return
    getCourse(courseId, user.id)
      .then(setCourse)
      .catch(() => setError('Cours introuvable.'))
      .finally(() => setLoading(false))
  }, [courseId, user])

  const date = course
    ? new Date(course.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <>
      <Header
        title={loading ? 'Cours' : (course?.title ?? 'Cours introuvable')}
        right={
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" strokeWidth={2} />
          </button>
        }
      />

      <PageWrapper>
        {loading && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-3.5 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        )}

        {!loading && course && (
          <div className="flex flex-col gap-4">
            {/* Meta */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <SubjectBadge subject={course.subject} />
                <span className="text-sm text-slate-500">{course.level}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                <span>Ajouté le {date}</span>
              </div>
              {course.keywords.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div className="flex flex-wrap gap-1.5">
                    {course.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contenu */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:rounded prose-code:px-1">
                <MathRenderer
                  content={course.raw_content}
                  className="text-slate-800 leading-relaxed text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  )
}
