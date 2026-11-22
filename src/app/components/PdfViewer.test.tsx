import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import PdfViewer from './PdfViewer'

const fetchMock = vi.fn(() => Promise.resolve(new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 })))
const renderPage = vi.fn(() => Promise.resolve())

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
    numPages: 3,
      getPage: () => Promise.resolve({
        getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
        render: renderPage,
      }),
    }),
  }),
}))

describe('PdfViewer responsive preview', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    renderPage.mockClear()
  })

  it('does not create a navigable PDF page when downloading on mobile', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 360 })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<PdfViewer src="/api/documents/mobile/pdf" title="CV mobile" initData="telegram-init-data" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Télécharger le document' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le document' }))
    await waitFor(() => expect(click).toHaveBeenCalledOnce())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('reuses the downloaded PDF when switching between compact and fullscreen views', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 640 })

    render(<PdfViewer src="/api/documents/42/pdf" title="DEV-42" initData="telegram-init-data" />)
    const viewer = screen.getByLabelText('DEV-42')
    await waitFor(() => expect(viewer).toHaveAttribute('aria-busy', 'false'))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /plein écran/i }))
    await waitFor(() => expect(viewer).toHaveAttribute('aria-busy', 'false'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(renderPage).toHaveBeenCalledTimes(2)
  })
  it('navigates through every page without downloading the PDF again', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 640 })

    render(<PdfViewer src="/api/documents/long/pdf" title="FAC-983DB7" initData="telegram-init-data" />)
    await waitFor(() => expect(screen.getByText('Page 1 / 3')).toBeInTheDocument())
    const next = screen.getByRole('button', { name: 'Page suivante' })
    await fireEvent.click(next)
    await waitFor(() => expect(screen.getByText('Page 2 / 3')).toBeInTheDocument())
    await fireEvent.click(next)
    await waitFor(() => expect(screen.getByText('Page 3 / 3')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('downloads the protected PDF with the Telegram authentication header', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 640 })
    const createObjectURL = vi.fn(() => 'blob:document')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<PdfViewer src="/api/documents/downloadable/pdf" title="DEV-20261107-3AD8BB" initData="telegram-init-data" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Télécharger le document' })).toBeEnabled())
    await fireEvent.click(screen.getByRole('button', { name: 'Télécharger le document' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect((fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>)[1][1]).toEqual({ headers: { 'x-telegram-init-data': 'telegram-init-data' }, cache: 'no-store' })
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalled()
    expect((createObjectURL.mock.calls as unknown as Array<[Blob]>)[0][0].size).toBe(4)
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })
  it('opens the desktop picker before fetching and writes all bytes before closing', async () => {
    const events: string[] = []
    const write = vi.fn(async (blob: Blob) => { events.push('write'); expect(blob.size).toBe(4); expect(blob.type).toBe('application/pdf') })
    const close = vi.fn(async () => { events.push('close') })
    const picker = vi.fn(() => { events.push('picker'); return Promise.resolve({ createWritable: async () => ({ write, close }) }) })
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker })
    vi.stubGlobal('fetch', vi.fn(async () => { events.push('fetch'); return new Response(new Uint8Array([37, 80, 68, 70])) }))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    render(<PdfViewer src="/api/documents/picker/pdf" title="DEV-picker" initData="telegram-init-data" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Télécharger le document' })).toBeEnabled())
    events.length = 0
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le document' }))
    expect(events[0]).toBe('picker')
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(events).toEqual(['picker', 'fetch', 'write', 'close'])
    delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker
  })
  it('uses Telegram native download whenever the host exposes it, even without a version helper', async () => {
    const downloadFile = vi.fn()
    Object.defineProperty(window, 'Telegram', { configurable: true, value: { WebApp: { downloadFile } } })
    const fetchTelegram = vi.fn((input: RequestInfo | URL, options?: RequestInit) => Promise.resolve(
      options?.method === 'POST'
        ? new Response(JSON.stringify({ url: 'https://b2.example/private.pdf?X-Amz-Signature=signed&response-content-disposition=attachment' }), { status: 200 })
        : new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 }),
    ))
    vi.stubGlobal('fetch', fetchTelegram)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    render(<PdfViewer src="/api/documents/73/pdf" title="DEV-73" initData="telegram-init-data" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Télécharger le document' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le document' }))
    await waitFor(() => expect(downloadFile).toHaveBeenCalledOnce())
    expect(fetchTelegram).toHaveBeenCalledWith('/api/documents/73/pdf', expect.objectContaining({ method: 'POST' }))
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('asks Telegram for its native PDF download popup using an HTTPS signed URL', async () => {
    const downloadFile = vi.fn()
    Object.defineProperty(window, 'Telegram', { configurable: true, value: { WebApp: { downloadFile, isVersionAtLeast: () => true } } })
    const fetchTelegram = vi.fn((input: RequestInfo | URL, options?: RequestInit) => Promise.resolve(
      options?.method === 'POST'
        ? new Response(JSON.stringify({ url: 'https://b2.example/private.pdf?X-Amz-Signature=signed&response-content-disposition=attachment' }), { status: 200 })
        : new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 }),
    ))
    vi.stubGlobal('fetch', fetchTelegram)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 640 })
    render(<PdfViewer src="/api/documents/72/pdf" title="DEV-72" initData="telegram-init-data" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Télécharger le document' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le document' }))
    await waitFor(() => expect(downloadFile).toHaveBeenCalledOnce())
    expect(fetchTelegram).toHaveBeenCalledWith('/api/documents/72/pdf', expect.objectContaining({ method: 'POST', headers: { 'x-telegram-init-data': 'telegram-init-data' } }))
    const params = downloadFile.mock.calls[0][0]
    expect(params.file_name).toBe('DEV-72.pdf')
    expect(params.url).toBe('https://b2.example/private.pdf?X-Amz-Signature=signed&response-content-disposition=attachment')
    delete (window as Window & { Telegram?: unknown }).Telegram
  })

  it('places the Telegram mobile action before the viewer controls', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 640 })

    render(<PdfViewer src="teradoc-live:mobile-actions" title="CV mobile actions" initData="telegram-init-data" pdfData={new Uint8Array([37, 80, 68, 70])} mobileAction={<button type="button">Télécharger le CV</button>} />)
    const viewer = screen.getByLabelText('CV mobile actions')
    await waitFor(() => expect(viewer).toHaveAttribute('aria-busy', 'false'))

    const shell = viewer.parentElement
    expect(shell).toHaveClass('pdf-viewer-shell')
    const telegramAction = screen.getByRole('button', { name: 'Télécharger le CV' })
    const fullscreen = screen.getByRole('button', { name: /plein écran/i })
    expect(viewer.compareDocumentPosition(telegramAction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(telegramAction.compareDocumentPosition(fullscreen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(shell?.querySelector('.pdf-mobile-action')).toContainElement(telegramAction)
    expect(shell?.querySelector('.pdf-actions')).toContainElement(fullscreen)
  })

  it('keeps the exit control in an always-visible fixed action bar while expanded on every viewport', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 360 })
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

    render(<PdfViewer src="teradoc-live:expanded-exit" title="CV expanded" initData="telegram-init-data" pdfData={new Uint8Array([37, 80, 68, 70])} mobileAction={<button type="button">Télécharger le CV</button>} />)
    await waitFor(() => expect(screen.getByLabelText('CV expanded')).toHaveAttribute('aria-busy', 'false'))
    fireEvent.click(screen.getByRole('button', { name: /plein écran/i }))

    const exit = screen.getByRole('button', { name: 'Réduire l’aperçu' })
    expect(exit).toBeVisible()
    expect(exit.closest('.pdf-actions')).toHaveClass('pdf-actions-expanded')
    expect(screen.getByRole('button', { name: 'Télécharger le CV' })).toBeInTheDocument()
    expect(css).toMatch(/\.pdf-actions-expanded\s*\{[^}]*position:\s*fixed[^}]*inset/)
    expect(css).not.toMatch(/\.pdf-viewer-shell-expanded\s+\.pdf-actions\s*\{[^}]*position:\s*static/)
    expect(css).toMatch(/\.pdf-actions-expanded\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*110/)
    expect(css).toMatch(/\.pdf-actions:not\(\.pdf-actions-expanded\)\s*\{[^}]*position:\s*static/)

    fireEvent.click(exit)
    expect(screen.getByRole('button', { name: /plein écran/i })).toBeVisible()
  })

  it('defines the mobile action stack without changing desktop control positioning', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(css).toMatch(/\.pdf-viewer-shell\s*\{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.pdf-actions\s*\{[^}]*position:\s*absolute/)
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)[^{]*\{[\s\S]*?\.pdf-actions(?::not\(\.pdf-actions-expanded\))?\s*\{[^}]*position:\s*static/)
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.pdf-mobile-action\s*\{[\s\S]*?\.pdf-actions(?::not\(\.pdf-actions-expanded\))?\s*\{/)
  })

  it('renders the supplied server preview bytes directly and can hide the internal downloader', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 640 })
    render(<PdfViewer src="teradoc-live:1" title="CV A4" initData="telegram-init-data" pdfData={new Uint8Array([37, 80, 68, 70])} hideDownload />)
    await waitFor(() => expect(screen.getByLabelText('CV A4')).toHaveAttribute('aria-busy', 'false'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Télécharger le document' })).not.toBeInTheDocument()
    expect(renderPage).toHaveBeenCalledOnce()
  })
})
