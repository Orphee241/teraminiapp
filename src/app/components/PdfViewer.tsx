'use client'

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

let workerConfigured = false

export default function PdfViewer({ src, title, initData }: { src: string; title: string; initData: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!workerConfigured) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      workerConfigured = true
    }
    const render = async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext('2d')
      if (!context) return
      setState('loading')
      setError('')
      context.clearRect(0, 0, canvas.width, canvas.height)
      try {
        const response = await fetch(src, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
        if (!response.ok) throw new Error(`PDF indisponible (${response.status})`)
        const bytes = await response.arrayBuffer()
        if (!bytes.byteLength) throw new Error('Le PDF reçu est vide.')
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1 })
        const scale = Math.max(1, Math.min(2, (canvas.parentElement?.clientWidth || viewport.width) / viewport.width))
        const scaled = page.getViewport({ scale })
        canvas.width = Math.ceil(scaled.width)
        canvas.height = Math.ceil(scaled.height)
        await page.render({ canvasContext: context, viewport: scaled }).promise
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
  }, [src, initData])

  return <div className="pdf-viewer" aria-label={title} aria-busy={state === 'loading'}>
    {state === 'loading' && <p className="pdf-status">Chargement de l’aperçu…</p>}
    {state === 'error' && <p className="pdf-status pdf-error">{error}</p>}
    <canvas ref={canvasRef} />
  </div>
}
