import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  nombre: z.string().max(80).optional(),
})

/**
 * Sends the Prestafin welcome email. Only fires for accounts created in the
 * last 10 minutes (verified server-side), so it cannot be used to spam.
 */
export const sendWelcomeEmail = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendTemplateEmail } = await import('./email-templates/send-email')

    const email = data.email.trim().toLowerCase()
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const user = list?.users?.find((u) => u.email?.toLowerCase() === email)
    if (!user) return { sent: false as const }

    const createdAt = new Date(user.created_at).getTime()
    if (Date.now() - createdAt > 10 * 60 * 1000) return { sent: false as const }

    const nombre =
      data.nombre?.trim() ||
      (user.user_metadata?.['full_name'] as string | undefined)?.trim() ||
      email.split('@')[0]

    try {
      const result = await sendTemplateEmail('welcome', email, {
        templateData: { nombre },
        idempotencyKey: `welcome-${user.id}`,
      })
      return { sent: result.sent }
    } catch (error) {
      console.error('welcome email failed', error)
      return { sent: false as const }
    }
  })