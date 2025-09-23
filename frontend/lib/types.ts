export interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  status: 'draft' | 'queued' | 'sending' | 'completed' | 'failed'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  jobs?: EmailJob[]
}

export interface EmailJob {
  id: string
  campaignId: string
  recipientEmail: string
  recipientData?: Record<string, any>
  status: 'pending' | 'queued' | 'sent' | 'failed'
  retryCount: number
  sentAt?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export interface CampaignStats {
  campaign: Campaign
  stats: {
    total: number
    sent: number
    failed: number
    pending: number
    queued: number
  }
}

export interface CreateCampaignData {
  name: string
  subject: string
  body: string
  recipients: Array<{
    email: string
    data?: Record<string, any>
  }>
  metadata?: Record<string, any>
}

export interface ParsedRecipient {
  email: string
  data?: Record<string, any>
}
