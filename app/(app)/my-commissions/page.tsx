export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MyCommissionsClient } from '@/components/commissions/MyCommissionsClient'

export default async function MyCommissionsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: records } = await supabase
    .from('commission_records')
    .select('*, line_items:commission_line_items(*, business:businesses(business_name), lead:leads(business_name))')
    .eq('rep_id', user!.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  return <MyCommissionsClient records={(records ?? []) as any} />
}
