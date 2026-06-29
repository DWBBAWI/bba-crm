import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, can_delete_leads')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'owner' || profile?.role === 'vp_operations'
  const canDeleteLeads = profile?.can_delete_leads === true

  if (!isAdmin && !canDeleteLeads) {
    return NextResponse.json({ error: 'You do not have permission to delete leads.' }, { status: 403 })
  }

  const { id: leadId } = await params

  // Salespeople may only delete leads assigned to themselves
  if (!isAdmin) {
    const { data: lead, error: fetchErr } = await supabase
      .from('leads')
      .select('assigned_rep_id')
      .eq('id', leadId)
      .single()

    if (fetchErr || !lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
    }
    if (lead.assigned_rep_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete leads that are assigned to you.' },
        { status: 403 }
      )
    }
  }

  const { error } = await supabase.from('leads').delete().eq('id', leadId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
