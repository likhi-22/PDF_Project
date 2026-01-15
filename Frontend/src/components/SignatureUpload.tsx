import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from './ui/Card'
import Button from './ui/Button'
import { SkeletonCard } from './ui/Skeleton'
import { apiService, ApiError, UploadProgress } from '../services/api'
import { useToast } from './ToastProvider'

interface SignatureUploadProps {
  onSignatureUpload?: (file: File, signatureId: string) => void
}

const SignatureUpload = ({ onSignatureUpload }: SignatureUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'uploading'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [signatureId, setSignatureId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccess, showError, showLoading, dismiss } = useToast()

  const validateImage = (file: File): string | null => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type) && !['.png', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      return 'Please select a PNG or JPEG image file only.'
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return 'Image size must be less than 5MB.'
    }

    if (file.size < 1024) {
      return 'Image seems too small. Please check if it\'s a valid image.'
    }

    return null
  }

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateImage(file)
    if (validationError) {
      setUploadStatus('error')
      setErrorMessage(validationError)
      showError(validationError)
      return
    }

    setUploadedFile(file)
    setUploadStatus('uploading')
    setErrorMessage('')
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 })
    setIsLoading(true)

    const loadingToastId = showLoading(`Uploading signature ${file.name}...`)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setSelectedImage(imageUrl)
      }
      reader.onerror = () => {
        setUploadStatus('error')
        setErrorMessage('Failed to read image file.')
        setIsLoading(false)
        dismiss(loadingToastId)
      }
      reader.readAsDataURL(file)

      const signature = await apiService.uploadSignature(
        file,
        (progress) => {
          setUploadProgress(progress)
        }
      )

      setSignatureId(signature.id)
      setUploadStatus('success')
      setUploadProgress({ loaded: file.size, total: file.size, percentage: 100 })
      
      dismiss(loadingToastId)
      showSuccess(`Signature "${file.name}" uploaded successfully!`)
      onSignatureUpload?.(file, signature.id)
    } catch (error) {
      const apiError = error as ApiError
      const errorMsg = apiError.message || 'Failed to upload signature. Please try again.'
      setUploadStatus('error')
      setErrorMessage(errorMsg)
      setSelectedImage(null)
      
      dismiss(loadingToastId)
      showError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [onSignatureUpload, showSuccess, showError, showLoading, dismiss])

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

  const resetUpload = () => {
    setSelectedImage(null)
    setUploadedFile(null)
    setUploadStatus('idle')
    setErrorMessage('')
    setSignatureId(null)
    setUploadProgress(null)
    setIsLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Loading skeleton
  if (isLoading && uploadStatus === 'uploading' && !uploadProgress) {
    return <SkeletonCard className="w-full" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card variant="elevated" padding="lg" className="w-full">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Signature</h3>
          <p className="text-gray-600">Upload your signature image (PNG or JPEG format)</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Select signature image"
          disabled={uploadStatus === 'uploading'}
        />

        <AnimatePresence mode="wait">
          {!selectedImage ? (
            <motion.div
              key="upload-area"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
              aria-label={uploadStatus === 'idle' ? 'Upload signature image' : 'Upload in progress'}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
                ${uploadStatus === 'idle' ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2' : 'cursor-not-allowed'}
                ${
                  isDragOver
                    ? 'border-primary-500 bg-primary-50 scale-105'
                    : uploadStatus === 'error'
                    ? 'border-error-400 bg-error-50'
                    : 'border-gray-300 bg-gray-50/50 hover:border-primary-400 hover:bg-primary-50/50'
                }
              `}
            >
              {uploadStatus === 'uploading' && uploadProgress ? (
                <div className="space-y-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="mx-auto w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-600"
                    role="status"
                    aria-label="Uploading"
                  />
                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">Uploading {uploadedFile?.name}</p>
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
                    <p className="text-sm text-gray-600 mt-2">{uploadProgress.percentage}%</p>
                  </div>
                </div>
              ) : (
                <>
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mx-auto w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4"
                    aria-hidden="true"
                  >
                    <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </motion.div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG or JPEG (max 5MB)</p>

                  {uploadStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg"
                    >
                      <p className="text-sm text-error-700">{errorMessage}</p>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="preview-area"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border-2 border-gray-200">
                <div className="text-center mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-4">Signature Preview</p>
                  <div className="inline-block p-4 bg-white rounded-lg shadow-soft border border-gray-200">
                    <img
                      src={selectedImage || ''}
                      alt="Signature preview"
                      className="max-w-full max-h-40 object-contain mx-auto"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleBrowseClick}
                  variant="primary"
                  fullWidth
                  disabled={uploadStatus === 'uploading'}
                  aria-label="Change signature image"
                >
                  Change Image
                </Button>
                <Button
                  onClick={resetUpload}
                  variant="ghost"
                  fullWidth
                  disabled={uploadStatus === 'uploading'}
                  aria-label="Remove signature"
                >
                  Remove
                </Button>
              </div>

              {uploadedFile && uploadStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-success-50 border border-success-200 rounded-xl"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-success-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-success-800">Signature uploaded successfully</p>
                      <p className="text-xs text-success-700 mt-1">{uploadedFile.name} • {formatFileSize(uploadedFile.size)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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

export default SignatureUpload
