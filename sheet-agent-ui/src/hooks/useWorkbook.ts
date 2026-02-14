import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import type { EnrichedWorkbook, CFRule, TableDef } from '../types'

export interface WorkbookState {
  sheetNames: string[]
  activeSheetIndex: number
  sheets: Record<string, (string | number | null)[][]>
  conditionalFormatting: Record<string, CFRule[]>
  tables: Record<string, TableDef[]>
  charts: Record<string, unknown[]>
  chartImages: Record<string, string>
}

const emptyState: WorkbookState = {
  sheetNames: [],
  activeSheetIndex: 0,
  sheets: {},
  conditionalFormatting: {},
  tables: {},
  charts: {},
  chartImages: {},
}

export function useWorkbook() {
  const [state, setState] = useState<WorkbookState>(emptyState)
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const lastFileRef = useRef<File | null>(null)

  const loadFromFile = useCallback((file: File) => {
    lastFileRef.current = file
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      if (!data || typeof data !== 'object') return
      const wb = XLSX.read(data as ArrayBuffer, { type: 'array' })
      const sheetNames = wb.SheetNames
      const sheets: Record<string, (string | number | null)[][]> = {}
      for (const name of sheetNames) {
        const sheet = wb.Sheets[name]
        const arr = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: null,
        }) as unknown as (string | number | null)[][]
        sheets[name] = arr
      }
      setState({
        sheetNames,
        activeSheetIndex: 0,
        sheets,
        conditionalFormatting: {},
        tables: {},
        charts: {},
        chartImages: {},
      })
      setCurrentPath(null)
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const getLastFile = useCallback(() => lastFileRef.current, [])

  const loadEnriched = useCallback((data: EnrichedWorkbook, path?: string | null) => {
    lastFileRef.current = null
    setState({
      sheetNames: data.sheetNames,
      activeSheetIndex: 0,
      sheets: data.sheets,
      conditionalFormatting: data.conditionalFormatting || {},
      tables: data.tables || {},
      charts: data.charts || {},
      chartImages: data.chartImages || {},
    })
    setCurrentPath(path ?? null)
  }, [])

  const loadFromPath = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/workbook/enriched?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: EnrichedWorkbook = await res.json()
      loadEnriched(data, path)
    } catch {
      const res = await fetch(`/api/workbook?path=${encodeURIComponent(path)}`)
      if (!res.ok) throw new Error('Failed to fetch workbook')
      const buf = await res.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheetNames = wb.SheetNames
      const sheets: Record<string, (string | number | null)[][]> = {}
      for (const name of sheetNames) {
        const sheet = wb.Sheets[name]
        const arr = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: null,
        }) as unknown as (string | number | null)[][]
        sheets[name] = arr
      }
      setState({
        sheetNames,
        activeSheetIndex: 0,
        sheets,
        conditionalFormatting: {},
        tables: {},
        charts: {},
        chartImages: {},
      })
      setCurrentPath(path)
    }
  }, [loadEnriched])

  const setActiveSheetIndex = useCallback((index: number) => {
    setState((s) => ({ ...s, activeSheetIndex: Math.max(0, Math.min(index, s.sheetNames.length - 1)) }))
  }, [])

  const updateSheetData = useCallback((sheetName: string, data: (string | number | null)[][]) => {
    setState((s) => ({ ...s, sheets: { ...s.sheets, [sheetName]: data } }))
  }, [])

  const clearWorkbook = useCallback(() => {
    setState(emptyState)
    setCurrentPath(null)
    lastFileRef.current = null
  }, [])

  const activeSheetName = state.sheetNames[state.activeSheetIndex] ?? ''
  const activeSheetData = state.sheets[activeSheetName] ?? [[]]

  return {
    ...state,
    activeSheetName,
    activeSheetData,
    currentPath,
    loadFromFile,
    loadEnriched,
    loadFromPath,
    setActiveSheetIndex,
    updateSheetData,
    clearWorkbook,
    getLastFile,
  }
}
