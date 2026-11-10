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
    expect(click).toHaveBeenCalledOnce()
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
  it('asks Telegram for its native PDF download popup using an HTTPS signed URL', async () => {
    const downloadFile = vi.fn()
    Object.defineProperty(window, 'Telegram', { configurable: true, value: { WebApp: { downloadFile, isVersionAtLeast: () => true } } })
    const fetchTelegram = vi.fn((input: RequestInfo | URL, options?: RequestInit) => Promise.resolve(
      options?.method === 'POST'
        ? new Response(JSON.stringify({ url: `${window.location.origin}/api/documents/72/pdf?download_ticket=signed&owner_telegram_id=123` }), { status: 200 })
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
    expect(params.url).toBe(`${window.location.origin}/api/documents/72/pdf?download_ticket=signed&owner_telegram_id=123`)
    delete (window as Window & { Telegram?: unknown }).Telegram
  })
})
