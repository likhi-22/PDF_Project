import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

// Create a separate axios instance for media file downloads (without baseURL)
const mediaAxios = axios.create({
  timeout: 120000,
  headers: {
    'Accept': 'application/pdf, image/*',
  },
})

// API Types
export interface Document {
  id: string
  original_pdf: string
  file_size?: number
  page_count?: number
  uploaded_at: string
}

export interface Signature {
  id: string
  image_file: string
  uploaded_at: string
}

export interface SignedDocument {
  id: string
  original_document: string
  signature: string
  signed_pdf: string
  signed_at: string
}

export interface ApiError {
  message: string
  status?: number
  details?: any
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// Create an Axios instance with default configuration
const api: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 120000, // 2 minutes timeout for large file uploads
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens or headers here if needed
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for centralized error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError<any>) => {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: error.response?.status,
      details: error.response?.data,
    }

    if (error.response) {
      // Server responded with error status
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          apiError.message = error.response.data
        } else if (error.response.data.detail) {
          apiError.message = error.response.data.detail
        } else if (error.response.data.message) {
          apiError.message = error.response.data.message
        } else if (error.response.data.error) {
          apiError.message = error.response.data.error
        } else if (error.response.data.non_field_errors) {
          apiError.message = Array.isArray(error.response.data.non_field_errors)
            ? error.response.data.non_field_errors.join(', ')
            : error.response.data.non_field_errors
        } else {
          // Handle validation errors
          const errors = Object.entries(error.response.data)
            .map(([key, value]) => {
              const messages = Array.isArray(value) ? value : [value]
              return `${key}: ${messages.join(', ')}`
            })
            .join('; ')
          if (errors) {
            apiError.message = errors
          }
        }
      }

      // Status-specific messages
      switch (error.response.status) {
        case 400:
          apiError.message = apiError.message || 'Invalid request. Please check your input.'
          break
        case 401:
          apiError.message = 'Unauthorized. Please login again.'
          break
        case 403:
          apiError.message = 'Access forbidden. You do not have permission.'
          break
        case 404:
          apiError.message = 'Resource not found.'
          break
        case 413:
          apiError.message = 'File too large. Please upload a smaller file.'
          break
        case 415:
          apiError.message = 'Unsupported file type. Please upload a valid file.'
          break
        case 500:
          apiError.message = 'Server error. Please try again later.'
          break
        case 503:
          apiError.message = 'Service unavailable. Please try again later.'
          break
      }
    } else if (error.request) {
      // Request made but no response received
      apiError.message = 'Network error. Please check your connection and try again.'
    } else {
      // Something else happened
      apiError.message = error.message || 'An unexpected error occurred'
    }

    return Promise.reject(apiError)
  }
)

// API Service Class
class ApiService {
  /**
   * Upload PDF document
   */
  async uploadPDF(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Document> {
    const formData = new FormData()
    formData.append('original_pdf', file)

    const response = await api.post<Document>('/documents/', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          })
        }
      },
      timeout: 120000, // 2 minutes for large files
    })

    return response.data
  }

  /**
   * Upload signature image
   */
  async uploadSignature(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Signature> {
    const formData = new FormData()
    formData.append('image_file', file)

    const response = await api.post<Signature>('/signatures/', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          })
        }
      },
      timeout: 60000, // 1 minute for signature uploads
    })

    return response.data
  }

  /**
   * Sign PDF document with signature
   */
  async signPDF(
    documentId: string,
    signatureId: string,
    position?: { x: number; y: number }
  ): Promise<SignedDocument> {
    const response = await api.post<SignedDocument>('/signed-documents/', {
      original_document: documentId,
      signature: signatureId,
      ...(position
        ? {
            position_x: position.x,
            position_y: position.y,
          }
        : {}),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 180000, // 3 minutes for signing process
    })

    return response.data
  }

  /**
   * Get signed document details
   */
  async getSignedDocument(id: string): Promise<SignedDocument> {
    const response = await api.get<SignedDocument>(`/signed-documents/${id}/`)
    return response.data
  }

  /**
   * Download signed PDF via API endpoint (FileResponse)
   */
  async downloadSignedDocumentBlob(id: string): Promise<Blob> {
    const response = await api.get(`/signed-documents/${id}/download/`, {
      responseType: 'blob',
    })
    return response.data
  }

  /**
   * Download signed PDF
   * Accepts both relative paths (from Django) and full URLs
   */
  async downloadSignedPDF(signedPdfUrlOrPath: string): Promise<Blob> {
    // Convert relative path to full URL if needed
    const fullUrl = signedPdfUrlOrPath.startsWith('http') 
      ? signedPdfUrlOrPath 
      : this.getMediaUrl(signedPdfUrlOrPath)
    
    // For media files served by Django, we need to fetch directly from the base URL
    // Media files are served at /media/, not /api/media/
    // Use mediaAxios instance without baseURL for absolute URLs
    const response = await mediaAxios.get(fullUrl, {
      responseType: 'blob',
    })

    return response.data
  }

  /**
   * Get full URL for media file
   * Handles both absolute URLs and relative paths from Django
   */
  getMediaUrl(path: string): string {
    // If already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'
    const baseUrlWithoutApi = baseUrl.replace('/api', '')
    
    // If path starts with /media/, use base URL without /api
    if (path.startsWith('/media/')) {
      return `${baseUrlWithoutApi}${path}`
    }
    
    // For relative paths, ensure proper joining
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrlWithoutApi}${cleanPath}`
  }
}

// Export singleton instance
export const apiService = new ApiService()

// Export default axios instance for advanced use cases
export default api
