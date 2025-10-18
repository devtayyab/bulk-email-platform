'use client'

import { useState, useEffect, useMemo } from 'react'
import { emailService, EmailWithData } from '@/lib/emailService'
import { Search, Trash2, CheckSquare, Square, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface EmailManagementTableProps {
  selectedEmails: string[]
  onSelectionChange: (emails: string[]) => void
}

export default function EmailManagementTable({ 
  selectedEmails, 
  onSelectionChange 
}: EmailManagementTableProps) {
  const [emails, setEmails] = useState<EmailWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    loadEmails()
  }, [])

  const loadEmails = async (searchTerm?: string) => {
    setLoading(true)
    try {
      const data = await emailService.getAllEmails(searchTerm)
      setEmails(data)
    } catch (error) {
      console.error('Error loading emails:', error)
      alert('Failed to load emails')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1) // Reset to first page on search
    if (value.length >= 2 || value.length === 0) {
      loadEmails(value || undefined)
    }
  }

  const handleDelete = async (email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This will remove it from all campaigns.`)) {
      return
    }

    setDeleting(email)
    try {
      await emailService.deleteEmail(email)
      setEmails(emails.filter(e => e.email !== email))
      
      // Remove from selection if it was selected
      if (selectedEmails.includes(email)) {
        onSelectionChange(selectedEmails.filter(e => e !== email))
      }
      
      alert('Email deleted successfully')
    } catch (error) {
      console.error('Error deleting email:', error)
      alert('Failed to delete email')
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleEmail = (email: string) => {
    if (selectedEmails.includes(email)) {
      onSelectionChange(selectedEmails.filter(e => e !== email))
    } else {
      onSelectionChange([...selectedEmails, email])
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(emails.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmails = useMemo(() => {
    return emails.slice(startIndex, endIndex)
  }, [emails, startIndex, endIndex])

  const handleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(emails.map(e => e.email))
    }
  }

  const handleSelectCurrentPage = () => {
    const currentPageEmails = paginatedEmails.map(e => e.email)
    const allCurrentPageSelected = currentPageEmails.every(email => selectedEmails.includes(email))
    
    if (allCurrentPageSelected) {
      // Deselect all on current page
      onSelectionChange(selectedEmails.filter(email => !currentPageEmails.includes(email)))
    } else {
      // Select all on current page
      const combinedEmails = [...selectedEmails, ...currentPageEmails]
      const newSelection = Array.from(new Set(combinedEmails))
      onSelectionChange(newSelection)
    }
  }

  const isAllSelected = emails.length > 0 && selectedEmails.length === emails.length
  const isCurrentPageSelected = paginatedEmails.length > 0 && 
    paginatedEmails.every(e => selectedEmails.includes(e.email))

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-gray-700">
            Existing Emails ({emails.length.toLocaleString()})
          </h4>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search emails..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {selectedEmails.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md px-4 py-2 flex justify-between items-center">
          <p className="text-sm text-indigo-700">
            <strong>{selectedEmails.length.toLocaleString()}</strong> email{selectedEmails.length !== 1 ? 's' : ''} selected for this campaign
          </p>
          <button
            onClick={() => onSelectionChange([])}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {emails.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {search ? 'No emails found matching your search' : 'No emails found. Upload recipients to get started.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSelectCurrentPage}
                        className="flex items-center text-gray-700 hover:text-gray-900"
                        title="Select all on this page"
                      >
                        {isCurrentPageSelected ? (
                          <CheckSquare className="h-5 w-5 text-indigo-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      {!isAllSelected && selectedEmails.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                          title="Select all emails"
                        >
                          All
                        </button>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Additional Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Used In Campaigns
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEmails.map((emailData) => {
                  const isSelected = selectedEmails.includes(emailData.email)
                  const dataKeys = Object.keys(emailData.data || {})
                  
                  return (
                    <tr 
                      key={emailData.email}
                      className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleEmail(emailData.email)}
                          className="flex items-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-indigo-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{emailData.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {dataKeys.length > 0 ? (
                          <div className="text-sm text-gray-600">
                            {dataKeys.slice(0, 2).map(key => (
                              <div key={key} className="truncate max-w-xs">
                                <span className="font-medium">{key}:</span> {String(emailData.data[key])}
                              </div>
                            ))}
                            {dataKeys.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{dataKeys.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {emailData.jobCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(emailData.lastUsed).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleDelete(emailData.email)}
                          disabled={deleting === emailData.email}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete email"
                        >
                          {deleting === emailData.email ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, emails.length)}</span> of{' '}
                    <span className="font-medium">{emails.length.toLocaleString()}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">First</span>
                      <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Last</span>
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
