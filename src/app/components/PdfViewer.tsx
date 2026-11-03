'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

let workerConfigured = false
const pdfPromiseCache = new Map<string, Promise<any>>()
const PDF_CACHE_LIMIT = 8

export default function PdfViewer({ src, title, initData }: { src: string; title: string; initData: string }) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)

  useEffect(() => {
    let cancelled = false

    const render = async () => {
      const canvas = canvasRef.current
      const container = viewerRef.current
      if (!canvas || !container) return
      const context = canvas.getContext('2d')
      if (!context) return
      setState('loading')
      setError('')
      context.clearRect(0, 0, canvas.width, canvas.height)
      try {
        const cacheKey = `${src}\u0000${initData}`
        let pdfPromise = pdfPromiseCache.get(cacheKey) || null
        if (!pdfPromise) {
          pdfPromise = (async () => {
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
            if (!workerConfigured) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
              workerConfigured = true
            }
            const response = await fetch(src, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
            if (!response.ok) throw new Error(`PDF indisponible (${response.status})`)
            const bytes = await response.arrayBuffer()
            if (!bytes.byteLength) throw new Error('Le PDF reçu est vide.')
            return pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
          })()
          pdfPromiseCache.set(cacheKey, pdfPromise)
          while (pdfPromiseCache.size > PDF_CACHE_LIMIT) {
            const oldestKey = pdfPromiseCache.keys().next().value
            if (oldestKey) pdfPromiseCache.delete(oldestKey)
            else break
          }
        }
        const pdf = await pdfPromise
        if (cancelled) return
        const totalPages = Math.max(1, Number(pdf.numPages) || 1)
        setPageCount(totalPages)
        const safePage = Math.min(page, totalPages)
        if (safePage !== page) {
          setPage(safePage)
          return
        }
        const pageData = await pdf.getPage(safePage)
        const baseViewport = pageData.getViewport({ scale: 1 })
        const availableWidth = Math.max(280, container.clientWidth - 24)
        const cssScale = availableWidth / baseViewport.width
        // Keep the PDF sharp on Retina/high-density screens. The canvas backing
        // store is larger than its CSS size, so text does not look pixelated.
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3)
        const renderViewport = pageData.getViewport({ scale: cssScale * pixelRatio })
        const cssViewport = pageData.getViewport({ scale: cssScale })
        canvas.width = Math.ceil(renderViewport.width)
        canvas.height = Math.ceil(renderViewport.height)
        canvas.style.width = `${Math.ceil(cssViewport.width)}px`
        canvas.style.height = `${Math.ceil(cssViewport.height)}px`
        await pageData.render({ canvasContext: context, viewport: renderViewport }).promise
        if (!cancelled) setState('ready')
      } catch (reason) {
        pdfPromiseCache.delete(`${src}\u0000${initData}`)
        if (!cancelled) {
          setState('error')
          setError(reason instanceof Error ? reason.message : 'Impossible de prévisualiser ce document.')
        }
      }
    }

    void render()
    return () => { cancelled = true }
  }, [src, initData, expanded, page])

  const goToPage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(pageCount, nextPage)))
  }

  return <div ref={viewerRef} className={`pdf-viewer${expanded ? ' pdf-viewer-expanded' : ''}`} aria-label={title} aria-busy={state === 'loading'}>
    <div className="pdf-toolbar" role="navigation" aria-label="Navigation des pages PDF">
      <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1 || state === 'loading'} aria-label="Page précédente">‹</button>
      <span aria-live="polite">Page {page} / {pageCount}</span>
      <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= pageCount || state === 'loading'} aria-label="Page suivante">›</button>
    </div>
    <button className="pdf-fullscreen" type="button" onClick={() => setExpanded(value => !value)} aria-label={expanded ? 'Réduire l’aperçu' : 'Afficher le PDF en plein écran'} title={expanded ? 'Réduire' : 'Plein écran'}>
      {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
    {state === 'loading' && <div className="pdf-loading" role="status" aria-live="polite"><span className="pdf-spinner" aria-hidden="true" /><span className="pdf-loading-label">Chargement de l’aperçu…</span></div>}
    {state === 'error' && <p className="pdf-status pdf-error">{error}</p>}
    <canvas ref={canvasRef} />
  </div>
}
