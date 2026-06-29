export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CommissionsClient } from '@/components/commissions/CommissionsClient'

export default async function CommissionsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'

  if (!isAdmin) {
    redirect('/')
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [
    { data: records },
    { data: processors },
    { data: reps },
    { data: businesses, error: bizError },
    { count: overdueCount },
  ] = await Promise.all([
    supabase
      .from('commission_records')
      .select('*, rep:users(id, name, email, role, avatar_url)')
      .eq('year', year)
      .eq('month', month)
      .order('total_owed', { ascending: false }),
    supabase
      .from('payment_processors')
      .select('*')
      .eq('active', true)
      .order('name'),
    supabase
      .from('users')
      .select('id, name, email, role, avatar_url')
      .order('name'),
    supabase
      .from('businesses')
      .select('*, owner:people(id, name)')
      .order('business_name'),
    supabase
      .from('commission_records')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'paid')
      .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`),
  ])

  if (bizError) console.error('[CommissionsPage] businesses query error:', bizError)
  console.log('[CommissionsPage] businesses fetched:', businesses?.length ?? 0)

  return (
    <CommissionsClient
      records={(records ?? []) as any}
      processors={processors ?? []}
      reps={(reps ?? []) as any}
      businesses={(businesses ?? []) as any}
      year={year}
      month={month}
      currentUserId={user!.id}
      overdueCount={overdueCount ?? 0}
    />
  )
}
