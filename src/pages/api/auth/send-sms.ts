import type { APIRoute } from 'astro'
import { serverSecret } from '../../../lib/secrets'
import { handleSmsHook } from '../../../lib/textlk-sms.js'
export const prerender = false
export const POST: APIRoute = ({ request, locals }) => handleSmsHook(request, {
  secret: serverSecret(locals, 'SUPABASE_SEND_SMS_HOOK_SECRET'),
  apiKey: serverSecret(locals, 'TEXTLK_API_KEY'),
  senderId: serverSecret(locals, 'TEXTLK_SENDER_ID'),
})
