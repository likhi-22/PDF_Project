import { useState, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from './ui/Card'
import Button from './ui/Button'
import { useToast } from './ToastProvider'
import { apiService } from '../services/api'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure PDF.js worker to match the pdf.js API version used by react-pdf
const defaultWorkerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
const apiVersion = (pdfjs as any)?.version as string | undefined
pdfjs.GlobalWorkerOptions.workerSrc = apiVersion
  ? `https://unpkg.com/pdfjs-dist@${apiVersion}/build/pdf.worker.min.mjs`
  : defaultWorkerSrc

interface SignatureBox {
  x: number
  y: number
  width: number
  height: number
}

interface PDFPreviewProps {
  file: File | null
  signedPdfUrl?: string | null
  onError?: (error: Error) => void
  onPositionSelect?: (x: number, y: number) => void
  selectedPosition?: { x: number; y: number } | null
  placementMode?: boolean
  zoom?: number
  signatureImageUrl?: string | null
  signatureBox?: SignatureBox | null
  onSignatureBoxChange?: (box: SignatureBox | null, options?: { pushHistory?: boolean }) => void
}

const PDFPreview = memo(function PDFPreview({
  file,
  signedPdfUrl,
  onError,
  onPositionSelect,
  selectedPosition,
  placementMode,
  zoom,
  signatureImageUrl,
  signatureBox,
  onSignatureBoxChange,
}: PDFPreviewProps) {
  const { showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const firstPageContainerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    mode: 'move' | 'resize' | null
    pointerId: number | null
    startX: number
    startY: number
    startBox: SignatureBox | null
  } | null>(null)

  useEffect(() => {
    if (file && !signedPdfUrl) {
      setLoading(true)
      setError(null)
      const url = URL.createObjectURL(file)
      setPdfUrl(url)

      // Simulate loading
      const timer = setTimeout(() => {
        setLoading(false)
      }, 300)

      return () => {
        clearTimeout(timer)
        URL.revokeObjectURL(url)
      }
    } else if (signedPdfUrl) {
      setLoading(true)
      setError(null)
      // If signedPdfUrl is a relative path, convert it to full URL.
      // Blob URLs (blob:...) and absolute http(s) URLs are used as-is.
      const fullUrl =
        signedPdfUrl.startsWith('http://') ||
        signedPdfUrl.startsWith('https://') ||
        signedPdfUrl.startsWith('blob:')
          ? signedPdfUrl
          : apiService.getMediaUrl(signedPdfUrl)
      setPdfUrl(fullUrl)
      
      // Simulate loading for signed PDF
      const timer = setTimeout(() => {
        setLoading(false)
      }, 500)

      return () => {
        clearTimeout(timer)
      }
    } else {
      setPdfUrl(null)
      setLoading(false)
    }
  }, [file, signedPdfUrl])

  useEffect(() => {
    if (!loading) {
      return
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 4000)

    return () => {
      clearTimeout(safetyTimer)
    }
  }, [loading])

  useEffect(() => {
    if (!firstPageContainerRef.current) {
      return
    }

    if (!selectedPosition) {
      firstPageContainerRef.current.style.removeProperty('--marker-x')
      firstPageContainerRef.current.style.removeProperty('--marker-y')
      return
    }

    firstPageContainerRef.current.style.setProperty('--marker-x', String(selectedPosition.x))
    firstPageContainerRef.current.style.setProperty('--marker-y', String(selectedPosition.y))
  }, [selectedPosition])

  const clamp = (value: number, min: number, max: number) => {
    if (value < min) return min
    if (value > max) return max
    return value
  }

  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (!onPositionSelect && !(placementMode && onSignatureBoxChange)) {
      return
    }

    if (pageIndex !== 0) {
      showError('Hey! Signature positioning should be done only on the first page.')
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    if (placementMode && onSignatureBoxChange) {
      const defaultWidth = 0.25
      const defaultHeight = 0.12
      const boxX = clamp(x - defaultWidth / 2, 0, 1 - defaultWidth)
      const boxY = clamp(y - defaultHeight / 2, 0, 1 - defaultHeight)

      const box: SignatureBox = {
        x: Number(boxX.toFixed(4)),
        y: Number(boxY.toFixed(4)),
        width: Number(defaultWidth.toFixed(4)),
        height: Number(defaultHeight.toFixed(4)),
      }

      onSignatureBoxChange(box, { pushHistory: true })
    }

    if (onPositionSelect) {
      onPositionSelect(Number(x.toFixed(4)), Number(y.toFixed(4)))
    }
  }

  const handleSignaturePointerDown = (event: React.PointerEvent<HTMLDivElement>, mode: 'move' | 'resize') => {
    if (!placementMode || !signatureBox || !firstPageContainerRef.current) {
      return
    }

    event.stopPropagation()
    event.preventDefault()

    const pointerId = event.pointerId

    dragStateRef.current = {
      mode,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startBox: signatureBox,
    }

    event.currentTarget.setPointerCapture(pointerId)
  }

  const handleSignaturePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || !dragState.mode || !dragState.startBox || !firstPageContainerRef.current || !onSignatureBoxChange) {
      return
    }

    const rect = firstPageContainerRef.current.getBoundingClientRect()
    const deltaX = (event.clientX - dragState.startX) / rect.width
    const deltaY = (event.clientY - dragState.startY) / rect.height

    const currentBox = dragState.startBox

    if (dragState.mode === 'move') {
      const x = clamp(currentBox.x + deltaX, 0, 1 - currentBox.width)
      const y = clamp(currentBox.y + deltaY, 0, 1 - currentBox.height)

      onSignatureBoxChange(
        {
          ...currentBox,
          x,
          y,
        },
        { pushHistory: false },
      )
    } else if (dragState.mode === 'resize') {
      const minWidth = 0.05
      const minHeight = 0.03

      const width = clamp(currentBox.width + deltaX, minWidth, 1 - currentBox.x)
      const height = clamp(currentBox.height + deltaY, minHeight, 1 - currentBox.y)

      onSignatureBoxChange(
        {
          ...currentBox,
          width,
          height,
        },
        { pushHistory: false },
      )
    }
  }

  const handleSignaturePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || !dragState.mode || !onSignatureBoxChange || !signatureBox) {
      dragStateRef.current = null
      return
    }

    if (dragState.pointerId !== null) {
      try {
        event.currentTarget.releasePointerCapture(dragState.pointerId)
      } catch {
        // Ignore if pointer capture is not set
      }
    }

    onSignatureBoxChange(signatureBox, { pushHistory: true })
    dragStateRef.current = null
  }

  if (!file && !signedPdfUrl) {
    return (
      <Card variant="elevated" padding="lg" className="text-center min-h-[480px] flex items-center justify-center">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-6"
        >
          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </motion.div>
          <p className="text-lg font-semibold text-slate-50 mb-2">No PDF Selected</p>
          <p className="text-slate-300">Upload a PDF document to preview it here</p>
      </Card>
    )
  }

  const fileName = file?.name || 'Document.pdf'
  const displayFile = file || null

  const effectiveZoom = zoom ?? 1

  // Source for react-pdf: File object for local, URL for signed
  const pdfSource = signedPdfUrl ? pdfUrl || signedPdfUrl : file || pdfUrl || undefined

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-rose-900/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-50 text-sm truncate max-w-xs">{fileName}</h3>
              <p className="text-xs text-slate-400">
                {displayFile && `${(displayFile.size / 1024 / 1024).toFixed(2)} MB`}
                {signedPdfUrl && ' • Signed Document'}
              </p>
            </div>
          </div>
          {signedPdfUrl && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-3 py-1 bg-emerald-900/40 text-emerald-200 text-xs font-semibold rounded-full flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Signed</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative bg-slate-950 min-h-[640px] flex items-center justify-center p-4 md:p-6 rounded-b-2xl">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="mx-auto w-12 h-12 rounded-full border-4 border-sky-200 border-t-sky-500"
              />
              <p className="text-slate-300 font-medium">Loading PDF preview...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-rose-900/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-50 mb-2">Failed to load PDF</p>
                <p className="text-sm text-slate-300 mb-4">{error}</p>
                <Button
                  onClick={() => {
                    setError(null)
                    setLoading(true)
                  }}
                  variant="primary"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          ) : pdfSource ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center"
            >
              <div className="bg-white dark:bg-secondary-950 rounded-lg shadow-large border border-slate-800 dark:border-secondary-700 p-2 md:p-4 max-w-full max-h-[720px] overflow-auto">
                <Document
                  file={pdfSource}
                  onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages)
                    setError(null)
                  }}
                  onLoadError={(err) => {
                    const message = err instanceof Error ? err.message : 'Failed to load PDF'
                    setError(message)
                    onError?.(err as Error)
                  }}
                  loading={null}
                >
                  <div className="space-y-4">
                    {Array.from(new Array(numPages || 0), (_el, index) => {
                      const isFirstPage = index === 0
                      return (
                      <div
                        key={`page_${index + 1}`}
                        ref={isFirstPage ? firstPageContainerRef : undefined}
                        className="relative border border-slate-300 dark:border-secondary-700 rounded-md overflow-hidden bg-gray-50 dark:bg-secondary-900"
                        onClick={(event) => handlePageClick(event, index)}
                      >
                        <Page
                          pageNumber={index + 1}
                          width={Math.round(820 * effectiveZoom)}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                          loading=""
                        />
                        {signatureImageUrl && signatureBox && (
                          <div
                            className={isFirstPage ? 'absolute cursor-move' : 'absolute pointer-events-none'}
                            style={{
                              left: `${signatureBox.x * 100}%`,
                              top: `${signatureBox.y * 100}%`,
                              width: `${signatureBox.width * 100}%`,
                              height: `${signatureBox.height * 100}%`,
                            }}
                            onPointerDown={isFirstPage ? (event) => handleSignaturePointerDown(event, 'move') : undefined}
                            onPointerMove={isFirstPage ? handleSignaturePointerMove : undefined}
                            onPointerUp={isFirstPage ? handleSignaturePointerUp : undefined}
                          >
                            <img
                              src={signatureImageUrl}
                              alt="Signature preview"
                              className="h-full w-full select-none"
                              draggable={false}
                            />
                            {isFirstPage && (
                              <div
                                className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded-full bg-sky-500"
                                onPointerDown={(event) => handleSignaturePointerDown(event, 'resize')}
                              />
                            )}
                          </div>
                        )}
                        {isFirstPage && selectedPosition && !signatureBox && (
                          <div className="absolute w-3 h-3 rounded-full bg-sky-500 ring-2 ring-white/80 shadow-soft pdf-preview-marker" />
                        )}
                      </div>
                    )})}
                  </div>
                </Document>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-50 mb-2">PDF Preview</p>
                <p className="text-sm text-slate-300">Your document preview will appear here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
})

PDFPreview.displayName = 'PDFPreview'

export default PDFPreview
