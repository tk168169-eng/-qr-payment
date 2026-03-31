import { useMemo } from 'react'
import generatePayload from 'promptpay-qr'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode } from 'lucide-react'
import { maskPromptPayId } from './payload'

function ThaiQRHeaderIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="36" height="36" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
      <rect x="7" y="12" width="4" height="12" fill="white"/>
      <rect x="3" y="16" width="12" height="4" fill="white"/>
      <polygon points="20,26 30,26 25,18" fill="#00b4b4"/>
      <polygon points="25,23 33,26 28,16" fill="#2dd4bf" opacity="0.7"/>
    </svg>
  )
}

function ThaiQRCenterIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="3" fill="white"/>
      <rect x="4" y="9" width="3" height="9" fill="#1b3a6b"/>
      <rect x="1" y="12" width="9" height="3" fill="#1b3a6b"/>
      <polygon points="14,20 22,20 18,13" fill="#00b4b4"/>
      <polygon points="18,18 24,20 21,13" fill="#2dd4bf" opacity="0.8"/>
    </svg>
  )
}

export interface PromptPayQRProps {
  promptpayId: string
  amount: number
  size?: number
  accountName?: string
  isTestMode?: boolean
}

export default function PromptPayQR({
  promptpayId,
  amount,
  size = 160,
  accountName,
  isTestMode = false,
}: PromptPayQRProps) {
  const { payload, maskedId } = useMemo(() => {
    if (!promptpayId) return { payload: '', maskedId: '' }
    try {
      const cleanId = promptpayId.replace(/[^0-9]/g, '')
      if (!cleanId) return { payload: '', maskedId: '' }
      const generatedPayload = generatePayload(cleanId, amount > 0 ? { amount } : {})
      return { payload: generatedPayload, maskedId: maskPromptPayId(cleanId) }
    } catch {
      return { payload: '', maskedId: '' }
    }
  }, [promptpayId, amount])

  if (!payload) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
        <QrCode size={48} color="#d1d5db" />
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>ยังไม่ได้ตั้งค่า PromptPay</p>
      </div>
    )
  }

  const cardWidth = Math.max(size + 200, 380)

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', width: cardWidth }}>
      {isTestMode && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <span style={{ background: '#ffedd5', color: '#c2410c', fontSize: 12, padding: '2px 10px', borderRadius: 999 }}>
            โหมดทดสอบ
          </span>
        </div>
      )}

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #d1d5db', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: '#fff' }}>
        {/* Header */}
        <div style={{ background: '#1b3a6b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 20px' }}>
          <ThaiQRHeaderIcon />
          <div style={{ color: '#fff', fontWeight: 800, lineHeight: 1.2, letterSpacing: '0.05em' }}>
            <div style={{ fontSize: 15 }}>THAI QR</div>
            <div style={{ fontSize: 15 }}>PAYMENT</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 24px', gap: 8, background: '#fff' }}>
          {/* PromptPay label box */}
          <div style={{ border: '2px solid #374151', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 16px', minWidth: 120 }}>
            <span style={{ fontSize: 9, color: '#00aabb', letterSpacing: '0.12em', fontWeight: 500 }}>พร้อมเพย์</span>
            <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
              <span style={{ fontSize: 18, color: '#1b3a6b', fontWeight: 800, letterSpacing: '-0.5px' }}>Prompt</span>
              <span style={{ fontSize: 21, color: '#00aabb', fontWeight: 800, fontStyle: 'italic', letterSpacing: '-0.5px' }}>Pay</span>
            </div>
          </div>

          {/* QR Code */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <QRCodeSVG value={payload} size={size} level="H" bgColor="#FFFFFF" fgColor="#000000" />
            <div style={{ position: 'absolute', width: 34, height: 34, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThaiQRCenterIcon />
            </div>
          </div>

          {accountName && (
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', textAlign: 'center', margin: '4px 0 0', wordBreak: 'break-word' }}>
              {accountName}
            </p>
          )}
        </div>
      </div>

      {maskedId && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '0 4px' }}>
          <span style={{ fontSize: 14, color: '#374151' }}>หมายเลขพร้อมเพย์</span>
          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1f2937', letterSpacing: '0.05em' }}>
            {maskedId}
          </span>
        </div>
      )}
    </div>
  )
}
