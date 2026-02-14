import { useRef, useEffect } from 'react'
import type { Message } from '../../types'
import { MessageInput } from './MessageInput'

interface ChatSidebarProps {
  messages: Message[]
  isProcessing?: boolean
  onSend: (content: string) => void
  disabled?: boolean
}

export function ChatSidebar({ messages, isProcessing, onSend, disabled }: ChatSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isProcessing])

  return (
    <div className="flex h-full flex-col bg-surface-dark">
      <div className="border-b border-gray-700 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-200">Copilot</h2>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !isProcessing && (
          <p className="text-center text-sm text-gray-500">
            Send an instruction to process your spreadsheet. For example: &quot;Add a column for total revenue&quot;
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-4 ${
              m.role === 'user' ? 'ml-4 text-right' : 'mr-4 text-left'
            }`}
          >
            <p className={`text-xs text-gray-500 ${m.role === 'user' ? 'mb-1' : 'mb-1'}`}>
              {m.role === 'user' ? 'You' : 'Copilot'}
            </p>
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600/30 text-gray-200'
                  : 'bg-surface-light text-gray-300'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="mb-4 mr-4 text-left">
            <p className="mb-1 text-xs text-gray-500">Copilot</p>
            <div className="inline-block rounded-lg bg-surface-light px-3 py-2 text-sm text-gray-400">
              Processing...
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-700 p-4">
        <MessageInput onSend={onSend} disabled={disabled || isProcessing} placeholder="Message Copilot" />
      </div>
    </div>
  )
}
