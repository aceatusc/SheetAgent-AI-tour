import type { EnrichedWorkbook } from '../types'

// Use VITE_API_URL when the app is not served behind the Vite proxy (e.g. different host or built app).
// Example: VITE_API_URL=http://127.0.0.1:8000
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/api'

export async function processInstruction(
  instruction: string,
  options?: { workbookPath?: string; file?: File }
): Promise<{ path: string; outputDir: string }> {
  const formData = new FormData()
  formData.append('instruction', instruction)
  if (options?.workbookPath) {
    formData.append('workbook_path', options.workbookPath)
  }
  if (options?.file) {
    formData.append('file', options.file)
  }

  const res = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail?.stderr || err.detail || res.statusText)
  }
  return res.json()
}

export async function getWorkbook(path: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/workbook?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error('Failed to fetch workbook')
  return res.arrayBuffer()
}

export async function getEnrichedWorkbook(path: string): Promise<EnrichedWorkbook> {
  const res = await fetch(`${API_BASE}/workbook/enriched?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error('Failed to fetch enriched workbook')
  return res.json()
}
