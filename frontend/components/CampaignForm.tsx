'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { campaignService } from '@/lib/campaignService'
import { fileUploadService } from '@/lib/fileUploadService'
import { ParsedRecipient } from '@/lib/types'
import { Upload, X, Mail, User, FileText } from 'lucide-react'
import * as React from 'react'

interface FormData {
  name: string
  subject: string
  body: string
}

export default function CampaignForm() {
  const [recipients, setRecipients] = useState<ParsedRecipient[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>()

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await fileUploadService.parseFile(file)
      setRecipients(result.recipients)
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('Error parsing file. Please check the file format.')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file: File = files[0] as File
      if (file && file.type === 'text/csv' || file.name.endsWith('.csv') ||
          file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        handleFileUpload(file)
      } else {
        alert('Please upload a CSV or Excel file')
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0] as File)
    }
  }

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: FormData) => {
    if (recipients.length === 0) {
      alert('Please upload a file with recipients')
      return
    }

    setSubmitting(true)
    try {
      await campaignService.createCampaign({
        name: data.name,
        subject: data.subject,
        body: data.body,
        recipients,
      })

      alert('Campaign created successfully!')
      reset()
      setRecipients([])
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Create New Campaign
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Campaign Name
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name', { required: 'Campaign name is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Email Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  {...register('subject', { required: 'Subject is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                  Email Body
                </label>
                <textarea
                  id="body"
                  rows={6}
                  {...register('body', { required: 'Body is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your email content here. You can use placeholders like {{name}} for personalization."
                />
                {errors.body && (
                  <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Use placeholders like {'{{name}}'}, {'{{email}}'} for personalization
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Recipients (CSV or Excel)
              </label>
              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                  dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileInput}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    CSV or Excel files up to 10MB
                  </p>
                  {uploading && (
                    <p className="text-sm text-indigo-600">Processing file...</p>
                  )}
                </div>
              </div>
            </div>

            {recipients.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Recipients ({recipients.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setRecipients([])}
                    className="text-sm text-red-600 hover:text-red-500"
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {recipients.slice(0, 10).map((recipient, index) => (
                      <li key={index} className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {recipient.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRecipient(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                    {recipients.length > 10 && (
                      <li className="px-4 py-2 text-sm text-gray-500 text-center">
                        ... and {recipients.length - 10} more recipients
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  reset()
                  setRecipients([])
                }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting || recipients.length === 0}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
