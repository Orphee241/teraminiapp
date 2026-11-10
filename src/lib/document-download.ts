type FilePickerWindow = Window & {
  showSaveFilePicker?: (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>
}

export async function savePdf(bytes: ArrayBuffer, filename: string, pickerWindow: FilePickerWindow = window) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  if (pickerWindow.showSaveFilePicker) {
    const handle = await pickerWindow.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'Document PDF', accept: { 'application/pdf': ['.pdf'] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'picker' as const
  }
  const originalUrlApi = URL
  const revokeUrl = (value: string) => originalUrlApi.revokeObjectURL(value)
  const url = originalUrlApi.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  revokeUrl(url)
  return 'download' as const
}
