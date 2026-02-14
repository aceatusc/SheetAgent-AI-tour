import { useState, useEffect } from 'react'

function colToLetter(col: number): string {
  let s = ''
  while (col >= 0) {
    s = String.fromCharCode((col % 26) + 65) + s
    col = Math.floor(col / 26) - 1
  }
  return s
}

interface FormulaBarProps {
  selectedCell: { row: number; col: number; value: unknown } | null
  onValueChange?: (value: string | number | null) => void
}

export function FormulaBar({ selectedCell, onValueChange }: FormulaBarProps) {
  const [editValue, setEditValue] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (selectedCell) {
      const v = selectedCell.value
      setEditValue(v === null || v === undefined ? '' : String(v))
    } else {
      setEditValue('')
    }
    setIsEditing(false)
  }, [selectedCell?.row, selectedCell?.col])

  const cellRef = selectedCell
    ? `${colToLetter(selectedCell.col)}${selectedCell.row + 1}`
    : ''

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onValueChange) {
      const parsed = editValue === '' ? null : (isNaN(Number(editValue)) ? editValue : Number(editValue))
      onValueChange(parsed)
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setEditValue(selectedCell?.value != null ? String(selectedCell.value) : '')
      setIsEditing(false)
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-gray-600 bg-surface-dark px-3 py-1.5">
      <span className="min-w-[4rem] font-mono text-sm text-gray-300">{cellRef || '—'}</span>
      <span className="text-gray-400">fx</span>
      <input
        type="text"
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value)
          setIsEditing(true)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (isEditing && onValueChange) {
            const parsed = editValue === '' ? null : (isNaN(Number(editValue)) ? editValue : Number(editValue))
            onValueChange(parsed)
          }
          setIsEditing(false)
        }}
        placeholder="Select a cell"
        disabled={!selectedCell}
        className="flex-1 bg-transparent font-mono text-sm text-gray-100 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:text-gray-500"
      />
    </div>
  )
}
