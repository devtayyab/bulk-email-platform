'use client'

import { useEffect, useState } from 'react'
import { campaignService } from '@/lib/campaignService'
import { CampaignStats } from '@/lib/types'
import { BarChart3, Mail, AlertCircle, Clock, CheckCircle } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<CampaignStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const campaigns = await campaignService.getCampaigns()
      const campaignStatsPromises = campaigns.map(campaign =>
        campaignService.getCampaignStats(campaign.id)
      )
      const statsResults = await Promise.all(campaignStatsPromises)
      setStats(statsResults)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalStats = stats.reduce(
    (acc, stat) => ({
      total: acc.total + stat.stats.total,
      sent: acc.sent + stat.stats.sent,
      failed: acc.failed + stat.stats.failed,
      pending: acc.pending + stat.stats.pending,
      queued: acc.queued + stat.stats.queued,
    }),
    { total: 0, sent: 0, failed: 0, pending: 0, queued: 0 }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Overall Statistics
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Mail className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Emails
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalStats.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Sent
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalStats.sent}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalStats.pending}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Queued
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalStats.queued}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Failed
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalStats.failed}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Campaign Details
          </h3>
          {stats.length === 0 ? (
            <p className="text-gray-500">No campaigns found.</p>
          ) : (
            <div className="space-y-4">
              {stats.map((stat) => (
                <div key={stat.campaign.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {stat.campaign.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {stat.campaign.subject}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created: {new Date(stat.campaign.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        stat.campaign.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : stat.campaign.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : stat.campaign.status === 'sending'
                          ? 'bg-blue-100 text-blue-800'
                          : stat.campaign.status === 'queued'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {stat.campaign.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Sent:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {stat.stats.sent}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Pending:</span>
                      <span className="ml-2 font-medium text-yellow-600">
                        {stat.stats.pending}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Queued:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {stat.stats.queued}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Failed:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {stat.stats.failed}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
