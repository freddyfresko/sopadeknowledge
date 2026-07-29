/**
 * @juegahiphop/sdk — Barrel exports
 *
 * Re-exporta la API pública del SDK para que el juego importe
 * todo desde un solo punto: src/lib/sdk/index.ts
 */

export {
  createLobbyClient,
} from './lobby-client'

export type {
  LobbyClientInstance,
} from './lobby-client'

export {
  createMessage,
  isValidMessage,
  sendMessage,
  listenMessages,
} from './messages'

export type {
  MessageListener,
} from './messages'

export {
  PROTOCOL_VERSION,
  MessageType,
  isProtocolCompatible,
  createRequestId,
} from './types'

export type {
  JuegaHipHopMessage,
  GameReadyPayload,
  GameStartedPayload,
  GameCompletedPayload,
  ScoreUpdatedPayload,
  ExitGamePayload,
  ErrorPayload,
  SaveProgressPayload,
  LoadProgressPayload,
  UnlockAchievementPayload,
  CampaignRequestPayload,
  SaveResultPayload,
  ProgressDataPayload,
  AchievementResultPayload,
  CampaignResponsePayload,
  CampaignRewardStatus,
  SessionContextPayload,
  EndSessionPayload,
  MessageCallback,
  GameEventHandlers,
  LobbyEventHandlers,
  LobbyClientOptions,
  GameClientOptions,
} from './types'
