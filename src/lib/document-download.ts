type FilePickerHandle = { createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }
type FilePickerWindow = Window & { showSaveFilePicker?: (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<FilePickerHandle> }

export function pickPdfFile(filename: string, pickerWindow: FilePickerWindow = window) {
  return pickerWindow.showSaveFilePicker
    ? pickerWindow.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Document PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
    : null
}

export async function savePdf(bytes: ArrayBuffer, filename: string, handle: FilePickerHandle | null = null) {
  if (!bytes.byteLength) throw new Error('Le PDF reçu est vide.')
  const blob = new Blob([bytes], { type: 'application/pdf' })
  if (handle) {
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'picker' as const
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'download' as const
}
