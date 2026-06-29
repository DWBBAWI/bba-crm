export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CRMClient } from '@/components/crm/CRMClient'

export default async function CRMPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('role, can_delete_leads')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'
  const canDeleteLeads = isAdmin || profile?.can_delete_leads === true

  const query = supabase
    .from('leads')
    .select('*, assigned_rep:users(id, name, email), owner:people(id, name, phone, email), business:businesses(id, owner_id, business_name, address, city, state, zip, industry)')
    .order('updated_at', { ascending: false })

  if (!isAdmin) query.eq('assigned_rep_id', user!.id)

  const { data: leads } = await query

  const { data: allReps } = await supabase
    .from('users')
    .select('id, name, email')
    .order('name')

  return (
    <CRMClient
      leads={leads || []}
      currentUserId={user!.id}
      isAdmin={isAdmin}
      canDeleteLeads={canDeleteLeads}
      reps={allReps || []}
    />
  )
}
