import * as React from 'react'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { TEMPLATES } from './registry'

// Server-only: reads RESEND_API_KEY. Never import from client components.

// Configuration baked in at scaffold time
const SITE_NAME = "Prestafin"
// FROM_DOMAIN is the domain shown in the From: header. It must be a domain
// (or subdomain) you have verified in the Resend dashboard.
const FROM_DOMAIN = "prestafin.tech"

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send. */
  idempotencyKey?: string
  replyTo?: string
}

let _resend: Resend | undefined
function getResendClient(): Resend {
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  if (!_resend) _resend = new Resend(apiKey)
  return _resend
}

/**
 * Renders a registered template and sends it through Resend.
 * A suppressed recipient (bounced/complained, per Resend's own suppression
 * list) is an expected outcome ({ sent: false }); any other failure throws.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const resend = getResendClient()

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  const payload: Parameters<typeof resend.emails.send>[0] = {
    to: recipient,
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    subject,
    html,
    text,
    ...(options.idempotencyKey ? { headers: { 'Idempotency-Key': options.idempotencyKey } } : {}),
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  }

  const { error } = await resend.emails.send(payload)

  if (error) {
    // Resend flags hard-bounced/complained addresses this way.
    if ((error as { name?: string }).name === 'validation_error' && /suppress/i.test(error.message ?? '')) {
      return { sent: false, reason: 'recipient_suppressed' }
    }
    throw new Error(error.message ?? 'Failed to send email via Resend')
  }

  return { sent: true }
}
