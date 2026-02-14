import { useRef, useCallback } from 'react'
import { HotTable } from '@handsontable/react'
import type { HotTableClass } from '@handsontable/react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'
import type { CFRule } from '../../types'

function colToLetter(col: number): string {
  let s = ''
  while (col >= 0) {
    s = String.fromCharCode((col % 26) + 65) + s
    col = Math.floor(col / 26) - 1
  }
  return s
}

function parseRange(rangeStr: string): { minRow: number; minCol: number; maxRow: number; maxCol: number } | null {
  const m = rangeStr.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i)
  if (!m) return null
  const colFromChar = (s: string) => {
    let n = 0
    for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64)
    return n - 1
  }
  const minCol = colFromChar(m[1].toUpperCase())
  const minRow = parseInt(m[2], 10) - 1
  let maxCol = minCol
  let maxRow = minRow
  if (m[3] && m[4]) {
    maxCol = colFromChar(m[3].toUpperCase())
    maxRow = parseInt(m[4], 10) - 1
  }
  return { minRow, minCol, maxRow, maxCol }
}

function evalSimpleFormula(formula: string, cellValue: unknown): boolean {
  if (!formula || typeof cellValue === 'undefined' || cellValue === null) return false
  const num = Number(cellValue)
  if (Number.isNaN(num)) return false
  const m = formula.match(/([A-Z]+\d+)\s*([<>!=]+)\s*([\d.]+)/i)
  if (!m) return false
  const op = m[2].replace(/=/g, '==').replace(/<>/g, '!=')
  try {
    return new Function(`return ${num} ${op} ${parseFloat(m[3])}`)()
  } catch {
    return false
  }
}

interface SpreadsheetGridProps {
  data: (string | number | null)[][]
  conditionalFormatting: CFRule[]
  tables: { ref: string }[]
  onDataChange?: (data: (string | number | null)[][]) => void
  onSelectionChange?: (cell: { row: number; col: number; value: unknown }) => void
}

export function SpreadsheetGrid({
  data,
  conditionalFormatting,
  tables,
  onDataChange,
  onSelectionChange,
}: SpreadsheetGridProps) {
  const hotRef = useRef<HotTableClass | null>(null)
  const cfRef = useRef(conditionalFormatting)
  const tablesRef = useRef(tables)
  cfRef.current = conditionalFormatting
  tablesRef.current = tables

  const customRenderer = useCallback((instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: unknown, cellProperties: Handsontable.CellProperties) => {
    Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties)
    const styles: React.CSSProperties = {}
    for (const rule of cfRef.current) {
      const r = parseRange(rule.range)
      if (!r) continue
      if (row >= r.minRow && row <= r.maxRow && col >= r.minCol && col <= r.maxCol) {
        if (evalSimpleFormula(rule.formula, value)) {
          if (rule.fill) styles.backgroundColor = rule.fill
          if (rule.fontColor) styles.color = rule.fontColor
          break
        }
      }
    }
    for (const t of tablesRef.current) {
      const r = parseRange(t.ref)
      if (!r) continue
      if (row >= r.minRow && row <= r.maxRow && col >= r.minCol && col <= r.maxCol) {
        if (row === r.minRow) styles.fontWeight = 'bold'
        else if ((row - r.minRow) % 2 === 1) styles.backgroundColor = styles.backgroundColor || 'rgba(255,255,255,0.03)'
        break
      }
    }
    Object.assign((td as HTMLElement).style, styles)
  }, [])

  const cells = useCallback(
    (_row: number, _col: number, _prop: string | number) => {
      return { renderer: customRenderer } as Handsontable.CellProperties
    },
    [customRenderer]
  )

  const handleAfterChange = useCallback(
    (_changes: Handsontable.CellChange[] | null) => {
      if (!_changes || !onDataChange || !hotRef.current) return
      const hot = hotRef.current?.hotInstance ?? null
      if (!hot) return
      const newData = hot.getData() as (string | number | null)[][]
      onDataChange(newData)
    },
    [onDataChange]
  )

  const handleAfterSelect = useCallback(
    (row: number, column: number, _row2: number, _column2: number) => {
      if (!onSelectionChange || row < 0 || column < 0) return
      const hot = hotRef.current?.hotInstance ?? null
      const value = hot ? hot.getDataAtCell(row, column) : data[row]?.[column]
      onSelectionChange({ row, col: column, value })
    },
    [data, onSelectionChange]
  )

  const colHeaderLabels = useCallback((col: number) => colToLetter(col), [])

  return (
    <div className="h-full w-full overflow-auto">
      <HotTable
        ref={hotRef as React.RefObject<HotTableClass>}
        data={data}
        colHeaders={colHeaderLabels}
        rowHeaders={true}
        height="100%"
        width="100%"
        licenseKey="non-commercial-and-evaluation"
        cells={cells}
        afterChange={handleAfterChange}
        afterSelection={handleAfterSelect}
        stretchH="all"
        contextMenu={true}
        manualColumnResize={true}
        manualRowResize={true}
        filters={false}
        dropdownMenu={true}
      />
    </div>
  )
}
