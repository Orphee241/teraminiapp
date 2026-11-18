import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TeraDocCenter from './TeraDocCenter'
import { pickPdfFile, savePdf } from '../../lib/document-download'

vi.mock('./PdfViewer', () => ({ default: ({ title, pdfData }: { title: string; pdfData?: Uint8Array }) => <div aria-label={title} data-testid="pdf-preview" data-byte-count={pdfData?.byteLength || 0} /> }))
vi.mock('../../lib/document-download', () => ({ pickPdfFile: vi.fn(async () => null), savePdf: vi.fn(async () => 'download') }))

const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('TeraDoc A4 live preview and download', () => {
  it('downloads the exact server-rendered PDF from the preview, not a separate form action', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdfBytes, { status: 200, headers: { 'content-type': 'application/pdf' } })))
    render(<TeraDocCenter initData="telegram-init-data" onClose={vi.fn()} />)
    const preview = screen.getByLabelText('Prévisualisation du CV')
    const download = screen.getByRole('button', { name: 'Télécharger le CV' })
    expect(preview).toContainElement(download)
    expect(download).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Télécharger le PDF' })).not.toBeInTheDocument()

    const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp(label, 'i')), { target: { value } })
    fireEvent.change(screen.getByPlaceholderText('Ex. Aline Mba'), { target: { value: 'Aline Mba' } })
    fill('Titre professionnel', 'Responsable administrative')
    fill('Email', 'aline@example.com')
    fill('Téléphone', '+241 06000000')
    fill('Ville / pays', 'Libreville')
    fill('Résumé professionnel', 'Professionnelle expérimentée.')
    fill('Poste', 'Responsable')
    fill('Entreprise', 'Entreprise Test')
    fill('Date de début', '2021-01')
    fill('Description', 'Coordination des opérations.')
    fill('Diplôme / formation', 'Licence')
    fill('Établissement', 'Université Test')
    fill('Compétences', 'Organisation, Excel')

    await waitFor(() => expect(screen.getByTestId('pdf-preview')).toHaveAttribute('data-byte-count', String(pdfBytes.byteLength)), { timeout: 3000 })
    const readyDownload = screen.getByRole('button', { name: 'Télécharger le CV' })
    expect(readyDownload).toBeEnabled()
    fireEvent.click(readyDownload)
    await waitFor(() => expect(savePdf).toHaveBeenCalledTimes(1))
    expect(savePdf).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'teradoc-cv.pdf', null)
  })
})
