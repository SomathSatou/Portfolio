import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../Dashboard/types'

interface UseChatOptions {
  campaignId: string | number
  enabled?: boolean
}

export default function useChat({ campaignId, enabled = true }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const closedIntentionally = useRef(false)

  const connect = useCallback(() => {
    if (!enabled) return
    // Prevent opening a second connection
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return
    const token = localStorage.getItem('jdr_access')
    if (!token) return

    closedIntentionally.current = false

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const url = `${protocol}://${host}/ws/jdr/chat/${campaignId}/?token=${token}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ChatMessage
        setMessages((prev) => {
          // Deduplicate by id
          if (prev.some((m) => m.id === data.id)) return prev
          return [...prev, data]
        })
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      // Only auto-reconnect if not intentionally closed
      if (!closedIntentionally.current) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [campaignId, enabled])

  useEffect(() => {
    connect()
    return () => {
      closedIntentionally.current = true
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message }))
    }
  }, [])

  const setInitialMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs)
  }, [])

  return { messages, connected, sendMessage, setInitialMessages }
}
