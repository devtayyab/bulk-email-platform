import api from './api'
import { ParsedRecipient } from './types'

export const fileUploadService = {
  async parseFile(file: File): Promise<{ recipients: ParsedRecipient[] }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/file-upload/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },
}
