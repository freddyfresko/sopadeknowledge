/**
 * @juegahiphop/sdk — Helpers de mensajes postMessage
 *
 * Copia local sincronizada con packages/juegahiphop-sdk/
 * Mantener actualizado cuando se modifique el paquete.
 *
 * Funciones para crear, enviar, validar y recibir mensajes
 * del protocolo JuegaHipHop.
 */

import type {
  JuegaHipHopMessage,
  MessagePayloadMap,
  MessageType,
} from './types'
import { PROTOCOL_VERSION } from './types'

// ─── Crear mensaje ───

export function createMessage<T extends MessageType>(
  type: T,
  payload: MessagePayloadMap[T],
  source: 'lobby' | 'game',
  options?: {
    gameId?: string
    requestId?: string
  },
): JuegaHipHopMessage<MessagePayloadMap[T]> {
  return {
    type,
    payload,
    timestamp: Date.now(),
    protocolVersion: PROTOCOL_VERSION,
    source,
    ...(options?.gameId ? { gameId: options.gameId } : {}),
    ...(options?.requestId ? { requestId: options.requestId } : {}),
  }
}

// ─── Validar mensaje ───

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

// ─── Enviar mensaje a un target específico ───

export function sendMessage<T extends MessageType>(
  target: Window | HTMLIFrameElement | null,
  type: T,
  payload: MessagePayloadMap[T],
  targetOrigin: string,
  source: 'lobby' | 'game',
  options?: {
    gameId?: string
    requestId?: string
  },
): void {
  if (!target) return

  const win = target instanceof HTMLIFrameElement ? target.contentWindow : target
  if (!win) return

  const message = createMessage(type, payload, source, options)
  win.postMessage(message, targetOrigin)
}

// ─── Escuchar mensajes (genérico) ───

export interface MessageListener {
  unsubscribe: () => void
}

export function listenMessages(
  handler: (message: JuegaHipHopMessage) => void,
  allowedOrigins?: string[],
): MessageListener {
  const onMessage = (event: MessageEvent) => {
    // Validar origen si hay lista blanca
    if (allowedOrigins && allowedOrigins.length > 0) {
      if (!allowedOrigins.includes(event.origin)) return
    }

    // Validar formato del mensaje
    if (!isValidMessage(event.data)) return

    handler(event.data as JuegaHipHopMessage)
  }

  window.addEventListener('message', onMessage)

  return {
    unsubscribe: () => window.removeEventListener('message', onMessage),
  }
}
