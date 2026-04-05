import React from 'react'
import type { ChatMessage } from '../Dashboard/types'
import { formatDiceResult, isDiceCommand } from './diceUtils'

interface Props {
  messages: ChatMessage[]
  connected: boolean
  onSend: (message: string) => void
  currentUserId?: number
}

export default function SessionChat({ messages, connected, onSend, currentUserId }: Props) {
  const [input, setInput] = React.useState('')
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
  }

  return (
    <div className="card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-primary dark:text-primaryLight">Chat</h2>
        <span className={`inline-flex items-center gap-1 text-xs ${connected ? 'text-green-600' : 'text-red-500'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Connecté' : 'Déconnecté'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 mb-3 min-h-0 max-h-[60vh] chat-scrollbar">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            Aucun message. Écrivez quelque chose ou lancez des dés (ex: 2d20)
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.author === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse ml-auto' : 'mr-auto'}`}
            >
              {/* Avatar */}
              {msg.author_avatar ? (
                <img
                  src={msg.author_avatar}
                  alt={msg.author_name}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-primary/20 dark:bg-primaryLight/20 text-[11px] font-bold text-primary dark:text-primaryLight">
                  {msg.author_name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Message content */}
              <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-gray-400 mb-0.5">{msg.author_name}</span>
                {msg.is_dice_roll && msg.dice_result ? (
                  <div className="px-3 py-2 rounded-lg bg-accent3/20 border border-accent3/30 text-sm">
                    <span className="font-semibold text-yellow-800 dark:text-accent3">
                      {formatDiceResult(msg.dice_result)}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm max-w-full break-words overflow-hidden ${
                      isMe
                        ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isDiceCommand(input) ? '🎲 Lancer de dés…' : 'Message…'}
          className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!connected || !input.trim()}
          className="btn btn-primary text-sm px-4"
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
