export type QRGateway = 'static' | 'omise'
export type PromptPayMode = 'test' | 'live'
export type OmiseSimulateStatus = 'successful' | 'failed' | 'expired'

export interface QRSettings {
  gateway: QRGateway
  promptpayId: string
  promptpayTestId: string
  promptpayName: string
  promptpayMode: PromptPayMode
  omisePublicKey: string
  omiseConfigured: boolean
  requireSlipUpload: boolean
  adminBypassQr: boolean
  adminRequireSlipUpload: boolean
}

export interface PromptPayValidation {
  valid: boolean
  cleaned: string
  /** Human-readable type label (Thai) */
  type: string
}

export interface QRPaymentState {
  gateway: QRGateway
  isExpired: boolean
  remainingSeconds: number
  timeDisplay: string
  isWarning: boolean
  omiseQrUrl: string | null
  omisePolling: boolean
  omiseExpired: boolean
  simulateLoading: boolean
}

export interface QRPaymentActions {
  downloadQR: () => Promise<void>
  simulate: (status: OmiseSimulateStatus) => Promise<void>
  resetTimer: () => void
}
