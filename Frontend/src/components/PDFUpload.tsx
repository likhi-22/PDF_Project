import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from './ui/Card'
import Button from './ui/Button'
import { SkeletonUploadArea } from './ui/Skeleton'
import { apiService, ApiError, UploadProgress } from '../services/api'
import { useToast } from './ToastProvider'

interface PDFUploadProps {
  onFileUpload?: (file: File, documentId: string) => void
}

const PDFUpload = ({ onFileUpload }: PDFUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccess, showError, showLoading, dismiss } = useToast()

  const validateFile = (file: File): string | null => {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Please select a PDF file only.'
    }

    const maxSize = 200 * 1024 * 1024 // 200MB
    if (file.size > maxSize) {
      return 'File size must be less than 200MB.'
    }

    if (file.size < 1024) {
      return 'File seems too small. Please check if it\'s a valid PDF.'
    }

    return null
  }

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadStatus('error')
      setErrorMessage(validationError)
      showError(validationError)
      return
    }

    setUploadedFile(file)
    setUploadStatus('uploading')
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 })
    setErrorMessage('')
    setIsLoading(true)

    const loadingToastId = showLoading(`Uploading ${file.name}...`)

    try {
      const document = await apiService.uploadPDF(
        file,
        (progress) => {
          setUploadProgress(progress)
        }
      )

      setDocumentId(document.id)
      setUploadStatus('success')
      setUploadProgress({ loaded: file.size, total: file.size, percentage: 100 })
      
      dismiss(loadingToastId)
      showSuccess(`PDF "${file.name}" uploaded successfully!`)
      
      // Call callback with file and document ID
      setTimeout(() => {
        onFileUpload?.(file, document.id)
      }, 500)
    } catch (error) {
      const apiError = error as ApiError
      const errorMsg = apiError.message || 'Failed to upload PDF. Please try again.'
      setUploadStatus('error')
      setErrorMessage(errorMsg)
      setUploadProgress(null)
      
      dismiss(loadingToastId)
      showError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [onFileUpload, showSuccess, showError, showLoading, dismiss])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleBrowseClick = () => {
    if (uploadStatus !== 'uploading') {
      fileInputRef.current?.click()
    }
  }

  const resetUpload = () => {
    setUploadedFile(null)
    setUploadProgress(null)
    setUploadStatus('idle')
    setErrorMessage('')
    setDocumentId(null)
    setIsLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Loading skeleton
  if (isLoading && uploadStatus === 'uploading' && !uploadProgress) {
    return <SkeletonUploadArea />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card variant="elevated" padding="lg" className="w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Upload PDF Document</h2>
          <p className="text-lg text-gray-600">Drag and drop your PDF file here or click to browse</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Select PDF file"
          disabled={uploadStatus === 'uploading'}
        />

        {/* Upload Area */}
        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={uploadStatus === 'idle' ? handleBrowseClick : undefined}
          whileHover={uploadStatus === 'idle' ? { scale: 1.01 } : {}}
          whileTap={uploadStatus === 'idle' ? { scale: 0.99 } : {}}
          role="button"
          tabIndex={uploadStatus === 'idle' ? 0 : -1}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && uploadStatus === 'idle') {
              e.preventDefault()
              handleBrowseClick()
            }
          }}
          aria-label={uploadStatus === 'idle' ? 'Upload PDF file' : 'Upload in progress'}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
            ${uploadStatus === 'idle' ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2' : 'cursor-not-allowed'}
            ${
              isDragOver
                ? 'border-primary-500 bg-primary-50 scale-105'
                : uploadStatus === 'error'
                ? 'border-error-400 bg-error-50'
                : uploadStatus === 'success'
                ? 'border-success-400 bg-success-50'
                : 'border-gray-300 bg-gray-50/50 hover:border-primary-400 hover:bg-primary-50/50'
            }
          `}
        >
          <AnimatePresence mode="wait">
            {uploadStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mx-auto w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </motion.div>
                <div>
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    Drop your PDF file here
                  </p>
                  <p className="text-gray-500 mb-4">or</p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleBrowseClick()
                    }}
                    variant="primary"
                    aria-label="Browse for PDF file"
                  >
                    Browse Files
                  </Button>
                  <p className="text-sm text-gray-500 mt-4">
                    Supports PDF files up to 200MB • 200+ pages
                  </p>
                </div>
              </motion.div>
            )}

            {uploadStatus === 'uploading' && uploadProgress && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="mx-auto w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-600"
                  aria-label="Uploading"
                  role="status"
                />
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Uploading {uploadedFile?.name}
                  </p>
                  <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress.percentage}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                      aria-valuenow={uploadProgress.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      role="progressbar"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {uploadProgress.percentage}% • {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
                  </p>
                </div>
              </motion.div>
            )}

            {uploadStatus === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mx-auto w-16 h-16 rounded-full bg-success-100 flex items-center justify-center"
                  aria-label="Upload successful"
                >
                  <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <div>
                  <p className="text-lg font-semibold text-success-700 mb-2">Upload Successful!</p>
                  <p className="text-sm text-gray-600">{uploadedFile?.name}</p>
                  <p className="text-sm text-gray-500 mt-2">Processing document...</p>
                </div>
              </motion.div>
            )}

            {uploadStatus === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-error-100 flex items-center justify-center" aria-label="Upload failed">
                  <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-error-700 mb-2">Upload Failed</p>
                  <p className="text-sm text-error-600 mb-4">{errorMessage}</p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      resetUpload()
                    }}
                    variant="danger"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* File Info */}
        {uploadedFile && uploadStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-error-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-error-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default PDFUpload
