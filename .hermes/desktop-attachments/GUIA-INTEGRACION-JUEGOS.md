# Guía de Integración — Juegos JuegaHipHop

> **Para desarrolladores que crean un juego nuevo para la plataforma JuegaHipHop.**
>
> Esta guía te dice exactamente qué implementar para que tu juego funcione
> dentro del lobby, persista progreso, y esté sincronizado con la plataforma.

---

## Índice

1. [Resumen — cómo funciona](#1-resumen--cómo-funciona)
2. [Registro del juego en la plataforma](#2-registro-del-juego-en-la-plataforma)
3. [Instalar el SDK](#3-instalar-el-sdk)
4. [Ciclo de vida del juego](#4-ciclo-de-vida-del-juego)
5. [Guardar y cargar progreso](#5-guardar-y-cargar-progreso)
6. [Registrar completions y logros](#6-registrar-completions-y-logros)
7. [Eventos del lobby (pause, resume, end)](#7-eventos-del-lobby-pause-resume-end)
8. [Checklist de integración](#8-checklist-de-integración)
9. [Plantilla de código completa](#9-plantilla-de-código-completa)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Resumen — cómo funciona

```
┌─────────────────────────────────────────────┐
│              LOBBY (CEREBRO)                  │
│                                              │
│  ┌─────────────┐     ┌──────────────────┐   │
│  │ GameContainer│     │    Supabase      │   │
│  │ (iframe)     │     │  (único backend) │   │
│  │              │     │                  │   │
│  │  ┌────────┐  │     │  - game_state     │   │
│  │  │ TU     │  │     │  - completions    │   │
│  │  │ JUEGO  │──┼─────┼─▶- achievements   │   │
│  │  │        │  │     │  - sessions       │   │
│  │  └────────┘  │     │  - player_profile │   │
│  └─────────────┘     └──────────────────┘   │
└─────────────────────────────────────────────┘
```

**Regla de oro:** Tu juego **NO** toca Supabase. Tu juego **NO** maneja auth.
Todo va por el SDK (postMessage) al lobby, y el lobby se encarga.

### Lo que el lobby hace por ti

| Tarea | Quien la hace |
|-------|---------------|
| Autenticación del usuario | Lobby |
| Crear sesión de juego | Lobby |
| Guardar progreso (game_state) | Lobby (cuando tu juego lo pide) |
| Cargar progreso (game_state) | Lobby (cuando tu juego lo pide) |
| Registrar completions | Lobby (cuando tu juego notifica) |
| Registrar logros | Lobby (cuando tu juego lo pide) |
| Actualizar XP y nivel | Lobby |
| Cerrar sesión | Lobby |

### Lo que tu juego hace

| Tarea | Tu juego |
|-------|----------|
| Renderizar el juego | ✅ |
| Lógica del juego | ✅ |
| Enviar game_ready cuando cargue | ✅ |
| Guardar progreso vía SDK | ✅ (le pide al lobby) |
| Cargar progreso vía SDK | ✅ (le pide al lobby) |
| Notificar game_completed | ✅ |
| Solicitar logros | ✅ (le pide al lobby) |
| Recibir pause/resume del lobby | ✅ |

---

## 2. Registro del juego en la plataforma

Tu juego necesita una fila en la tabla `games` de Supabase. Esto lo hace el
admin del lobby (o tú con acceso a Supabase).

```sql
INSERT INTO games (
  slug, name, emoji, short_description, color,
  accent_color, status, orientation, external_url,
  allowed_origins, category, sort_order, total_items, progress_label
) VALUES (
  'mi-juego',           -- slug único (kebab-case)
  'Mi Juego',            -- nombre display
  '🎮',                  -- emoji
  'Descripción corta',   -- descripción corta
  '#FF5733',             -- color principal
  '#E63946',             -- color de acento
  'active',              -- active | beta | coming_soon | maintenance | hidden
  'landscape',           -- landscape | portrait | any
  'https://mijuego.juegahiphop.cl',  -- URL de tu juego
  ARRAY['https://mijuego.juegahiphop.cl'],  -- origins permitidos para postMessage
  'games',               -- categoría
  10,                    -- orden en el catálogo
  NULL,                  -- total de items (para barra de progreso)
  'Niveles'             -- label de progreso
);
```

> **IMPORTANTE:** `allowed_origins` debe incluir el origin exacto de tu juego.
> El lobby valida que los mensajes postMessage vengan de ese origin.

---

## 3. Instalar el SDK

### Opción A: Copiar los archivos del SDK

Copia estos 4 archivos a `src/lib/sdk/` en tu juego:

```
src/lib/sdk/
├── types.ts          ← Tipos del protocolo
├── messages.ts       ← Helpers de mensajes
├── lobby-client.ts   ← Cliente (lo usas dentro del juego)
└── game-container.ts ← (no lo necesitas — es para el lobby)
```

Los archivos están en `packages/juegahiphop-sdk/src/` del monorepo.

### Opción B: Instalar como paquete (si tu juego soporta npm)

```bash
npm install @juegahiphop/sdk
```

### Import

```typescript
// Si copiaste los archivos:
import { createLobbyClient } from './lib/sdk/lobby-client'

// Si instalaste el paquete:
import { createLobbyClient } from '@juegahiphop/sdk'
```

---

## 4. Ciclo de vida del juego

### Diagrama temporal

```
JUEGO                        LOBBY
  │                            │
  │  (iframe carga)            │
  │  (tu juego inicializa)     │
  │                            │
  │ ── jh:game_ready ────────→ │  (tu juego dice "estoy listo")
  │                            │  (lobby crea sesión en Supabase)
  │                            │  (lobby consulta perfil del jugador)
  │ ←── jh:session_context ─── │  (lobby te envía userId, displayName, etc.)
  │                            │
  │  (el usuario juega)         │
  │                            │
  │ ── jh:game_started ──────→ │  (opcional: avisaste que empezó la partida)
  │ ── jh:score_updated ─────→ │  (opcional: puntaje en vivo)
  │                            │
  │ ── jh:save_progress ─────→ │  (pediste guardar)
  │ ←── jh:save_result ─────── │  (lobby confirmó)
  │                            │
  │ ── jh:game_completed ────→ │  (partida terminada)
  │                            │  (lobby guarda en game_completions)
  │                            │
  │ ── jh:exit_game ─────────→ │  (volver al lobby)
  │                            │  (lobby cierra sesión)
```

### Código: inicializar el SDK

```typescript
import { createLobbyClient } from './lib/sdk/lobby-client'

// 1. Detectar el origen del lobby
const lobbyOrigin = 'https://lobby.juegahiphop.cl'  // o tu URL de lobby

// 2. Crear cliente del lobby
const lobby = createLobbyClient({
  lobbyOrigin,
  gameId: 'mi-juego',  // debe coincidir con el slug en Supabase
  capabilities: ['save_progress', 'achievements'],  // opcional
})

// 3. ¡Avisar que estás listo! (lo antes posible después de cargar)
lobby.sendReady({ version: '1.0.0' })

// 4. Recibir el contexto del usuario (userId, displayName, etc.)
lobby.onSessionContext((ctx) => {
  console.log('Usuario:', ctx.displayName, 'Nivel:', ctx.level)
  console.log('Es invitado:', ctx.isGuest)
  // Usa ctx.userId para personalizar la experiencia
})

// 5. Cleanup al desmontar
// lobby.destroy()  ← llama esto cuando tu juego se cierre
```

> **CUÁNDO enviar game_ready:** Inmediatamente después de que tu juego
> terminó de cargar sus assets y está listo para jugar. No antes.

---

## 5. Guardar y cargar progreso

El lobby guarda tu estado en la tabla `game_state` de Supabase. Tu juego
le pide que guarde o cargue, y el lobby responde.

### Guardar

```typescript
// Guardar el estado completo del juego
const result = await lobby.saveProgress({
  gameState: {
    nivelActual: 5,
    desbloqueados: ['nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5'],
    config: { volumen: 0.8, dificultad: 'normal' },
    // ... cualquier cosa serializable como JSON
  },
  score: 12500,  // opcional: se guarda como best_score
  metadata: {    // opcional: estadísticas extra
    tiempoTotal: 3600,
    partidasJugadas: 15,
  },
})

if (result.success) {
  console.log('✅ Guardado exitoso')
} else {
  console.error('❌ Error:', result.error)
}
```

### Cargar

```typescript
// Cargar el estado guardado al iniciar el juego
const data = await lobby.loadProgress()

if (data.success && data.gameState) {
  console.log('📊 Progreso cargado:', data.gameState)
  console.log('🏆 Mejor puntaje:', data.bestScore)
  // Restaura el estado del juego desde data.gameState
} else {
  // No hay datos guardados (primera vez que juega) o es invitado
  console.log('📭 No hay progreso guardado — empezando nuevo')
}
```

### Cuándo guardar

| Momento | ¿Guardar? |
|---------|-----------|
| Al completar un nivel | ✅ |
| Al salir del juego | ✅ (antes de sendExitGame) |
| Al cambiar configuración | ✅ |
| Durante el gameplay (auto-save) | ✅ (cada N segundos o por checkpoint) |
| Al pausar | ✅ (recomendado) |

> **NOTA:** Si el usuario es invitado (`isGuest: true`), el lobby confirma
> el guardado pero NO persiste realmente. Tu juego no necesita manejar
> este caso — el SDK lo hace transparente.

---

## 6. Registrar completions y logros

### Game completed

Cuando una partida termina (nivel completado, game over, etc.):

```typescript
lobby.sendGameCompleted({
  score: 1500,
  itemId: 'nivel-5',           // qué completó (nivel, puzzle, etc.)
  difficulty: 'hard',          // normal | hard | easy | etc.
  timeSpent: 120,              // segundos que tardó
  completed: true,             // true si lo completó, false si game over
  metadata: {                  // opcional: datos extra
    combosMaximos: 5,
    powerupsUsados: 2,
  },
})
```

> El lobby guarda esto en `game_completions` y actualiza el perfil del
> jugador (XP, total_games_completed, racha).

### Unlock achievement

Cuando el jugador desbloquea un logro:

```typescript
const result = await lobby.unlockAchievement({
  achievementId: 'first_win',  // ID único del logro
  metadata: {                 // opcional
    score: 1500,
    level: 5,
  },
})

if (result.success) {
  if (result.alreadyUnlocked) {
    console.log('Ya tenía este logro')
  } else {
    console.log('🎉 Logro desbloqueado! +', result.xpAwarded, 'XP')
  }
}
```

> El logro debe estar definido en la tabla `achievement_definitions`
> de Supabase. Consulta con el admin del lobby para registrar logros nuevos.

---

## 7. Eventos del lobby (pause, resume, end)

El lobby puede pausar, reanudar o cerrar tu juego. Maneja estos eventos:

```typescript
// El lobby pausa el juego (ej: el usuario cambió de pestaña)
lobby.onPause(() => {
  pausarJuego()
  // Guarda el estado aquí (recomendado)
  lobby.saveProgress({ gameState: estadoActual }).catch(() => {})
})

// El lobby reanuda el juego
lobby.onResume(() => {
  reanudarJuego()
})

// El lobby cierra la sesión (el usuario se va)
lobby.onEndSession((payload) => {
  console.log('Sesión cerrada:', payload.reason)
  // Limpia todo aquí
  lobby.destroy()
})
```

---

## 8. Checklist de integración

Antes de declarar tu juego integrado, verifica:

- [ ] **El juego envía `jh:game_ready`** al cargar
- [ ] **El juego recibe `jh:session_context`** y usa userId/displayName
- [ ] **El juego guarda progreso** vía `lobby.saveProgress()` al completar niveles
- [ ] **El juego carga progreso** vía `lobby.loadProgress()` al iniciar
- [ ] **El juego envía `jh:game_completed`** cuando termina una partida
- [ ] **El juego maneja `onPause`/`onResume`** del lobby
- [ ] **El juego llama `lobby.destroy()`** al cerrar
- [ ] **El juego envía `jh:exit_game`** cuando el usuario quiere volver al lobby
- [ ] **El juego NO tiene cliente Supabase** (no importa @supabase/supabase-js)
- [ ] **El juego NO maneja auth** (no tiene login propio)
- [ ] **El slug del juego** coincide entre el código y la tabla `games`
- [ ] **`allowed_origins`** en Supabase incluye el origin exacto del juego
- [ ] **El juego funciona dentro del iframe** del lobby sin errores

---

## 9. Plantilla de código completa

```typescript
import { createLobbyClient } from './lib/sdk/lobby-client'
import type { SessionContextPayload } from './lib/sdk/types'

class MiJuego {
  private lobby: ReturnType<typeof createLobbyClient> | null = null
  private userId: string | null = null
  private isGuest = true
  private estadoJuego = {
    nivelActual: 1,
    nivelesCompletados: [] as string[],
    puntaje: 0,
  }

  async init() {
    // 1. Crear cliente del lobby
    this.lobby = createLobbyClient({
      lobbyOrigin: 'https://lobby.juegahiphop.cl',
      gameId: 'mi-juego',
    })

    // 2. Recibir contexto del usuario
    this.lobby.onSessionContext((ctx: SessionContextPayload) => {
      this.userId = ctx.userId
      this.isGuest = ctx.isGuest
      this.personalizarUI(ctx.displayName, ctx.avatarUrl, ctx.level)
      this.cargarProgreso()
    })

    // 3. Manejar pause/resume
    this.lobby.onPause(() => {
      this.pausar()
      this.guardarProgreso()
    })
    this.lobby.onResume(() => {
      this.reanudar()
    })

    // 4. Manejar cierre de sesión
    this.lobby.onEndSession(() => {
      this.limpiar()
    })

    // 5. Avisar que estamos listos
    this.lobby.sendReady({ version: '1.0.0' })
  }

  private async cargarProgreso() {
    if (!this.lobby) return
    const data = await this.lobby.loadProgress()
    if (data.success && data.gameState) {
      this.estadoJuego = data.gameState as typeof this.estadoJuego
      this.puntaje = data.bestScore ?? 0
      this.renderizarJuego()
    }
  }

  async guardarProgreso() {
    if (!this.lobby) return
    await this.lobby.saveProgress({
      gameState: this.estadoJuego as unknown as Record<string, unknown>,
      score: this.estadoJuego.puntaje,
    })
  }

  async completarNivel(nivelId: string, score: number) {
    this.estadoJuego.nivelesCompletados.push(nivelId)
    this.estadoJuego.nivelActual++

    // Notificar al lobby
    this.lobby?.sendGameCompleted({
      score,
      itemId: nivelId,
      difficulty: 'normal',
      completed: true,
      timeSpent: 120,
    })

    // Verificar logros
    if (this.estadoJuego.nivelesCompletados.length === 1) {
      await this.lobby?.unlockAchievement({
        achievementId: 'first_level',
      })
    }

    // Guardar progreso
    await this.guardarProgreso()
  }

  salir() {
    this.lobby?.sendExitGame({ reason: 'user_quit' })
  }

  destruir() {
    this.lobby?.destroy()
    this.lobby = null
  }
}
```

---

## 10. Troubleshooting

### El lobby muestra "EL JUEGO NO RESPONDE"

**Causa:** Tu juego no envió `jh:game_ready` en 15 segundos.

**Solución:**
- Verifica que `lobby.sendReady()` se llame después de cargar
- Verifica que el origin del lobby coincida (`lobbyOrigin`)
- Abre la consola del iframe para ver errores

### El save no persiste

**Causa posible:** El usuario es invitado (`isGuest: true`).

**Solución:** El lobby confirma el guardado pero no persiste. Esto es normal.
Cuando el usuario se registre, el lobby persistirá.

### "Protocolo incompatible"

**Causa:** La versión del SDK en tu juego no coincide con la del lobby.

**Solución:** Copia los archivos del SDK desde `packages/juegahiphop-sdk/src/`
al directorio `src/lib/sdk/` de tu juego.

### postMessage no llega

**Causa posible:** `allowed_origins` en Supabase no incluye tu origin.

**Solución:** Verifica que la tabla `games` tenga tu origin exacto en
`allowed_origins`:
```sql
SELECT slug, allowed_origins FROM games WHERE slug = 'mi-juego';
```

### No recibo session_context

**Causa posible:** Tu juego no envió `game_ready` primero.

**Solución:** El lobby envía `session_context` solo después de recibir
`game_ready`. Asegúrate de llamar `lobby.sendReady()` primero.

---

## Referencia rápida de la API

```typescript
// ── Ciclo de vida ──
lobby.sendReady({ version: '1.0.0' })
lobby.sendGameStarted({ levelId: 'nivel-1', difficulty: 'normal' })
lobby.sendGameCompleted({ score: 100, itemId: 'nivel-1', completed: true })
lobby.sendScoreUpdated({ score: 500, progress: 0.5 })
lobby.requestFullscreen()
lobby.sendExitGame({ reason: 'user_quit' })
lobby.sendError({ code: 'FATAL', message: 'Crash', fatal: true })

// ── Persistencia (async, devuelven promesa) ──
const saveResult = await lobby.saveProgress({ gameState: {...}, score: 100 })
const loadData = await lobby.loadProgress()
const achResult = await lobby.unlockAchievement({ achievementId: 'first_win' })
const campaignResult = await lobby.requestCampaign({ placement: 'game_results', rewardIds: ['coins_100'] })

// ── Listeners ──
lobby.onSessionContext((ctx) => { /* userId, displayName, level, isGuest... */ })
lobby.onPause(() => { /* pausar */ })
lobby.onResume(() => { /* reanudar */ })
lobby.onEndSession((payload) => { /* limpiar */ })

// ── Cleanup ──
lobby.destroy()
```

---

> **Para más detalles sobre la arquitectura completa, ver `ARCHITECTURE.md`.**
> **Para cualquier duda, consulta al admin del lobby.**
