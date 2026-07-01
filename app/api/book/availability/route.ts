import { NextRequest, NextResponse } from 'next/server'
import { resolveRepBySlug, getBookedSlots } from '@/lib/booking'

// Public endpoint — no auth required (booking pages are public).
// Returns only booked slot labels, never raw appointment rows.
export async function GET(req: NextRequest) {
  const repSlug = req.nextUrl.searchParams.get('repSlug')
  const date = req.nextUrl.searchParams.get('date')

  if (!repSlug || !date) {
    return NextResponse.json({ error: 'Missing repSlug or date' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const rep = await resolveRepBySlug(repSlug)
  if (!rep) {
    return NextResponse.json({ error: 'Rep not found' }, { status: 404 })
  }

  const bookedSlots = await getBookedSlots(rep.id, date)
  return NextResponse.json({ bookedSlots })
}
