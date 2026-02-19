import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  className?: string
  right?: React.ReactNode
}

export function Header({ title, subtitle, className, right }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center justify-between px-4 pt-4 pb-3',
        'bg-white/80 backdrop-blur-xl border-b border-slate-100/80',
        className
      )}
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {right && <div>{right}</div>}
    </header>
  )
}
