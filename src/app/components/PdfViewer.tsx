'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

let workerConfigured = false

export default function PdfViewer({ src, title, initData }: { src: string; title: string; initData: string }) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

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
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        if (!workerConfigured) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
          workerConfigured = true
        }
        const response = await fetch(src, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
        if (!response.ok) throw new Error(`PDF indisponible (${response.status})`)
        const bytes = await response.arrayBuffer()
        if (!bytes.byteLength) throw new Error('Le PDF reçu est vide.')
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        const baseViewport = page.getViewport({ scale: 1 })
        const availableWidth = Math.max(280, container.clientWidth - 24)
        const cssScale = availableWidth / baseViewport.width
        // Keep the PDF sharp on Retina/high-density screens. The canvas backing
        // store is larger than its CSS size, so text does not look pixelated.
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3)
        const renderViewport = page.getViewport({ scale: cssScale * pixelRatio })
        const cssViewport = page.getViewport({ scale: cssScale })
        canvas.width = Math.ceil(renderViewport.width)
        canvas.height = Math.ceil(renderViewport.height)
        canvas.style.width = `${Math.ceil(cssViewport.width)}px`
        canvas.style.height = `${Math.ceil(cssViewport.height)}px`
        await page.render({ canvasContext: context, viewport: renderViewport }).promise
        if (!cancelled) setState('ready')
      } catch (reason) {
        if (!cancelled) {
          setState('error')
          setError(reason instanceof Error ? reason.message : 'Impossible de prévisualiser ce document.')
        }
      }
    }

    void render()
    return () => { cancelled = true }
  }, [src, initData, expanded])

  return <div ref={viewerRef} className={`pdf-viewer${expanded ? ' pdf-viewer-expanded' : ''}`} aria-label={title} aria-busy={state === 'loading'}>
    <button className="pdf-fullscreen" type="button" onClick={() => setExpanded(value => !value)} aria-label={expanded ? 'Réduire l’aperçu' : 'Afficher le PDF en plein écran'} title={expanded ? 'Réduire' : 'Plein écran'}>
      {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
    {state === 'loading' && <p className="pdf-status">Chargement de l’aperçu…</p>}
    {state === 'error' && <p className="pdf-status pdf-error">{error}</p>}
    <canvas ref={canvasRef} />
  </div>
}
