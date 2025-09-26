'use client'

import { useEffect, useState } from 'react'
import { campaignService } from '@/lib/campaignService'
import { Campaign } from '@/lib/types'
import { Play, Eye, Trash2 } from 'lucide-react'

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const data = await campaignService.getCampaigns()
      setCampaigns(data)
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await campaignService.startCampaign(campaignId)
      // Reload campaigns to show updated status
      await loadCampaigns()
    } catch (error) {
      console.error('Error starting campaign:', error)
      alert('Failed to start campaign')
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        // TODO: Implement delete endpoint in backend
        console.log('Delete campaign:', campaignId)
        alert('Delete functionality not yet implemented')
      } catch (error) {
        console.error('Error deleting campaign:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Campaigns
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage your email campaigns
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
        {campaigns.length === 0 ? (
          <li className="px-4 py-4 text-center text-gray-500">
            No campaigns found. Create your first campaign!
          </li>
        ) : (
          campaigns.map((campaign) => (
            <li key={campaign.id} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-indigo-600 truncate">
                      {campaign.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          campaign.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : campaign.status === 'sending'
                            ? 'bg-blue-100 text-blue-800'
                            : campaign.status === 'queued'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <p className="truncate">{campaign.subject}</p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <p>
                      {campaign.jobs?.length || 0} recipients • Created{' '}
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleStartCampaign(campaign.id)}
                    disabled={campaign.status !== 'draft'}
                    className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                      campaign.status === 'draft'
                        ? 'text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                        : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    }`}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </button>
                  {/* <button
                    onClick={() => {
                      // TODO: Implement view campaign details
                      console.log('View campaign:', campaign.id)
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button> */}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
