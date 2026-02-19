import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  withPadding?: boolean
}

export function PageWrapper({
  children,
  className,
  withPadding = true,
}: PageWrapperProps) {
  return (
    <main
      className={cn(
        'flex-1 overflow-y-auto pb-24',
        withPadding && 'px-4 py-4',
        className
      )}
    >
      {children}
    </main>
  )
}
