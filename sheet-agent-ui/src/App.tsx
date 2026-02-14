import { useState, useCallback, useRef } from 'react'
import { useWorkbook } from './hooks/useWorkbook'
import { SpreadsheetGrid } from './components/Spreadsheet/SpreadsheetGrid'
import { FormulaBar } from './components/Spreadsheet/FormulaBar'
import { SheetTabs } from './components/Spreadsheet/SheetTabs'
import { ChartView } from './components/Charts/ChartView'
import { ChatSidebar } from './components/Chat/ChatSidebar'
import { processInstruction } from './api/client'
import type { Message } from './types'

function App() {
  const workbook = useWorkbook()
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; value: unknown } | null>(null)

  const handleSendMessage = useCallback(
    async (content: string) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', content, timestamp: new Date() },
      ])
      setIsProcessing(true)

      try {
        const workbookPath = workbook.currentPath
        const file = workbook.getLastFile?.() ?? undefined
        const options = workbookPath ? { workbookPath } : file ? { file } : undefined
        if (!options) {
          throw new Error('Open or upload a workbook first before sending instructions.')
        }
        const result = await processInstruction(content, options)
        const path = result.path

        await workbook.loadFromPath(path)
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Done. Updated workbook saved.`,
            timestamp: new Date(),
          },
        ])
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${msg}`,
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsProcessing(false)
      }
    },
    [workbook.currentPath]
  )

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file?.name.endsWith('.xlsx') || file?.name.endsWith('.xls')) {
        workbook.loadFromFile(file)
      }
      e.target.value = ''
    },
    [workbook.loadFromFile]
  )

  const handleFormulaBarChange = useCallback(
    (value: string | number | null) => {
      if (!selectedCell || !workbook.activeSheetName) return
      const newData = workbook.activeSheetData.map((row, ri) =>
        ri === selectedCell.row ? row.map((v, ci) => (ci === selectedCell.col ? value : v)) : row
      )
      workbook.updateSheetData(workbook.activeSheetName, newData)
      setSelectedCell((prev) => (prev ? { ...prev, value } : null))
    },
    [selectedCell, workbook.activeSheetName, workbook.activeSheetData, workbook.updateSheetData]
  )

  const activeCharts = (workbook.charts[workbook.activeSheetName] ?? []) as import('./types').ChartDef[]
  const activeChartImage = workbook.chartImages[workbook.activeSheetName]

  return (
    <div className="flex h-screen w-screen flex-col bg-surface text-gray-200">
      <header className="flex items-center justify-between border-b border-gray-700 bg-surface-dark px-4 py-2">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">SheetAgent</h1>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded bg-surface-light px-3 py-1.5 text-sm hover:bg-gray-600"
          >
            Open file
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <FormulaBar selectedCell={selectedCell} onValueChange={handleFormulaBarChange} />
          {workbook.sheetNames.length > 0 ? (
            <>
              <div className="flex flex-1 overflow-auto">
                <SpreadsheetGrid
                      data={workbook.activeSheetData}
                      conditionalFormatting={workbook.conditionalFormatting[workbook.activeSheetName] ?? []}
                      tables={workbook.tables[workbook.activeSheetName] ?? []}
                      onDataChange={(data) => workbook.updateSheetData(workbook.activeSheetName, data)}
                      onSelectionChange={setSelectedCell}
                    />
              </div>
              {(activeCharts.length > 0 || activeChartImage) && (
                <div className="h-64 shrink-0 overflow-auto border-t border-gray-700">
                  <ChartView charts={activeCharts} chartImage={activeChartImage} />
                </div>
              )}
              <SheetTabs
                sheetNames={workbook.sheetNames}
                activeIndex={workbook.activeSheetIndex}
                onSelect={workbook.setActiveSheetIndex}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-500">
              Open a workbook or upload a file to get started
            </div>
          )}
        </div>

        <aside className="w-96 shrink-0 border-l border-gray-700">
          <ChatSidebar
            messages={messages}
            isProcessing={isProcessing}
            onSend={handleSendMessage}
            disabled={workbook.sheetNames.length === 0}
          />
        </aside>
      </div>
    </div>
  )
}

export default App
