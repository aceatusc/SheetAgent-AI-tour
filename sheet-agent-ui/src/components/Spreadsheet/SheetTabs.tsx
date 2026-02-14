interface SheetTabsProps {
  sheetNames: string[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function SheetTabs({ sheetNames, activeIndex, onSelect }: SheetTabsProps) {
  if (sheetNames.length === 0) return null

  return (
    <div className="flex gap-0.5 border-t border-gray-600 bg-surface-dark px-2 py-1">
      {sheetNames.map((name, i) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(i)}
          className={`rounded-t px-3 py-1.5 text-sm transition-colors ${
            i === activeIndex
              ? 'bg-surface text-gray-100'
              : 'text-gray-300 hover:bg-surface-light hover:text-gray-100'
          }`}
        >
          {name}
        </button>
      ))}
      <button type="button" className="px-2 py-1 text-gray-400 hover:text-gray-300" title="Add sheet (coming soon)">
        +
      </button>
    </div>
  )
}
