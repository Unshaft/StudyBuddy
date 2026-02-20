'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { CourseCard } from './course-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CourseListItem } from '@/types'

interface CourseListProps {
  courses: CourseListItem[]
  loading?: boolean
}

export function CourseList({ courses, loading }: CourseListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
        </div>
        <p className="text-slate-600 font-medium">Aucun cours pour l&apos;instant</p>
        <p className="text-slate-400 text-sm mt-1">
          Prends ton cours en photo pour commencer
        </p>
        <Link
          href="/cours/upload"
          className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 h-11 rounded-xl transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Ajouter un cours
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}
