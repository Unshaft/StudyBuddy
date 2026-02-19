import { cn } from '@/lib/utils'
import { SUBJECT_COLORS } from '@/types'

interface SubjectBadgeProps {
  subject: string
  className?: string
}

export function SubjectBadge({ subject, className }: SubjectBadgeProps) {
  const colors = SUBJECT_COLORS[subject] ?? 'bg-slate-100 text-slate-700'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors,
        className
      )}
    >
      {subject}
    </span>
  )
}
