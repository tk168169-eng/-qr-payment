import { useState, useEffect, useRef, useCallback, RefObject } from 'react'
import type { QRGateway, OmiseSimulateStatus, QRPaymentState, QRPaymentActions } from './types'

const POLL_INTERVAL_MS = 5000

export interface UseQRPaymentOptions {
  /** Whether the QR modal is currently open */
  show: boolean
  gateway: QRGateway
  /** Payment record ID — required for Omise flows */
  paymentId: number | null
  /** Used as the filename when downloading the QR PNG */
  quotationNo: string
  /** Minutes until QR expires (default: 15) */
  expiryMinutes?: number
  /** Omise QR image URL returned by the Omise API */
  omiseQrUrl?: string | null
  /** Called when the countdown timer reaches 0 */
  onExpire?: () => void
  /** Called when Omise polling detects a successful charge */
  onOmiseSuccess?: () => void
  /** Service functions — inject your payment API calls here */
  services: {
    omiseCheck: (paymentId: number) => Promise<{ completed: boolean; status?: string }>
    omiseSimulate: (paymentId: number, chargeStatus: OmiseSimulateStatus) => Promise<unknown>
  }
  /** Ref to the QR card DOM element used by html2canvas for static download */
  qrCardRef: RefObject<HTMLDivElement | null>
}

/**
 * useQRPayment
 *
 * Manages all QR payment runtime state in one hook:
 *  - Countdown timer (resets every time `show` becomes true)
 *  - Expiry detection (timer hits 0 OR Omise marks charge expired/failed)
 *  - Omise polling every 5 s while modal is open
 *  - Omise test simulation
 *  - QR PNG download (html2canvas for static, Image+Canvas for Omise SVG)
 */
export function useQRPayment(opts: UseQRPaymentOptions): {
  state: QRPaymentState
  actions: QRPaymentActions
} {
  const {
    show,
    gateway,
    paymentId,
    quotationNo,
    expiryMinutes = 15,
    omiseQrUrl = null,
    onExpire,
    onOmiseSuccess,
    services,
    qrCardRef,
  } = opts

  // ── Countdown timer ─────────────────────────────────────────
  const [remainingSeconds, setRemainingSeconds] = useState(expiryMinutes * 60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimer = useCallback(() => {
    setRemainingSeconds(expiryMinutes * 60)
  }, [expiryMinutes])

  useEffect(() => {
    if (!show) return
    setRemainingSeconds(expiryMinutes * 60)
    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [show, expiryMinutes])

  useEffect(() => {
    if (remainingSeconds === 0 && show) onExpire?.()
  }, [remainingSeconds, show, onExpire])

  // ── Omise polling ────────────────────────────────────────────
  const [omisePolling, setOmisePolling] = useState(false)
  const [omiseExpired, setOmiseExpired] = useState(false)
  const [simulateLoading, setSimulateLoading] = useState(false)
  const omisePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopOmisePolling = useCallback(() => {
    if (omisePollRef.current) { clearInterval(omisePollRef.current); omisePollRef.current = null }
    setOmisePolling(false)
  }, [])

  useEffect(() => {
    if (!show || gateway !== 'omise' || !paymentId) return
    setOmiseExpired(false)
    setOmisePolling(true)
    omisePollRef.current = setInterval(async () => {
      try {
        const result = await services.omiseCheck(paymentId)
        if (result.completed) {
          stopOmisePolling(); onOmiseSuccess?.()
        } else if (result.status === 'failed' || result.status === 'expired') {
          stopOmisePolling(); setOmiseExpired(true)
        }
      } catch { /* keep polling on network hiccup */ }
    }, POLL_INTERVAL_MS)
    return () => { stopOmisePolling() }
  }, [show, gateway, paymentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (omisePollRef.current) clearInterval(omisePollRef.current)
  }, [])

  // ── Derived display values ───────────────────────────────────
  const isExpired = remainingSeconds <= 0 || omiseExpired
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isWarning = remainingSeconds <= 120 && remainingSeconds > 0

  // ── Actions ──────────────────────────────────────────────────
  const downloadQR = useCallback(async () => {
    try {
      if (gateway === 'omise' && omiseQrUrl) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve(); img.onerror = reject; img.src = omiseQrUrl
        })
        const size = Math.max(img.naturalWidth || 400, img.naturalHeight || 400)
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size); ctx.drawImage(img, 0, 0)
        triggerDownload(canvas.toDataURL('image/png'), `QR-${quotationNo}.png`)
      } else if (qrCardRef.current) {
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(qrCardRef.current, {
          backgroundColor: '#ffffff', scale: 2, useCORS: true,
        })
        triggerDownload(canvas.toDataURL('image/png'), `QR-${quotationNo}.png`)
      }
    } catch (err) {
      console.error('[useQRPayment] download failed:', err)
    }
  }, [gateway, omiseQrUrl, quotationNo, qrCardRef])

  const simulate = useCallback(async (status: OmiseSimulateStatus) => {
    if (!paymentId) return
    setSimulateLoading(true)
    try {
      await services.omiseSimulate(paymentId, status)
      stopOmisePolling()
      if (status === 'successful') onOmiseSuccess?.()
      else setOmiseExpired(true)
    } finally {
      setSimulateLoading(false)
    }
  }, [paymentId, services, stopOmisePolling, onOmiseSuccess])

  return {
    state: { gateway, isExpired, remainingSeconds, timeDisplay, isWarning, omiseQrUrl, omisePolling, omiseExpired, simulateLoading },
    actions: { downloadQR, simulate, resetTimer },
  }
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl; a.download = filename; a.click()
}
