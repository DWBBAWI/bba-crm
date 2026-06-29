import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Redirects the signed-in user to Google's OAuth consent screen.
// Required env vars: GOOGLE_CLIENT_ID, NEXT_PUBLIC_APP_URL

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const clientId   = process.env.GOOGLE_CLIENT_ID
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = `${appUrl}/api/calendar/callback`

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID and NEXT_PUBLIC_APP_URL env vars are required' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar',
    access_type:   'offline',
    prompt:        'consent',          // forces refresh_token to be returned
    state:         user.id,            // echoed back in callback so we know who to update
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
