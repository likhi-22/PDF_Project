import { useRef, useEffect, useState } from 'react'
import PDFUpload from './PDFUpload'
import PDFPreview from './PDFPreview'
import SignatureUpload from './SignatureUpload'
import Skeleton from './Skeleton'
import { useToast } from './ToastProvider'
import { apiService } from '../services/api'

type Step = 'upload' | 'preview' | 'signature' | 'signing' | 'complete'

function PDFSigner() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null)
  const [uploadedSignature, setUploadedSignature] = useState<File | null>(null)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)
  const [signedDocumentId, setSignedDocumentId] = useState<string | null>(null)
  const [signingProgress, setSigningProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { showSuccess, showError, showInfo, showLoading, dismiss } = useToast()
  const signingProgressRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!signingProgressRef.current) return
    signingProgressRef.current.style.setProperty('--progress', String(signingProgress))
  }, [signingProgress])

  const handlePdfUpload = (file: File) => {
    setIsLoading(true)
    setUploadedPdf(file)
    setCurrentStep('preview')
    setError(null)
    showSuccess(`PDF "${file.name}" uploaded successfully!`)
    setTimeout(() => setIsLoading(false), 500) // Simulate brief loading
  }

  const handleSignatureUpload = (file: File) => {
    setUploadedSignature(file)
    setError(null)
    showSuccess(`Signature "${file.name}" uploaded successfully!`)
  }

  const handleSignPdf = async () => {
    if (!uploadedPdf || !uploadedSignature) {
      const errorMsg = 'Please upload both PDF and signature'
      setError(errorMsg)
      showError(errorMsg)
      return
    }

    setCurrentStep('signing')
    setSigningProgress(0)
    setError(null)

    const loadingToastId = showLoading('Processing your document...')

    try {
      // 1. Upload PDF
      setSigningProgress(10)
      const pdfDoc = await apiService.uploadPDF(uploadedPdf, (progress) => {
        setSigningProgress(Math.round(progress.percentage * 0.3)) // 0-30%
      })

      // 2. Upload Signature
      setSigningProgress(40)
      const sigDoc = await apiService.uploadSignature(uploadedSignature, (progress) => {
        setSigningProgress(30 + Math.round(progress.percentage * 0.2)) // 30-50%
      })

      // 3. Sign PDF
      setSigningProgress(60)
      const signedDoc = await apiService.signPDF(pdfDoc.id, sigDoc.id)
      setSigningProgress(80)
      setSignedDocumentId(signedDoc.id)

      // 4. Download Signed PDF for preview/download button
      const blob = await apiService.downloadSignedDocumentBlob(signedDoc.id)
      const pdfUrl = URL.createObjectURL(blob)
      setSignedPdfUrl(pdfUrl)
      setSigningProgress(100)

      dismiss(loadingToastId)
      showSuccess('PDF signed successfully! Ready for download.')
      setCurrentStep('complete')
    } catch (err: any) {
      dismiss(loadingToastId)
      console.error(err)
      const errorMsg = err.message || 'Failed to sign PDF. Please try again.'
      setError(errorMsg)
      showError(errorMsg)
      setCurrentStep('signature')
    }
  }

  const handleDownload = () => {
    if (signedPdfUrl) {
      const link = document.createElement('a')
      link.href = signedPdfUrl
      link.download = `signed_${uploadedPdf?.name || 'document.pdf'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showInfo('Download started! Check your downloads folder.')
    }
  }

  const resetFlow = () => {
    setCurrentStep('upload')
    setUploadedPdf(null)
    setUploadedSignature(null)
    setSignedPdfUrl(null)
    setSignedDocumentId(null)
    setSigningProgress(0)
    setError(null)
    setIsLoading(false)
    showInfo('Started fresh signing session')
  }

  const handleDeleteSignedPdf = async () => {
    if (!signedDocumentId) {
      return
    }

    const confirmed = window.confirm('Are you sure?')
    if (!confirmed) {
      return
    }

    try {
      await apiService.deleteSignedDocument(signedDocumentId)
      if (signedPdfUrl) {
        URL.revokeObjectURL(signedPdfUrl)
      }
      resetFlow()
      showSuccess('Signed PDF deleted successfully.')
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete signed PDF. Please try again.'
      setError(errorMsg)
      showError(errorMsg)
    }
  }

  const getStepIndicator = (step: Step, stepNumber: number) => {
    const steps = ['upload', 'preview', 'signature', 'signing', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    const stepIndex = steps.indexOf(step)

    let status = 'pending'
    if (stepIndex < currentIndex) status = 'completed'
    else if (stepIndex === currentIndex) status = 'current'
    else if (step === 'signing' && currentStep === 'complete') status = 'completed'

    return (
      <div className={`flex items-center ${stepIndex < steps.length - 1 ? 'flex-1' : ''}`}>
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-300 ease-in-out
          ${status === 'completed' ? 'bg-green-500 text-white shadow-lg scale-110' :
            status === 'current' ? 'bg-sky-500 text-white shadow-lg scale-110 animate-pulse' :
            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'}
        `}
        role="status"
        aria-label={`${step === 'upload' ? 'Upload PDF' :
                      step === 'preview' ? 'Preview PDF' :
                      step === 'signature' ? 'Add Signature' :
                      step === 'signing' ? 'Sign PDF' :
                      'Complete'} step ${status}`}
        >
          {status === 'completed' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            stepNumber
          )}
        </div>
        <span className={`ml-3 text-sm font-medium transition-colors duration-300 hidden sm:block ${
          status === 'current' ? 'text-sky-600 dark:text-sky-400' :
          status === 'completed' ? 'text-green-600 dark:text-green-400' :
          'text-slate-500 dark:text-slate-500'
        }`}>
          {step === 'upload' && 'Upload PDF'}
          {step === 'preview' && 'Preview'}
          {step === 'signing' && 'Sign PDF'}
          {step === 'signature' && 'Add Signature'}
          {step === 'complete' && 'Complete'}
        </span>
        {stepIndex < steps.length - 1 && (
          <div className={`flex-1 h-1 mx-4 rounded transition-all duration-500 ease-in-out ${
            stepIndex < currentIndex ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
          }`} />
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {getStepIndicator('upload', 1)}
          {getStepIndicator('preview', 2)}
          {getStepIndicator('signature', 3)}
          {getStepIndicator('signing', 4)}
          {getStepIndicator('complete', 5)}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="space-y-8">
        {currentStep === 'upload' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Sign Your PDF Document</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">Upload a PDF document to get started with the signing process</p>
            </div>
            <PDFUpload onFileUpload={handlePdfUpload} />
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="transition-all duration-500 ease-in-out">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Preview Your Document</h2>
              <p className="text-slate-600 dark:text-slate-400">Review your PDF before adding a signature</p>
            </div>

            {isLoading ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <div className="mb-4">
                  <Skeleton variant="text" className="h-6 w-48 mb-2" />
                  <Skeleton variant="text" className="h-4 w-64" />
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Skeleton variant="circular" width={20} height={20} />
                      <Skeleton variant="text" className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-950 min-h-96 flex items-center justify-center p-8">
                    <div className="text-center">
                      <Skeleton variant="circular" width={64} height={64} className="mx-auto mb-4" />
                      <Skeleton variant="text" className="h-6 w-48 mb-2" />
                      <Skeleton variant="text" className="h-4 w-64" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <PDFPreview file={uploadedPdf} />
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                aria-label="Go back to upload step"
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={() => setCurrentStep('signature')}
                className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transform hover:scale-105"
                aria-label="Continue to signature step"
              >
                Continue to Signature
                <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {currentStep === 'signature' && (
          <div className="transition-all duration-500 ease-in-out">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Add Your Signature</h2>
              <p className="text-slate-600 dark:text-slate-400">Upload or select a signature image to sign your document</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="order-2 lg:order-1">
                <PDFPreview file={uploadedPdf} />
              </div>
              <div className="order-1 lg:order-2">
                <SignatureUpload onSignatureUpload={handleSignatureUpload} />
                {uploadedSignature && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fade-in">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-800 dark:text-green-200 text-sm font-medium">Signature uploaded successfully</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep('preview')}
                className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                aria-label="Go back to preview step"
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={handleSignPdf}
                disabled={!uploadedSignature}
                className="px-8 py-3 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transform hover:scale-105 disabled:transform-none font-semibold"
                aria-label="Sign the PDF document"
              >
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Sign PDF
              </button>
            </div>
          </div>
        )}

        {currentStep === 'signing' && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sky-600 mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Signing Your PDF</h2>
                <p className="text-slate-600 dark:text-slate-400">Please wait while we process your document...</p>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                <div
                  ref={signingProgressRef}
                  className="progress-bar bg-sky-600 h-2 rounded-full transition-all duration-300"
                />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{signingProgress}% complete</p>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="transition-all duration-500 ease-in-out">
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="mb-8 animate-fade-in">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">PDF Signed Successfully!</h2>
                  <p className="text-slate-600 dark:text-slate-400">Your document has been signed and is ready for download</p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6 shadow-sm">
                  <div className="flex items-center justify-center space-x-4">
                    <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <div className="text-left">
                      <p className="font-medium text-slate-900 dark:text-slate-100">signed_{uploadedPdf?.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Ready for download • {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={handleDownload}
                    className="px-8 py-3 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transform hover:scale-105 font-semibold flex items-center"
                    aria-label="Download the signed PDF document"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Signed PDF
                  </button>
                  <button
                    onClick={handleDeleteSignedPdf}
                    disabled={!signedDocumentId}
                    className="px-6 py-3 border border-red-300 dark:border-red-600 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Delete the signed PDF document"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a3 3 0 013-3h0a3 3 0 013 3v2m-7 0h8m-9 2h10l-1 11H8L7 9z" />
                    </svg>
                    Delete Signed PDF
                  </button>
                  <button
                    onClick={resetFlow}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 flex items-center"
                    aria-label="Start over and sign another PDF document"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sign Another PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PDFSigner
