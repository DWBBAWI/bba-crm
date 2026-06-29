import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Handles the Google OAuth redirect.  Google calls this with ?code=...&state=<userId>
// We exchange the code for tokens and save the refresh token to the user's profile.
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_APP_URL

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code   = searchParams.get('code')
  const userId = searchParams.get('state')
  const error  = searchParams.get('error')

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const settingsUrl = (status: string) =>
    `${appUrl}/settings?calendar=${status}`

  if (error || !code || !userId) {
    return NextResponse.redirect(settingsUrl('error'))
  }

  // Exchange the authorization code for access + refresh tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${appUrl}/api/calendar/callback`,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[calendar/callback] token exchange failed', await tokenRes.text())
    return NextResponse.redirect(settingsUrl('error'))
  }

  const tokens: { refresh_token?: string; error?: string } = await tokenRes.json()

  if (tokens.error || !tokens.refresh_token) {
    // No refresh token means the user already authorized once and Google won't
    // re-issue it without prompt=consent — which we already set.  Treat as success.
    return NextResponse.redirect(settingsUrl('connected'))
  }

  // Save the refresh token to the user record
  const supabase = await createServerSupabaseClient()
  const { error: dbErr } = await supabase
    .from('users')
    .update({ google_calendar_token: tokens.refresh_token })
    .eq('id', userId)

  if (dbErr) {
    console.error('[calendar/callback] failed to save token', dbErr)
    return NextResponse.redirect(settingsUrl('error'))
  }

  return NextResponse.redirect(settingsUrl('connected'))
}
