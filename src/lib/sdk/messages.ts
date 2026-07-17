/**
 * @juegahiphop/sdk — Helpers de mensajes postMessage
 */

import type {
  JuegaHipHopMessage,
  MessagePayloadMap,
  MessageType,
} from './types'

export function createMessage<T extends MessageType>(
  type: T,
  payload: MessagePayloadMap[T],
  source: 'lobby' | 'game',
  gameId?: string,
): JuegaHipHopMessage<MessagePayloadMap[T]> {
  return {
    type,
    payload,
    timestamp: Date.now(),
    source,
    ...(gameId ? { gameId } : {}),
  }
}

export function isValidMessage(data: unknown): data is JuegaHipHopMessage {
  if (!data || typeof data !== 'object') return false
  const msg = data as Record<string, unknown>
  return (
    typeof msg.type === 'string' &&
    msg.type.startsWith('jh:') &&
    typeof msg.timestamp === 'number' &&
    (msg.source === 'lobby' || msg.source === 'game')
  )
}

export function sendMessage<T extends MessageType>(
  target: Window | HTMLIFrameElement | null,
  type: T,
  payload: MessagePayloadMap[T],
  targetOrigin: string,
  source: 'lobby' | 'game',
  gameId?: string,
): void {
  if (!target) return
  const win = target instanceof HTMLIFrameElement ? target.contentWindow : target
  if (!win) return
  const message = createMessage(type, payload, source, gameId)
  win.postMessage(message, targetOrigin)
}

export interface MessageListener {
  unsubscribe: () => void
}

export function listenMessages(
  handler: (message: JuegaHipHopMessage) => void,
  allowedOrigins?: string[],
): MessageListener {
  const onMessage = (event: MessageEvent) => {
    if (allowedOrigins && allowedOrigins.length > 0) {
      if (!allowedOrigins.includes(event.origin)) return
    }
    if (!isValidMessage(event.data)) return
    handler(event.data as JuegaHipHopMessage)
  }
  window.addEventListener('message', onMessage)
  return {
    unsubscribe: () => window.removeEventListener('message', onMessage),
  }
}
