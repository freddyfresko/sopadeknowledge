/**
 * @juegahiphop/sdk — Tipos del protocolo de comunicación
 */

export interface JuegaHipHopMessage<T = unknown> {
  type: string
  payload?: T
  timestamp: number
  source: 'lobby' | 'game'
  gameId?: string
}

export const MessageType = {
  GAME_READY: 'jh:game_ready',
  GAME_STARTED: 'jh:game_started',
  GAME_COMPLETED: 'jh:game_completed',
  SCORE_UPDATED: 'jh:score_updated',
  REQUEST_FULLSCREEN: 'jh:request_fullscreen',
  EXIT_GAME: 'jh:exit_game',
  ERROR: 'jh:error',
  PAUSE: 'jh:pause',
  RESUME: 'jh:resume',
} as const

export type MessageType = (typeof MessageType)[keyof typeof MessageType]

export interface GameReadyPayload {
  version: string
}

export interface GameStartedPayload {
  sessionId?: string
}

export interface GameCompletedPayload {
  score: number
  itemId?: string
  difficulty?: string
  metadata?: Record<string, unknown>
}

export interface ScoreUpdatedPayload {
  score: number
  progress?: number
}

export interface ExitGamePayload {
  reason?: string
}

export interface ErrorPayload {
  code: string
  message: string
  fatal: boolean
}

export interface MessagePayloadMap {
  [MessageType.GAME_READY]: GameReadyPayload
  [MessageType.GAME_STARTED]: GameStartedPayload
  [MessageType.GAME_COMPLETED]: GameCompletedPayload
  [MessageType.SCORE_UPDATED]: ScoreUpdatedPayload
  [MessageType.REQUEST_FULLSCREEN]: undefined
  [MessageType.EXIT_GAME]: ExitGamePayload
  [MessageType.ERROR]: ErrorPayload
  [MessageType.PAUSE]: undefined
  [MessageType.RESUME]: undefined
}

export type MessageCallback<T = unknown> = (payload: T) => void

export interface GameEventHandlers {
  onPause?: MessageCallback
  onResume?: MessageCallback
}

export interface LobbyEventHandlers {
  onGameReady?: MessageCallback<GameReadyPayload>
  onGameStarted?: MessageCallback<GameStartedPayload>
  onGameCompleted?: MessageCallback<GameCompletedPayload>
  onScoreUpdated?: MessageCallback<ScoreUpdatedPayload>
  onRequestFullscreen?: MessageCallback
  onExitGame?: MessageCallback<ExitGamePayload>
  onError?: MessageCallback<ErrorPayload>
}

export interface LobbyClientOptions {
  lobbyOrigin: string
}

export interface GameClientOptions {
  allowedOrigins: string[]
  readyTimeout?: number
}
