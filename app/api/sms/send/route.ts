import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { leadId, message, toNumber } = await req.json()

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_DEFAULT_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 400 })
    }

    const twilio = (await import('twilio')).default
    const client = twilio(accountSid, authToken)

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber,
    })

    await supabase.from('sms_logs').insert({
      lead_id: leadId,
      message,
      sent_at: new Date().toISOString(),
      direction: 'outbound',
    })

    await supabase.from('activity_log').insert({
      lead_id: leadId,
      user_id: user.id,
      action: 'sent SMS',
      details: message.slice(0, 100),
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
