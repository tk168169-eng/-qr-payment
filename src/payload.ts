import generatePayload from 'promptpay-qr'
import type { PromptPayValidation } from './types'

/**
 * Build the EMVCo QR payload string for Thai PromptPay.
 * @param id  Raw PromptPay ID (digits only, dashes/spaces cleaned internally)
 * @param amount  Payment amount in THB. Pass 0 to omit amount.
 * @returns EMVCo payload string, or empty string on error.
 */
export function buildPromptPayPayload(id: string, amount: number): string {
  if (!id) return ''
  try {
    const clean = id.replace(/[^0-9]/g, '')
    if (!clean) return ''
    return generatePayload(clean, amount > 0 ? { amount } : {})
  } catch {
    return ''
  }
}

/**
 * Mask a PromptPay ID for display — shows only the last 4 digits.
 *
 *   0812345678    → "XXX-XXXX-5678"
 *   1234567890123 → "X XXXX XXXX0 12 3"
 */
export function maskPromptPayId(id: string): string {
  const clean = id.replace(/[^0-9]/g, '')
  if (clean.length === 13) {
    return `X XXXX XXXX${clean[9]} ${clean[10]}${clean[11]} ${clean[12]}`
  }
  if (clean.length === 10) {
    return `XXX-XXXX-${clean.slice(-4)}`
  }
  return 'X'.repeat(Math.max(0, clean.length - 4)) + clean.slice(-4)
}

/**
 * Validate a PromptPay ID and return the cleaned digits + Thai type label.
 *
 * Accepted:
 *   10-digit starting with 0  → mobile phone
 *   13-digit                  → national ID / tax ID
 *   15+ digits                → e-Wallet ID
 */
export function validatePromptPayId(id: string): PromptPayValidation {
  const cleaned = id.replace(/[^0-9]/g, '')
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return { valid: true, cleaned, type: 'เบอร์โทรศัพท์' }
  }
  if (cleaned.length === 13) {
    return { valid: true, cleaned, type: 'เลขบัตรประชาชน/เลขผู้เสียภาษี' }
  }
  if (cleaned.length >= 15) {
    return { valid: true, cleaned, type: 'e-Wallet ID' }
  }
  return { valid: false, cleaned, type: 'ไม่ถูกต้อง' }
}

/**
 * Resolve the active PromptPay ID based on current mode.
 * In test mode, prefers testId and falls back to liveId.
 */
export function resolveActivePromptPayId(
  liveId: string,
  testId: string,
  mode: 'test' | 'live'
): string {
  return mode === 'test' ? testId || liveId : liveId
}
