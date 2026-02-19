'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, PenLine, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/cours', label: 'Cours', Icon: BookOpen },
  { href: '/exercice', label: 'Exercice', Icon: PenLine },
  { href: '/historique', label: 'Historique', Icon: Clock },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-slate-100">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 min-w-[64px] py-2 px-4 rounded-xl',
                'transition-all duration-200 cursor-pointer',
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={cn('text-[10px] font-medium tracking-wide')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
