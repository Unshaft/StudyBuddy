'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { SubjectBadge } from '@/components/shared/subject-badge'
import { deleteCourse } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useCoursStore } from '@/store/cours.store'
import type { CourseListItem } from '@/types'

interface CourseCardProps {
  course: CourseListItem
}

export function CourseCard({ course }: CourseCardProps) {
  const user = useAuthStore((s) => s.user)
  const removeCourse = useCoursStore((s) => s.removeCourse)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user || !confirm(`Supprimer "${course.title}" ?`)) return
    setDeleting(true)
    try {
      await deleteCourse(course.id, user.id)
      removeCourse(course.id)
    } catch {
      setDeleting(false)
    }
  }

  const date = new Date(course.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm leading-snug truncate">
          {course.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <SubjectBadge subject={course.subject} />
          <span className="text-xs text-slate-400">{course.level}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">{date}</span>
        </div>
        {course.keywords.length > 0 && (
          <p className="text-xs text-slate-400 mt-1.5 truncate">
            {course.keywords.slice(0, 4).join(', ')}
          </p>
        )}
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Supprimer ce cours"
        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150 cursor-pointer flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
