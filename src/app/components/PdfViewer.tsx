'use client'

import { useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

let workerConfigured = false

export default function PdfViewer({ src, title }: { src: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
      const loadingTask = pdfjsLib.getDocument({ url: src, withCredentials: true })
      try {
        const pdf = await loadingTask.promise
        if (cancelled) return
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1 })
        const scale = Math.max(1, Math.min(2, (canvas.parentElement?.clientWidth || viewport.width) / viewport.width))
        const scaled = page.getViewport({ scale })
        canvas.width = Math.ceil(scaled.width)
        canvas.height = Math.ceil(scaled.height)
        await page.render({ canvasContext: context, viewport: scaled }).promise
      } catch {
        if (!cancelled) context.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    void render()
    return () => { cancelled = true }
  }, [src])

  return <div className="pdf-viewer" aria-label={title}><canvas ref={canvasRef} /></div>
}
