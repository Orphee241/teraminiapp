import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../../_auth'

function isAdmin(id: string) {
  return (process.env.TERAMINI_ADMIN_TELEGRAM_IDS || '').split(',').map(value => value.trim()).includes(id)
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  return NextResponse.json({ allowed: isAdmin(String(auth.user?.id || '')) })
}