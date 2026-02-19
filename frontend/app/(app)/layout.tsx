import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BottomNav } from '@/components/layout/bottom-nav'
import { AuthInit } from '@/components/auth/auth-init'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthInit />
      {children}
      <BottomNav />
    </div>
  )
}
