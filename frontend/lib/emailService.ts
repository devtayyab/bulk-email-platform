import api from './api'

export interface EmailWithData {
  email: string
  data: Record<string, any>
  jobCount: number
  lastUsed: string
}

export const emailService = {
  async getAllEmails(search?: string): Promise<EmailWithData[]> {
    const params = search ? { search } : {}
    const response = await api.get('/emails', { params })
    return response.data
  },

  async deleteEmail(email: string): Promise<void> {
    await api.delete(`/emails/${encodeURIComponent(email)}`)
  },
}
