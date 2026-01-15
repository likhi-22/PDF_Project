import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PDFUpload from '../PDFUpload'
import SignatureUpload from '../SignatureUpload'
import PDFPreview from '../PDFPreview'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useToast } from '../ToastProvider'
import { apiService, ApiError, SignedDocument } from '../../services/api'

type Step = 'upload' | 'signature' | 'preview' | 'signing' | 'complete'

interface ApplicationSectionProps {
  sectionRef: React.RefObject<HTMLDivElement | null>
}

const ApplicationSection = ({ sectionRef }: ApplicationSectionProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null)
  const [uploadedSignature, setUploadedSignature] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [signatureId, setSignatureId] = useState<string | null>(null)
  const [signedDocument, setSignedDocument] = useState<SignedDocument | null>(null)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)
  const [signingProgress, setSigningProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [signaturePosition, setSignaturePosition] = useState<{ x: number; y: number } | null>(null)
  const [history, setHistory] = useState<
    { id: string; fileName: string; signedAt: string; signedPdf: string; fileSizeBytes?: number | null }[]
  >([])
  const signingProgressRef = useRef<HTMLDivElement | null>(null)

  const { showSuccess, showError, showLoading, dismiss } = useToast()

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) {
      return '—'
    }
    const kb = bytes / 1024
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`
    }
    const mb = kb / 1024
    return `${mb.toFixed(2)} MB`
  }

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pdf-signer-history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  useEffect(() => {
    if (!signingProgressRef.current) {
      return
    }

    const progressValue = Math.min(100, Math.round(signingProgress))
    signingProgressRef.current.style.setProperty('--signing-progress', String(progressValue))
  }, [signingProgress])

  const handlePdfUpload = useCallback((file: File, docId: string) => {
    setUploadedPdf(file)
    setDocumentId(docId)
    setCurrentStep('signature')
    setError(null)
  }, [])

  const handleSignatureUpload = useCallback((file: File, sigId: string) => {
    setUploadedSignature(file)
    setSignatureId(sigId)
    setError(null)
    setCurrentStep('preview')
  }, [])

  const handleSignPdf = useCallback(async () => {
    if (!documentId || !signatureId || !uploadedSignature) {
      const errorMsg = 'Please upload both PDF and signature'
      setError(errorMsg)
      showError(errorMsg)
      return
    }

    setCurrentStep('signing')
    setSigningProgress(0)
    setError(null)
    setIsSigning(true)

    const loadingToastId = showLoading('Signing your PDF document... This may take a moment for large files.')

    try {
      // Progress: preparing request
      setSigningProgress(10)

      // Call API to sign PDF with optional position
      const positionPayload = signaturePosition ? { x: signaturePosition.x, y: signaturePosition.y } : undefined
      const signedDoc = await apiService.signPDF(documentId, signatureId, positionPayload)

      setSigningProgress(70)

      // Download blob for preview
      const blob = await apiService.downloadSignedDocumentBlob(signedDoc.id)
      const pdfUrl = window.URL.createObjectURL(blob)
      setSignedDocument(signedDoc)
      setSignedPdfUrl(pdfUrl)
      setSigningProgress(100)

      // Update in-memory and persisted history
      const entry = {
        id: signedDoc.id,
        fileName: uploadedPdf?.name || 'Document.pdf',
        signedAt: signedDoc.signed_at || new Date().toISOString(),
        signedPdf: signedDoc.signed_pdf,
        fileSizeBytes: uploadedPdf?.size ?? null,
      }
      setHistory((prev) => {
        const next = [entry, ...prev]
        localStorage.setItem('pdf-signer-history', JSON.stringify(next))
        return next
      })

      dismiss(loadingToastId)
      showSuccess('PDF signed successfully! Ready for download.')
      setCurrentStep('complete')
    } catch (err) {
      const apiError = err as ApiError
      const errorMsg = apiError.message || 'Failed to sign PDF. Please try again.'
      setError(errorMsg)
      showError(errorMsg)
      setCurrentStep('preview')
      dismiss(loadingToastId)
    } finally {
      setIsSigning(false)
    }
  }, [documentId, signatureId, uploadedSignature, uploadedPdf, showSuccess, showError, showLoading, dismiss])

  const handleDownload = useCallback(async () => {
    if (!signedDocument || !uploadedPdf) {
      showError('No signed document available for download')
      return
    }

    const loadingToastId = showLoading('Preparing download...')
    try {
      const blob = await apiService.downloadSignedDocumentBlob(signedDocument.id)

      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      if (pdfBlob.size === 0) {
        throw new Error('Downloaded file is empty.')
      }

      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `signed_${uploadedPdf.name || 'document.pdf'}`
      link.setAttribute('aria-label', 'Download signed PDF')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      dismiss(loadingToastId)
      showSuccess('Download started! Check your downloads folder.')
    } catch (err) {
      dismiss(loadingToastId)
      const apiError = err as ApiError
      showError(apiError.message || 'Failed to download signed PDF. Please try again.')
    }
  }, [signedDocument, uploadedPdf, showSuccess, showError, showLoading, dismiss])

  const resetFlow = useCallback(() => {
    setCurrentStep('upload')
    setUploadedPdf(null)
    setUploadedSignature(null)
    setDocumentId(null)
    setSignatureId(null)
    setSignedDocument(null)
    setSignedPdfUrl(null)
    setSigningProgress(0)
    setError(null)
    setIsSigning(false)
  }, [])

  // Check if we can proceed to signing (also read uploadedSignature to satisfy linter)
  const canSign = useMemo(() => {
    return documentId !== null && signatureId !== null && uploadedSignature !== null && !isSigning
  }, [documentId, signatureId, uploadedSignature, isSigning])

  const activeStepIndex = useMemo(() => {
    switch (currentStep) {
      case 'upload':
        return 0
      case 'signature':
        return 1
      case 'preview':
        return 2
      case 'signing':
      case 'complete':
        return 3
      default:
        return 0
    }
  }, [currentStep])

  const stepsConfig = useMemo(
    () => [
      {
        label: 'Upload PDF',
        stepLabel: 'Step 1',
        isComplete: !!documentId,
      },
      {
        label: 'Upload signature',
        stepLabel: 'Step 2',
        isComplete: !!signatureId,
      },
      {
        label: 'Preview',
        stepLabel: 'Step 3',
        isComplete: !!uploadedPdf && !!uploadedSignature,
      },
      {
        label: 'Sign & download',
        stepLabel: 'Step 4',
        isComplete: currentStep === 'complete',
      },
    ],
    [currentStep, documentId, signatureId, uploadedPdf, uploadedSignature]
  )

  return (
    <section
      id="app"
      ref={sectionRef}
      className="space-y-8 scroll-mt-28"
    >
      <div className="space-y-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Dashboard · Signing steps
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            {stepsConfig.map((step, index) => {
              const isActive = index === activeStepIndex
              const isComplete = step.isComplete
              return (
                <div
                  key={step.stepLabel}
                  className={[
                    'flex items-center rounded-full border px-3 py-1 text-[11px] font-medium',
                    isActive
                      ? 'border-sky-400 bg-sky-500/20 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.55)]'
                      : isComplete
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-700 bg-slate-900/80 text-slate-400',
                  ].join(' ')}
                >
                  <span className="mr-2 text-[10px] uppercase tracking-wide">
                    {step.stepLabel}
                  </span>
                  <span>{step.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-4 flex items-center justify-center space-x-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 shadow-[0_0_30px_rgba(56,189,248,0.7)]">
              <svg className="h-6 w-6 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-sky-300">
                Signing workflow
              </p>
              <h2 className="text-left text-base font-semibold text-slate-50 sm:text-lg">
                PDF Signer · Professional PDF Signing Made Simple
              </h2>
            </div>
          </motion.div>
          <p className="mx-auto max-w-2xl text-sm text-slate-300 sm:text-base">
            Upload your PDF and signature image, choose a position once, and apply it automatically to every page before downloading the final signed document.
          </p>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-auto mb-8 max-w-4xl"
            >
              <Card variant="outlined" padding="md" className="border-red-500/70 bg-red-900/40">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 flex-shrink-0 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-red-50">{error}</p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-8">
          <section id="upload-pdf">
            <Card variant="elevated" padding="lg" className="w-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-50">Step 1 · Upload PDF</h3>
                <p className="text-sm text-slate-300">Choose your PDF document to start the signing workflow.</p>
              </div>
              <PDFUpload onFileUpload={handlePdfUpload} />
            </Card>
          </section>

          <section
            id="upload-signature"
            className={!documentId ? 'pointer-events-none opacity-40 transition-opacity' : 'transition-opacity'}
          >
            <Card variant="elevated" padding="lg" className="w-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-50">Step 2 · Upload signature</h3>
                <p className="text-sm text-slate-300">Add your signature image to apply on the document.</p>
              </div>
              <SignatureUpload onSignatureUpload={handleSignatureUpload} />
            </Card>
          </section>

          <section
            id="pdf-preview"
            className={uploadedPdf && uploadedSignature ? 'transition-opacity' : 'pointer-events-none opacity-40 transition-opacity'}
          >
            <Card variant="elevated" padding="lg" className="w-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-50">Step 3 · Preview</h3>
                <p className="text-sm text-slate-300">Review pages and pick the signature position on the first page.</p>
              </div>
              <div className="mx-auto w-full max-w-5xl">
                <PDFPreview
                  file={uploadedPdf}
                  signedPdfUrl={signedPdfUrl}
                  selectedPosition={signaturePosition}
                  onPositionSelect={(x, y) => {
                    setSignaturePosition({ x, y })
                  }}
                />
              </div>
            </Card>
          </section>

          <section
            id="sign-and-download"
            className={canSign || currentStep === 'signing' || currentStep === 'complete' ? 'transition-opacity' : 'pointer-events-none opacity-40 transition-opacity'}
          >
            <Card variant="elevated" padding="lg" className="w-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-50">Step 4 · Sign & download</h3>
                <p className="text-sm text-slate-300">Apply the signature to every page and download the signed PDF.</p>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Tip: Click the first page in preview to set signature position. That relative position is used for all pages.
                </p>
                {uploadedSignature && (
                  <p className="text-xs text-slate-300">
                    Signature: <span className="font-medium">{uploadedSignature.name}</span>
                  </p>
                )}
                {currentStep === 'signing' && (
                  <div className="mt-2">
                    <div className="h-2 w-full rounded bg-slate-800">
                      <div ref={signingProgressRef} className="signing-progress-bar h-2 rounded bg-sky-500 transition-all" />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Signing progress: {Math.min(100, Math.round(signingProgress))}%
                    </p>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    variant="primary"
                    onClick={handleSignPdf}
                    disabled={!canSign || isSigning}
                    isLoading={isSigning}
                    fullWidth
                    aria-label={canSign ? 'Sign PDF document' : 'Please upload PDF and signature to sign'}
                  >
                    {isSigning ? 'Signing...' : 'Sign PDF ✍️'}
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleDownload}
                    fullWidth
                    aria-label="Download signed PDF document"
                    disabled={!signedDocument}
                  >
                    Download Signed PDF
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Status:{' '}
                  <span className="font-medium">
                    {currentStep === 'signing'
                      ? 'In progress'
                      : currentStep === 'complete'
                      ? 'Completed'
                      : canSign
                      ? 'Ready to sign'
                      : 'Waiting for uploads'}
                  </span>
                </p>
                <div className="mt-2">
                  <Button variant="ghost" size="md" onClick={resetFlow} aria-label="Start new signing session">
                    New Signing Session
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        </div>

        <section id="history" className="mt-10">
          <Card variant="elevated" padding="lg" className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-50">Signing History</h3>
                <p className="text-sm text-slate-300">
                  Recent documents signed in this session. Stored locally in your browser.
                </p>
              </div>
              <div className="text-xs text-slate-400">
                {history.length}{' '}
                {history.length === 1 ? 'document' : 'documents'}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">File name</th>
                    <th className="py-2 pr-4">Signed at</th>
                    <th className="py-2 pr-4">Size</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-slate-400">
                        No signed documents yet. Sign your first PDF to see it here.
                      </td>
                    </tr>
                  )}
                  {history.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="max-w-xs truncate py-3 pr-4">{entry.fileName}</td>
                      <td className="py-3 pr-4 text-xs text-slate-400">
                        {new Date(entry.signedAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-400">
                        {formatFileSize(entry.fileSizeBytes)}
                      </td>
                      <td className="py-3 pr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const blob = await apiService.downloadSignedDocumentBlob(entry.id)
                              const url = window.URL.createObjectURL(blob)
                              const link = document.createElement('a')
                              link.href = url
                              link.download = `signed_${entry.fileName || 'document.pdf'}`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                              window.URL.revokeObjectURL(url)
                            } catch (err) {
                              const apiError = err as ApiError
                              showError(apiError.message || 'Failed to download signed PDF from history.')
                            }
                          }}
                        >
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </section>
  )
}

export default ApplicationSection
