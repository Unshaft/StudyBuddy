'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, BookOpen } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { CourseList } from '@/components/cours/course-list'
import { useCoursStore } from '@/store/cours.store'
import { useAuthStore } from '@/store/auth.store'
import { listCourses } from '@/lib/api'
import { SUBJECTS } from '@/types'

export default function CoursPage() {
  const user = useAuthStore((s) => s.user)
  const { courses, setCourses } = useCoursStore()
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setFetchError(null)
    listCourses(user.id)
      .then(setCourses)
      .catch((err) => {
        console.error('listCourses error:', err)
        setFetchError('Impossible de charger les cours. Vérifie ta connexion.')
      })
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute stats
  const subjectsUsed = new Set(courses.map((c) => c.subject)).size

  return (
    <>
      <Header
        title="Mes cours"
        right={
          <Link
            href="/cours/upload"
            className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors duration-200 cursor-pointer"
            aria-label="Ajouter un cours"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </Link>
        }
      />

      {/* Stats bar — inspired by course_library maquette */}
      {courses.length > 0 && (
        <div className="px-4 py-3 bg-white/60 border-b border-slate-100 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">{courses.length}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">cours</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">{subjectsUsed}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                matière{subjectsUsed > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center">
              <span className="text-[10px] font-bold text-amber-600">IA</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">
                {SUBJECTS.length - subjectsUsed > 0 ? SUBJECTS.length - subjectsUsed : '✓'}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                {SUBJECTS.length - subjectsUsed > 0 ? 'dispo' : 'complet'}
              </p>
            </div>
          </div>
        </div>
      )}

      <PageWrapper>
        {fetchError && (
          <div className="mb-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {fetchError}
          </div>
        )}
        <CourseList courses={courses} loading={loading} />
      </PageWrapper>
    </>
  )
}
