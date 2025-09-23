import api from './api'
import { Campaign, CampaignStats, CreateCampaignData } from './types'

export const campaignService = {
  async getCampaigns(): Promise<Campaign[]> {
    const response = await api.get('/campaigns')
    return response.data
  },

  async getCampaign(id: string): Promise<Campaign> {
    const response = await api.get(`/campaigns/${id}`)
    return response.data
  },

  async createCampaign(data: CreateCampaignData): Promise<Campaign> {
    const response = await api.post('/campaigns', data)
    return response.data
  },

  async startCampaign(id: string): Promise<Campaign> {
    const response = await api.post(`/campaigns/${id}/start`)
    return response.data
  },

  async getCampaignStats(id: string): Promise<CampaignStats> {
    const response = await api.get(`/campaigns/${id}/stats`)
    return response.data
  },
}
