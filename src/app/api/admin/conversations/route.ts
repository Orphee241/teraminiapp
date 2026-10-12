import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../../_auth'
import { adminConversations, adminMessages } from '../../../../lib/storage'
function isAdmin(id: string) { return (process.env.TERAMINI_ADMIN_TELEGRAM_IDS || '').split(',').map(x => x.trim()).includes(id) }
export async function GET(request: NextRequest) { const auth = await authenticate(request); if (auth.response) return auth.response; if (!isAdmin(String(auth.user?.id || ''))) return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 }); try { const id = new URL(request.url).searchParams.get('conversation_id'); return NextResponse.json(id ? { messages: await adminMessages(id) } : { conversations: await adminConversations() }) } catch { return NextResponse.json({ error: 'Espace admin indisponible.' }, { status: 503 }) } }
