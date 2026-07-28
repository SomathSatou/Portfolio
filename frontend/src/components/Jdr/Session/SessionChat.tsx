import React from 'react'
import type { ChatMessage } from '../Dashboard/types'
import { formatDiceResult, isDiceCommand } from './diceUtils'

interface ChatMember {
  id: number
  name: string
}

interface SendOptions {
  private?: boolean
  whisperTo?: number
  keep?: 'highest' | 'lowest'
}

interface Props {
  messages: ChatMessage[]
  connected: boolean
  onSend: (message: string, options?: SendOptions) => void
  onTyping?: () => void
  typingUserIds?: number[]
  currentUserId?: number
  onReconnect?: () => void
  retryCount?: number
  isMJ?: boolean
  members?: ChatMember[]
}

export default function SessionChat({
  messages, connected, onSend, onTyping, typingUserIds = [], currentUserId,
  onReconnect, retryCount = 0, isMJ = false, members = [],
}: Props) {
  const [input, setInput] = React.useState('')
  const [isPrivate, setIsPrivate] = React.useState(false)
  const [whisperTo, setWhisperTo] = React.useState<number | ''>('')
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const typingNames = typingUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter((name): name is string => Boolean(name))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSend(text, {
      private: isMJ && isPrivate,
      whisperTo: isMJ && whisperTo !== '' ? whisperTo : undefined,
    })
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="card-glass flex flex-col h-full min-h-0 animate-slideUp" style={{ maxHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-lg font-semibold text-primary dark:text-primaryLight">Chat</h2>
        <span className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-green-600' : 'text-red-500'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {connected ? 'Connecté' : retryCount > 0 ? `Reconnexion (${retryCount})…` : 'Déconnecté'}
          {!connected && onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="ml-1 underline hover:text-red-700 dark:hover:text-red-400"
            >
              Reconnecter
            </button>
          )}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2.5 mb-3 min-h-0 chat-scrollbar">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8 animate-fadeIn">
            Aucun message. Écrivez quelque chose ou lancez des dés (ex: 2d20)
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.author === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 animate-slideInRight ${isMe ? 'flex-row-reverse ml-auto' : 'mr-auto'}`}
            >
              {/* Avatar */}
              {msg.author_avatar ? (
                <img
                  src={msg.author_avatar}
                  alt={msg.author_name}
                  className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                />
              ) : (
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-primary/20 dark:bg-primaryLight/20 text-[11px] font-bold text-primary dark:text-primaryLight">
                  {msg.author_name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Message content */}
              <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
                  {msg.author_name}
                  {msg.is_private && (
                    <span className="px-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">🔒 secret</span>
                  )}
                  {msg.whisper_to && (
                    <span className="px-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      → {msg.whisper_to_name}
                    </span>
                  )}
                </span>
                {msg.is_dice_roll && msg.dice_result ? (
                  <div className="px-3 py-2 rounded-2xl bg-accent3/15 border border-accent3/25 text-sm backdrop-blur-sm">
                    <span className="font-semibold text-yellow-800 dark:text-accent3">
                      {formatDiceResult(msg.dice_result)}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`px-3 py-1.5 text-sm max-w-full break-words overflow-hidden ${
                      isMe
                        ? 'bg-primary text-white dark:bg-primaryLight dark:text-gray-900 rounded-2xl rounded-tr-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-md'
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

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <p className="text-[11px] text-gray-400 italic mb-1 shrink-0 animate-fadeIn">
          {typingNames.join(', ')} {typingNames.length > 1 ? 'écrivent' : 'écrit'}…
        </p>
      )}

      {/* MJ options: jet secret / chuchotement */}
      {isMJ && members.length > 0 && (
        <div className="flex items-center gap-3 mb-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <label className="inline-flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => {
                setIsPrivate(e.target.checked)
                if (e.target.checked) setWhisperTo('')
              }}
              className="rounded"
            />
            🔒 Secret
          </label>
          <select
            value={whisperTo}
            onChange={(e) => {
              setWhisperTo(e.target.value ? Number(e.target.value) : '')
              if (e.target.value) setIsPrivate(false)
            }}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
          >
            <option value="">Message public</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>Chuchoter à {m.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            onTyping?.()
          }}
          placeholder={isDiceCommand(input) ? '🎲 Lancer de dés…' : 'Message…'}
          className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
        />
        {isDiceCommand(input) && (
          <>
            <button
              type="button"
              title="Avantage : garder le meilleur"
              onClick={() => {
                onSend(input.trim(), { keep: 'highest', private: isMJ && isPrivate, whisperTo: isMJ && whisperTo !== '' ? whisperTo : undefined })
                setInput('')
              }}
              className="btn btn-outline text-sm px-2 rounded-xl"
            >
              ⬆️
            </button>
            <button
              type="button"
              title="Désavantage : garder le pire"
              onClick={() => {
                onSend(input.trim(), { keep: 'lowest', private: isMJ && isPrivate, whisperTo: isMJ && whisperTo !== '' ? whisperTo : undefined })
                setInput('')
              }}
              className="btn btn-outline text-sm px-2 rounded-xl"
            >
              ⬇️
            </button>
          </>
        )}
        <button
          type="submit"
          disabled={!connected || !input.trim()}
          className="btn btn-primary text-sm px-4 rounded-xl"
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
