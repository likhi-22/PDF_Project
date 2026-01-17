import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PDFUpload from '../PDFUpload'
import SignatureUpload from '../SignatureUpload'
import PDFPreview from '../PDFPreview'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { useToast } from '../ToastProvider'
import { apiService, ApiError } from '../../services/api'
import { PDFDocument } from 'pdf-lib'

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
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)
  const [signedDocumentId, setSignedDocumentId] = useState<string | null>(null)
  const [signedBlob, setSignedBlob] = useState<Blob | null>(null)
  const [signingProgress, setSigningProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [signaturePosition, setSignaturePosition] = useState<{ x: number; y: number } | null>(null)
  const [placementMode, setPlacementMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null)
  const [signatureBoxState, setSignatureBoxState] = useState<{
    history: { x: number; y: number; width: number; height: number }[]
    index: number
  }>({ history: [], index: -1 })
  const [hasSignedOnce, setHasSignedOnce] = useState(false)
  const signingProgressRef = useRef<HTMLDivElement | null>(null)

  const { showSuccess, showError, showLoading, dismiss } = useToast()

  const autoSignTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!signingProgressRef.current) {
      return
    }

    const progressValue = Math.min(100, Math.round(signingProgress))
    signingProgressRef.current.style.setProperty('--signing-progress', String(progressValue))
  }, [signingProgress])

  const currentSignatureBox = useMemo(() => {
    if (signatureBoxState.index < 0) {
      return null
    }
    return signatureBoxState.history[signatureBoxState.index] || null
  }, [signatureBoxState])

  const handlePdfUpload = useCallback((file: File, docId: string) => {
    setUploadedPdf(file)
    setDocumentId(docId)
    setCurrentStep('signature')
    setError(null)
    setSignedPdfUrl(null)
    setSignedBlob(null)
    setSignedDocumentId(null)
    setHasSignedOnce(false)
  }, [])

  const handleSignatureUpload = useCallback((file: File, sigId: string) => {
    setUploadedSignature(file)
    setSignatureId(sigId)
    setError(null)
    setCurrentStep('preview')
    setSignatureBoxState({ history: [], index: -1 })
    setSignaturePosition(null)
    setPlacementMode(true)
    setSignedPdfUrl(null)
    setSignedBlob(null)
    setSignedDocumentId(null)
    setHasSignedOnce(false)
    if (signaturePreviewUrl) {
      window.URL.revokeObjectURL(signaturePreviewUrl)
    }
    setSignaturePreviewUrl(window.URL.createObjectURL(file))
    const defaultWidth = 0.25
    const defaultHeight = 0.12
    const defaultBox = {
      x: Number(((1 - defaultWidth) / 2).toFixed(4)),
      y: Number(((1 - defaultHeight) / 2).toFixed(4)),
      width: Number(defaultWidth.toFixed(4)),
      height: Number(defaultHeight.toFixed(4)),
    }
    setSignatureBoxState({ history: [defaultBox], index: 0 })
  }, [])

  const updateSignatureBox = useCallback(
    (box: { x: number; y: number; width: number; height: number } | null, pushHistory: boolean) => {
      setSignatureBoxState((prev) => {
        if (!box) {
          return { history: [], index: -1 }
        }

        const normalizedBox = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        }

        if (pushHistory) {
          const truncated = prev.history.slice(0, prev.index + 1)
          truncated.push(normalizedBox)
          return {
            history: truncated,
            index: truncated.length - 1,
          }
        }

        if (prev.history.length === 0 || prev.index < 0) {
          return {
            history: [normalizedBox],
            index: 0,
          }
        }

        const updated = [...prev.history]
        updated[prev.index] = normalizedBox
        return {
          history: updated,
          index: prev.index,
        }
      })

      if (!box) {
        setSignaturePosition(null)
      } else {
        setSignaturePosition({
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
        })
      }
    },
    [],
  )

  // Removed Add/Undo/Redo handlers per flow restructure

  useEffect(() => {
    const box = currentSignatureBox
    if (!box) {
      setSignaturePosition(null)
      return
    }

    setSignaturePosition({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    })
  }, [currentSignatureBox])

  const handleSignPdf = useCallback(async () => {
    if (hasSignedOnce) {
      return
    }
    if (!documentId || !signatureId || !uploadedSignature || !uploadedPdf || !currentSignatureBox) {
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
      // Freeze current preview state as single source of truth
      setSigningProgress(10)
      const pdfBytes = await uploadedPdf.arrayBuffer()
      const sigBytes = await uploadedSignature.arrayBuffer()
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const isPng = uploadedSignature.type.includes('png')
      const sigImage = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes)
      setSigningProgress(45)

      const box = currentSignatureBox
      if (!box) {
        throw new Error('Signature position is not set.')
      }

      // Apply the same normalized box to all pages (synchronized)
      const pages = pdfDoc.getPages()
      for (const page of pages) {
        const { width: pageWidth, height: pageHeight } = page.getSize()
        const drawWidth = box.width * pageWidth
        const drawHeight = box.height * pageHeight
        const topY = box.y * pageHeight
        const leftX = box.x * pageWidth
        // Convert top-left (preview coords) to bottom-left (pdf-lib coords)
        const drawX = leftX
        const drawY = pageHeight - topY - drawHeight
        page.drawImage(sigImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        })
      }

      setSigningProgress(80)
      const stampedBytes = await pdfDoc.save()
      const buf = new ArrayBuffer(stampedBytes.byteLength)
      const view = new Uint8Array(buf)
      view.set(stampedBytes)
      const blob = new Blob([buf], { type: 'application/pdf' })
      const pdfUrl = window.URL.createObjectURL(blob)
      setSignedBlob(blob)
      setSignedPdfUrl(pdfUrl)

      try {
        const signedDoc = await apiService.signPDF(documentId, signatureId, signaturePosition || undefined)
        setSignedDocumentId(signedDoc.id)
      } catch (apiErr) {
        console.error(apiErr)
      }

      setSigningProgress(100)

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
  }, [documentId, signatureId, uploadedSignature, uploadedPdf, showSuccess, showError, showLoading, dismiss, hasSignedOnce, currentSignatureBox, signaturePosition])

  const handleStampPdf = useCallback(() => {
    if (!documentId || !signatureId || !uploadedSignature || !currentSignatureBox || isSigning || hasSignedOnce) {
      return
    }
    if (autoSignTimeoutRef.current) {
      clearTimeout(autoSignTimeoutRef.current)
    }
    void handleSignPdf()
  }, [documentId, signatureId, uploadedSignature, currentSignatureBox, isSigning, hasSignedOnce, handleSignPdf])

  const handleDownload = useCallback(async () => {
    if (!signedBlob || !uploadedPdf) {
      showError('No signed document available for download')
      return
    }

    const loadingToastId = showLoading('Preparing download...')
    try {
      const url = window.URL.createObjectURL(signedBlob)
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
  }, [signedBlob, uploadedPdf, showSuccess, showError, showLoading, dismiss])

  const handleDeleteSignedPdf = useCallback(async () => {
    if (!signedDocumentId) {
      return
    }

    const confirmed = window.confirm('Are you sure?')
    if (!confirmed) {
      return
    }

    const loadingToastId = showLoading('Deleting signed PDF...')
    try {
      await apiService.deleteSignedDocument(signedDocumentId)

      if (signedPdfUrl) {
        window.URL.revokeObjectURL(signedPdfUrl)
      }
      if (signaturePreviewUrl) {
        window.URL.revokeObjectURL(signaturePreviewUrl)
      }

      setSignedPdfUrl(null)
      setSignedBlob(null)
      setSignedDocumentId(null)
      setUploadedPdf(null)
      setUploadedSignature(null)
      setDocumentId(null)
      setSignatureId(null)
      setSignaturePosition(null)
      setSignatureBoxState({ history: [], index: -1 })
      setZoom(1)
      setCurrentStep('upload')
      setError(null)
      setHasSignedOnce(false)

      dismiss(loadingToastId)
      showSuccess('Signed PDF deleted successfully.')
    } catch (err) {
      dismiss(loadingToastId)
      const apiError = err as ApiError
      showError(apiError.message || 'Failed to delete signed PDF. Please try again.')
    }
  }, [signedDocumentId, signedPdfUrl, signaturePreviewUrl, showLoading, dismiss, showSuccess, showError])

  // Removed resetFlow (unused)

  // Check if we can proceed to signing (also read uploadedSignature to satisfy linter)
  // Removed canSign (unused)

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
        return 2
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
          <p className="mx-auto max-w-2xl text-sm text-slate-200 sm:text-base">
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
                <p className="text-sm text-slate-200">Choose your PDF document to start the signing workflow.</p>
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
                <p className="text-sm text-slate-200">Add your signature image to apply on the document.</p>
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
                <p className="text-sm text-slate-200">Review pages and pick the signature position on the first page.</p>
              </div>
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2" />
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-200">Zoom</span>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    value={Math.round(zoom * 100)}
                    onChange={(event) => {
                      const value = Number(event.target.value) / 100
                      setZoom(value)
                    }}
                    className="h-1 w-40 cursor-pointer rounded-full bg-slate-700 accent-sky-500"
                    aria-label="Zoom PDF preview"
                  />
                </div>
              </div>
              <div className="mx-auto w-full max-w-5xl">
                <PDFPreview
                  file={uploadedPdf}
                  selectedPosition={signaturePosition}
                  onPositionSelect={(x, y) => {
                    setSignaturePosition({ x, y })
                  }}
                  placementMode={placementMode}
                  zoom={zoom}
                  signatureImageUrl={signaturePreviewUrl}
                  signatureBox={currentSignatureBox}
                  onSignatureBoxChange={(box, options) => {
                    updateSignatureBox(box, options?.pushHistory ?? true)
                  }}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStampPdf}
                  aria-label="Stamp PDF with current signature position"
                  disabled={!uploadedPdf || !uploadedSignature || !currentSignatureBox || isSigning || hasSignedOnce}
                >
                  Stamp PDF
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleDownload}
                  aria-label="Download signed PDF document"
                  disabled={!signedPdfUrl}
                >
                  Download Signed PDF
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleDeleteSignedPdf}
                  aria-label="Delete signed PDF document"
                  disabled={!signedBlob || !signedDocumentId}
                >
                  Delete Signed PDF
                </Button>
              </div>
            </Card>
          </section>

          {/* Step 4 removed per flow restructure */}
        </div>

        {/* History section removed */}
      </div>
    </section>
  )
}

export default ApplicationSection
