/**
 * @juegahiphop/sdk — LobbyClient
 *
 * Cliente que se usa DENTRO del juego (ejecutándose en un iframe)
 * para comunicarse con el Lobby.
 */

import { listenMessages } from './messages'
import { MessageType } from './types'
import type {
  GameReadyPayload,
  GameStartedPayload,
  GameCompletedPayload,
  ScoreUpdatedPayload,
  ExitGamePayload,
  ErrorPayload,
  MessageCallback,
  LobbyClientOptions,
} from './types'

export interface LobbyClientInstance {
  onReady: (payload: GameReadyPayload) => void
  sendGameStarted: (payload?: GameStartedPayload) => void
  sendGameCompleted: (payload: GameCompletedPayload) => void
  sendScoreUpdated: (payload: ScoreUpdatedPayload) => void
  requestFullscreen: () => void
  sendExitGame: (payload?: ExitGamePayload) => void
  sendError: (payload: ErrorPayload) => void
  onPause: (cb: MessageCallback) => void
  onResume: (cb: MessageCallback) => void
  destroy: () => void
}

export function createLobbyClient(options: LobbyClientOptions): LobbyClientInstance {
  const { lobbyOrigin } = options
  let destroyed = false
  const parentWindow = window.parent !== window ? window.parent : null

  const send = (type: string, payload: unknown) => {
    if (destroyed || !parentWindow) return
    parentWindow.postMessage(
      { type, payload, timestamp: Date.now(), source: 'game' },
      lobbyOrigin,
    )
  }

  const listener = listenMessages((msg) => {
    if (msg.source !== 'lobby') return
  }, [lobbyOrigin])

  const instance: LobbyClientInstance = {
    onReady: (payload: GameReadyPayload) => {
      if (destroyed) return
      send(MessageType.GAME_READY, payload)
    },

    sendGameStarted: (payload?: GameStartedPayload) => {
      if (destroyed) return
      send(MessageType.GAME_STARTED, payload ?? {})
    },

    sendGameCompleted: (payload: GameCompletedPayload) => {
      if (destroyed) return
      send(MessageType.GAME_COMPLETED, payload)
    },

    sendScoreUpdated: (payload: ScoreUpdatedPayload) => {
      if (destroyed) return
      send(MessageType.SCORE_UPDATED, payload)
    },

    requestFullscreen: () => {
      if (destroyed) return
      send(MessageType.REQUEST_FULLSCREEN, undefined)
    },

    sendExitGame: (payload?: ExitGamePayload) => {
      if (destroyed) return
      send(MessageType.EXIT_GAME, payload ?? {})
    },

    sendError: (payload: ErrorPayload) => {
      if (destroyed) return
      send(MessageType.ERROR, payload)
    },

    onPause: (cb: MessageCallback) => {
      const l = listenMessages((msg) => {
        if (msg.type === MessageType.PAUSE) cb(msg.payload)
      }, [lobbyOrigin])
      return l
    },

    onResume: (cb: MessageCallback) => {
      const l = listenMessages((msg) => {
        if (msg.type === MessageType.RESUME) cb(msg.payload)
      }, [lobbyOrigin])
      return l
    },

    destroy: () => {
      destroyed = true
      listener.unsubscribe()
    },
  }

  return instance
}
