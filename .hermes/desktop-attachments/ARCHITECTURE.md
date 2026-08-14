# Arquitectura Definitiva — JuegaHipHop

> **Versión:** 3.0.0  
> **Última revisión:** Julio 2026  
> **Propósito:** Plataforma de juegos hip hop escalable para decenas de títulos

> **Modelo 3.0:** El Lobby es el CEREBRO. Los juegos son stateless.
> El lobby administra el usuario, las sesiones, y persiste TODOS los datos
> de cada juego. Los juegos no tocan Supabase directamente.

---

## Índice

1. [Filosofía](#1-filosofía)
2. [Estructura de proyectos](#2-estructura-de-proyectos)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Supabase — Tablas](#4-supabase--tablas)
5. [Flujo de navegación (MVP)](#5-flujo-de-navegación-mvp)
6. [Game Container](#6-game-container)
7. [SDK de comunicación](#7-sdk-de-comunicación)
8. [Auth Flow (MVP)](#8-auth-flow-mvp)
9. [Flujo Lobby ↔ Juego](#9-flujo-lobby--juego)
10. [Catálogo dinámico](#10-catálogo-dinámico)
11. [Seguridad del contenedor](#11-seguridad-del-contenedor)
12. [Despliegue en Firebase](#12-despliegue-en-firebase)
13. [Ambientes: desarrollo y producción](#13-ambientes-desarrollo-y-producción)
14. [Convenciones](#14-convenciones)
15. [MVP — Alcance y plan de integración](#15-mvp--alcance-y-plan-de-integración)
16. [Roadmap post-MVP](#16-roadmap-post-mvp)

---

## 1. Filosofía

```
┌─────────────────────────────────────────────────────────────┐
│                    JUEGAHIPHOP                               │
│                                                              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐       │
│   │  LOBBY   │  │ PUZZLE   │  │  SOPA    │  │FIGHTER│       │
│   │ (Next 16)│  │(Next 15) │  │(Vite+React│  │(Phaser│       │
│   │ CEREBRO  │  │ STATELESS│  │ STATELESS│  │STATELESS│     │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬───┘       │
│        │  postMessage │             │            │           │
│        └──────────────┴──────┬──────┴────────────┘           │
│                              │                               │
│                    ┌─────────▼─────────┐                     │
│                    │     SUPABASE      │                     │
│                    │  (solo el lobby   │                     │
│                    │   lo toca)        │                     │
│                    └───────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

### Principios rectores

1. **El Lobby es el cerebro** — administra el usuario, las sesiones, y persiste todos los datos de cada juego (progreso, scores, logros, completions). Los juegos son stateless desde el punto de vista del backend.
2. **Cada juego es su propio proyecto** — repositorio, ciclo de desarrollo y despliegue independientes.
3. **Supabase es el único backend** — auth, PostgreSQL, RLS, Edge Functions, Storage. El lobby es el único que habla con Supabase.
4. **Catálogo dinámico** — los juegos se registran en Supabase; el lobby los descubre automáticamente sin cambiar código.
5. **Comunicación estandarizada** — SDK compartido exclusivamente para comunicación Lobby ↔ Juego vía postMessage.
6. **Los juegos no necesitan Supabase** — ni cliente, ni auth, ni persistencia. El juego le pide al lobby que guarde/cargue, y el lobby responde.

### ¿Qué NO es el lobby?

❌ No contiene código de juegos  
❌ No duplica lógica de juegos  
❌ No es un monolito  
❌ No tiene dependencias de los juegos  

### ¿Qué SÍ es el lobby?

✅ Punto de entrada único a la plataforma  
✅ Catálogo dinámico de juegos  
✅ Gestión de usuario y autenticación  
✅ Persistencia de TODOS los datos de los juegos  
✅ Game Container para ejecutar juegos embedidos  
✅ Administrador de sesiones, progreso, logros y completions  
✅ (Futuro) Rankings, logros, comunidad, eventos  

---

## 2. Estructura de proyectos

```
E:\dev\JuegaHipHop\
│
├── lobby/                          ← Next.js 16 App Router + Tailwind 4
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            ← Home / Lobby
│   │   │   ├── login/page.tsx      ← Auth (ya implementado)
│   │   │   ├── perfil/             ← Perfil del jugador (ya implementado)
│   │   │   ├── jugar/[slug]/       ← Game Container definitivo
│   │   │   └── auth/callback/      ← OAuth callback
│   │   ├── components/
│   │   │   ├── GameCard.tsx         ← Tarjeta de juego (ya implementada)
│   │   │   ├── GameContainer.tsx    ← NUEVO: contenedor universal de juegos
│   │   │   ├── Header.tsx          ← Navbar (ya implementado)
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── supabase/           ← Clientes SSR + browser (ya implementados)
│   │   │   └── types.ts            ← Tipos compartidos
│   │   └── hooks/
│   │       └── useGameContainer.ts  ← NUEVO: hook para comunicación con juegos
│   └── ...config files
│
├── hhfighters/                     ← Phaser 3 + Vite 7 (SIN CAMBIOS estructurales)
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts         ← Mantiene su propio cliente Supabase
│       │   └── SaveManager.ts      ← Mantiene su propio sync
│       └── ...
│
├── puzzlehh/                       ← Next.js 15 (SIN CAMBIOS estructurales)
│   └── lib/
│       ├── supabase/               ← Mantiene su propio cliente Supabase
│       ├── save/
│       │   └── supabase-sync.ts    ← Mantiene su propio sync
│       └── ...
│
├── sopadeletras/                   ← Vite + React + PWA (SIN CAMBIOS estructurales)
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts         ← Mantiene su propio cliente Supabase
│       │   └── supabase-sync.ts    ← Mantiene su propio sync
│       └── ...
│
└── packages/                       ← NUEVO: SDK compartido (solo comunicación)
    └── juegahiphop-sdk/
        ├── src/
        │   ├── index.ts
        │   ├── types.ts            ← Tipos del protocolo postMessage
        │   ├── messages.ts         ← Definición y validación de mensajes
        │   ├── lobby-client.ts     ← Cliente para usar DENTRO del juego (iframe)
        │   └── game-container.ts   ← Utilidades para usar en el LOBBY
        ├── package.json
        └── tsconfig.json
```

### Responsabilidades de cada proyecto

| Proyecto | Tecnología | Responsabilidad |
|----------|-----------|----------------|
| **lobby** | Next.js 16 (App Router) | Portal principal, catálogo, perfil, game container |
| **hhfighters** | Phaser 3 + Vite 7 | Beat 'em up 2D. Se comunica con lobby vía SDK |
| **puzzlehh** | Next.js 15 | Rompecabezas. Se comunica con lobby vía SDK |
| **sopadeletras** | Vite 8 + React 19 + PWA | Sopa de letras. Se comunica con lobby vía SDK |
| **juegahiphop-sdk** | TypeScript | Solo protocolo de comunicación postMessage |

> **Cada juego mantiene sus propias utilidades de Supabase.** El SDK no contiene ni comparte helpers de base de datos. No hay acoplamiento entre proyectos vía el SDK.

---

## 3. Stack tecnológico

| Capa | Tecnología | Uso |
|------|-----------|-----|
| **Frontend Lobby** | Next.js 16 + Tailwind 4 | SSR, App Router, layouts |
| **Frontend Juegos (Next)** | Next.js 15 | PuzzleHH |
| **Frontend Juegos (SPA)** | Vite 7/8 + React 19 | SopaDeltas, HHFighters (Phaser) |
| **Backend** | Supabase | Auth, PostgreSQL, RLS, Edge Functions, Storage |
| **Despliegue Lobby** | Firebase App Hosting | Next.js serverless |
| **Despliegue SPAs** | Firebase Hosting | Static sites |
| **SDK Compartido** | npm package (local) | @juegahiphop/sdk (solo comunicación) |
| **Auth Lobby** | Supabase Auth SSR (@supabase/ssr) | Cookies propias del lobby |
| **Auth Juegos** | Supabase Auth (@supabase/supabase-js) | Cada juego maneja su propia sesión |
| **Fuentes** | Bangers + Inter | Google Fonts |
| **Estilo** | Tailwind 4 + CSS personalizado | Tema oscuro graffiti/street art |

---

## 4. Supabase — Tablas

### 4.1 Tablas existentes (ya migradas — no tocar)

```sql
-- ============================================================
-- player_profiles  — Una fila por usuario. Progreso global.
-- ============================================================
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_games_completed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- game_completions  — Cada fila = una partida completada.
-- game_id: 'puzzle' | 'sopa' | 'fighters' | ...
-- ============================================================
CREATE TABLE game_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  score INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_game_completion UNIQUE (user_id, game_id, item_id, difficulty)
);

-- ============================================================
-- game_state  — Estado serializable de cada juego por usuario.
-- game_id: 'puzzle' | 'sopa' | 'fighters' | ...
-- ============================================================
CREATE TABLE game_state (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  best_score INTEGER,
  total_plays INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, game_id)
);

-- ============================================================
-- achievement_unlocks  — Logros desbloqueados (compartidos)
-- ============================================================
CREATE TABLE achievement_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_achievement UNIQUE (user_id, achievement_id)
);
```

### 4.2 Tabla NUEVA: `games` (migración 00003)

```sql
-- ============================================================
-- games  — Catálogo de juegos (dinámico, leído por el lobby)
-- Cada fila = un juego disponible en la plataforma.
-- ============================================================
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎮',
  short_description TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  color TEXT NOT NULL DEFAULT '#7C3AED',
  accent_color TEXT DEFAULT '#6D28D9',
  status TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'beta' | 'coming_soon' | 'maintenance' | 'hidden'
  featured BOOLEAN DEFAULT false,
  orientation TEXT DEFAULT 'landscape',
    -- 'landscape' | 'portrait' | 'any'
  external_url TEXT NOT NULL,
  category TEXT DEFAULT 'games',
  sort_order INTEGER DEFAULT 0,
  total_items INTEGER,
    -- Para barra de progreso (930 en sopa, etc)
  progress_label TEXT,
    -- 'Palabras' | 'Completados' | 'Niveles'
  release_date TIMESTAMPTZ,
  allowed_origins TEXT[] DEFAULT '{}',
    -- Lista de origins permitidos para validación postMessage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cualquiera autenticado puede leer
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read games"
  ON games FOR SELECT
  USING (auth.role() = 'authenticated');

-- Índices
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_sort ON games(sort_order);
```

> **Nota:** La tabla `news` y otras tablas sociales se implementarán en fases posteriores. Este MVP solo necesita `games`.

### 4.3 Edge Functions (futuro)

Sin Edge Functions en el MVP. Se agregarán cuando se requiera lógica del lado del servidor (rankings, streaks, etc.).

---

## 5. Flujo de navegación (MVP)

```
                        ┌──────────────────────┐
                        │      /login           │
                        │   (AuthForm.tsx)      │
                        └──────────┬───────────┘
                                   │ login exitoso
                                   ▼
┌─────────────────────────────────────────────────────┐
│                    / (LOBBY)                         │
│                                                      │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │ Home + Hero     │  │ Catálogo dinámico (grid)  │  │
│  │ (siluetas,      │  │ (lee de tabla `games`)   │  │
│  │  corona, título)│  │  GameCard por juego       │  │
│  └─────────────────┘  └───────────┬──────────────┘  │
│                                   │                  │
│                    Click "JUGAR"  │                  │
│                                   ▼                  │
│                    ┌──────────────────────────┐      │
│                    │     /jugar/[slug]         │      │
│                    │     GameContainer.tsx     │      │
│                    │ ┌──────────────────────┐ │      │
│                    │ │      iframe          │ │      │
│                    │ │  (juego autónomo)    │ │      │
│                    │ └──────────────────────┘ │      │
│                    │ [← Volver]     [⛶ Full] │      │
│                    └──────────────────────────┘      │
│                                                      │
│  ┌──────────────┐                                    │
│  │ /perfil      │  Stats + XP + logros              │
│  └──────────────┘                                    │
└──────────────────────────────────────────────────────┘
```

### Detalle de rutas del lobby (MVP)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Home | Hero + catálogo dinámico de juegos + footer |
| `/login` | Login | AuthForm (email/password + Google) |
| `/perfil` | Perfil | Stats, XP, nivel, logros, racha |
| `/jugar/[slug]` | Game Container | Contenedor universal de juegos vía iframe |
| `/auth/callback` | Callback | Callback de OAuth |

> **Única ruta de juego:** `/jugar/[slug]`. La ruta anterior `/juego/[slug]` será eliminada o redirigirá a `/jugar/[slug]`.

---

## 6. Game Container

### 6.1 Componente `GameContainer.tsx`

Diseñado para ejecutar CUALQUIER juego embebido sin modificaciones en el juego.

```typescript
interface GameContainerProps {
  slug: string                     // Identificador del juego
  game: GameCatalogEntry           // Datos del juego desde Supabase
}
```

**El contenedor NO pasa tokens de auth al iframe en el MVP.** El juego maneja su propia autenticación de forma autónoma.

### 6.2 Atributos del iframe

```tsx
<iframe
  src={game.external_url}
  title={game.name}
  className="..."
  allow={[
    'fullscreen',
    'autoplay',
    'clipboard-write',
    'gamepad',
    'gyroscope',
    'accelerometer',
    'microphone',      // futuro: chat de voz
  ].join('; ')}
  sandbox={[
    'allow-scripts',
    'allow-same-origin',
    'allow-forms',
    'allow-popups',
    'allow-modals',
    'allow-orientation-lock',
    'allow-pointer-lock',
    'allow-presentation',
  ].join(' ')}
/>
```

**Explicación de atributos:**

| Atributo | Propósito |
|----------|-----------|
| `allow="fullscreen"` | Fullscreen API (Phaser, video) |
| `allow="autoplay"` | Audio automático al cargar |
| `allow="gamepad"` | Gamepad API para controles físicos |
| `sandbox="allow-scripts"` | Ejecutar JavaScript del juego |
| `sandbox="allow-same-origin"` | Acceso a localStorage, indexedDB |
| `sandbox="allow-popups"` | Links externos (política de privacidad, etc.) |
| `sandbox="allow-pointer-lock"` | Pointer Lock API (FPS, Phaser) |
| `sandbox="allow-presentation"` | Presentación fullscreen |

> `allow-same-origin` es necesario para que el juego pueda usar localStorage y Supabase. Sin esto, el iframe se trata como un origen opaco y pierde acceso a storage.

### 6.3 Funcionalidades del contenedor

| Funcionalidad | MVP | Detalle |
|---------------|-----|---------|
| iframe apuntando a `external_url` | ✅ | Carga el juego desde su dominio |
| Pantalla de carga con branding | ✅ | Spinner + nombre/color del juego |
| Botón "Volver al Lobby" | ✅ | Con confirmación si el juego está activo |
| Botón de pantalla completa | ✅ | Fullscreen API |
| Estado de error (juego caído) | ✅ | Timeout, iframe error, red caída |
| Comunicación postMessage | ✅ | Solo mensajes de ciclo de vida del juego |
| Overlay estadísticas en vivo | 🔮 | Post-MVP |
| Overlay chat / social | 🔮 | Post-MVP |

### 6.4 Props desde `games` table

El contenedor lee de la tabla `games`:

```
external_url      → src del iframe
orientation       → aspect ratio / clases CSS
name              → título en la UI
color             → color de la interfaz del contenedor
status            → badge ("beta", "mantenimiento")
allowed_origins   → para validar origen de mensajes postMessage
```

---

## 7. SDK de comunicación

### 7.1 Propósito

El SDK `@juegahiphop/sdk` es exclusivamente un protocolo de comunicación entre el Lobby y los juegos vía `postMessage`.

**NO contiene:**
- Helpers de Supabase (cada juego tiene los suyos)
- Lógica de negocio
- Auth compartida

### 7.2 Formato de mensajes

```typescript
interface JuegaHipHopMessage {
  type: string
  payload?: unknown
  timestamp: number
  source: 'lobby' | 'game'
  gameId?: string
}
```

### 7.3 Mensajes Game → Lobby

#### Ciclo de vida (fire-and-forget)

| Tipo | Cuándo | Payload |
|------|--------|---------|
| `jh:game_ready` | El juego terminó de cargar | `{ version: string }` |
| `jh:game_started` | El usuario empezó una partida | `{ sessionId?, levelId?, difficulty? }` |
| `jh:game_completed` | Partida terminada | `{ score, itemId?, difficulty?, timeSpent?, completed?, metadata? }` |
| `jh:score_updated` | Puntaje cambió en vivo | `{ score, progress? }` |
| `jh:request_fullscreen` | El juego pide pantalla completa | — |
| `jh:exit_game` | El juego solicita volver al lobby | `{ reason?, saveBeforeExit? }` |
| `jh:error` | Error en el juego | `{ code, message, fatal }` |

#### Persistencia (request/response — devuelven promesa)

| Tipo | Cuándo | Payload | Respuesta |
|------|--------|---------|-----------|
| `jh:save_progress` | El juego quiere guardar estado | `{ gameState, score?, metadata? }` | `jh:save_result` |
| `jh:load_progress` | El juego quiere cargar estado guardado | `{ schemaVersion? }` | `jh:progress_data` |
| `jh:unlock_achievement` | El juego desbloquea un logro | `{ achievementId, metadata? }` | `jh:achievement_result` |
| `jh:campaign_request` | El juego pide campaña recompensada | `{ placement, rewardIds, metadata? }` | `jh:campaign_response` |

### 7.4 Mensajes Lobby → Game

| Tipo | Cuándo | Payload |
|------|--------|---------|
| `jh:session_context` | Después de game_ready — contexto del usuario | `{ userId, displayName?, avatarUrl?, level?, xp?, locale?, isGuest, sessionId, capabilities? }` |
| `jh:save_result` | Respuesta a save_progress | `{ requestId, success, error? }` |
| `jh:progress_data` | Respuesta a load_progress | `{ requestId, success, gameState, bestScore?, schemaVersion?, error? }` |
| `jh:achievement_result` | Respuesta a unlock_achievement | `{ requestId, success, alreadyUnlocked?, xpAwarded?, error? }` |
| `jh:campaign_response` | Respuesta a campaign_request | `{ requestId, status, campaignId?, rewardedIds?, message? }` |
| `jh:pause` | El lobby pausa el juego | — |
| `jh:resume` | El lobby reanuda el juego | — |
| `jh:end_session` | El lobby cierra la sesión | `{ reason? }` |

### 7.6 Uso dentro del juego (iframe)

```typescript
import { createLobbyClient } from '@juegahiphop/sdk'

const lobby = createLobbyClient()

// Anunciar que el juego está listo
lobby.onReady({ version: '1.0.0' })

// Escuchar eventos del lobby
lobby.onPause(() => { /* pausar juego */ })
lobby.onResume(() => { /* reanudar */ })

// Enviar eventos
lobby.sendGameCompleted({ score: 1000, itemId: 'nivel-3' })
lobby.sendExitGame({ reason: 'user_quit' })
```

### 7.7 Uso en el Lobby (GameContainer)

```typescript
import { createGameClient } from '@juegahiphop/sdk'

const gameClient = createGameClient(iframeRef, game.allowed_origins)

gameClient.onGameReady(() => { /* ocultar loading */ })
gameClient.onGameCompleted(async (data) => {
  // El lobby puede opcionalmente refrescar datos de Supabase
  await refreshGameProgress(slug)
})
gameClient.onError((data) => { /* mostrar error */ })
gameClient.onExitGame(() => { /* volver al lobby */ })
```

---

## 8. Auth Flow

### 8.1 Principio: el lobby gestiona la auth

En el modelo 3.0, **el lobby es el único que maneja la autenticación.**

```
┌───────────────────────────────────────────────────────────────────┐
│                           PRINCIPIO                                │
│                                                                    │
│  El lobby tiene su sesión Supabase (SSR con cookies).             │
│  El lobby envía el contexto de sesión al juego vía postMessage.    │
│  Los juegos NO tienen cliente Supabase ni manejan auth.            │
│  Los juegos NO ven tokens ni credenciales.                         │
│                                                                    │
│  El juego recibe: userId, displayName, avatarUrl, level, isGuest. │
│  Si isGuest=true, el juego funciona en modo demostración.         │
└───────────────────────────────────────────────────────────────────┘
```

### 8.2 Cómo funciona

1. El usuario se autentica en el lobby (login/Google)
2. El lobby crea el iframe del juego
3. El juego envía `jh:game_ready`
4. El lobby responde con `jh:session_context` (userId, displayName, avatarUrl, level, isGuest, sessionId)
5. El juego usa esos datos para personalizar la experiencia
6. Si el usuario no está autenticado → `isGuest: true` → el juego funciona en modo demo

> Los juegos NO necesitan cliente Supabase, ni OAuth, ni manejo de sesión. Solo usan el contexto que el lobby les envía.

---

## 9. Flujo Lobby ↔ Juego

```
LOBBY (juegahiphop.cl)              JUEGO (fighters.juegahiphop.cl)
│                                        │
│ 1. Usuario hace clic en "JUGAR"        │
│    → navega a /jugar/fighters          │
│                                        │
│ 2. GameContainer se renderiza          │
│    → muestra pantalla de carga         │
│    → valida external_url               │
│    → crea iframe con sandbox+allow     │
│                                        │
│ 3.                              iframe carga
│                                  El juego arranca (stateless)
│                                  No inicializa Supabase
│                                  No maneja auth
│                                        │
│ 4.                           ←── jh:game_ready ──
│                                        │
│ 5. Lobby crea sesión en Supabase       │
│    Lobby consulta perfil del jugador   │
│    Lobby envía contexto + progreso:    │
│        ── jh:session_context ──→        │
│        ── jh:progress_data ───→        │
│                                        │
│ 6.                      ═════ JUEGO ═══
│                      (el usuario juega)
│                      El juego guarda/carga
│                      vía postMessage al lobby
│                                        │
│ 7.                           ←── jh:save_progress ──
│    Lobby escribe game_state en Supabase │
│        ── jh:save_result ──────→        │
│                                        │
│ 8.                           ←── jh:game_completed ──
│    Lobby escribe game_completions       │
│    Lobby actualiza player_profiles      │
│                                        │
│ 9.                           ←── jh:unlock_achievement ──
│    Lobby escribe achievement_unlocks    │
│        ── jh:achievement_result ─→      │
│                                        │
│10.                           ←── jh:exit_game ──
│    Lobby cierra sesión en Supabase      │
│    → redirige a /                       │
```

### Puntos clave

- **El juego NUNCA toca Supabase.** Todo va por postMessage al lobby.
- **El lobby persiste todo.** game_state, game_completions, achievement_unlocks, game_sessions.
- **El juego es stateless.** No tiene cliente Supabase, no maneja auth, no persiste nada localmente (puede usar localStorage como cache temporal, pero el lobby es la fuente de verdad).
- **postMessage transporta las solicitudes de persistencia.** El juego le pide al lobby que guarde/cargue, y el lobby responde con confirmaciones.
- **El juego funciona dentro del iframe.** No hay código condicional del tipo "if inside iframe".
- **SDK con request/response.** saveProgress, loadProgress, unlockAchievement devuelven promesas que se resuelven cuando el lobby confirma.

---

## 10. Catálogo dinámico

### 10.1 La tabla `games` es la fuente de verdad

No más `const GAMES = [...]` hardcodeado.

```typescript
// En el lobby, al cargar:
const { data: games } = await supabase
  .from('games')
  .select('*')
  .in('status', ['active', 'beta'])
  .order('sort_order', { ascending: true })
```

### 10.2 Cómo agregar un nuevo juego

```
1. Desarrollar el juego en su propio repo
2. Hacer deploy a su propia URL (Firebase Hosting o App Hosting)
3. Insertar un registro en Supabase:

INSERT INTO games (slug, name, emoji, short_description, color,
                   external_url, status, orientation, allowed_origins)
VALUES (
  'mi-juego',
  'Mi Juego',
  '🎯',
  'Descripción corta',
  '#FF5733',
  'https://mijuego.juegahiphop.cl',
  'active',
  'landscape',
  ARRAY['https://mijuego.juegahiphop.cl']
);
```

El juego aparece automáticamente. Sin deploy del lobby. Sin cambios de código.

### 10.3 GameDefinition (typescript)

```typescript
interface GameCatalogEntry {
  id: string
  slug: string
  name: string
  emoji: string
  short_description: string
  description: string | null
  image_url: string | null
  color: string
  accent_color: string | null
  status: 'active' | 'beta' | 'coming_soon' | 'maintenance' | 'hidden'
  featured: boolean
  orientation: 'landscape' | 'portrait' | 'any'
  external_url: string
  category: string
  sort_order: number
  total_items: number | null
  progress_label: string | null
  allowed_origins: string[]
  release_date: string | null
}
```

---

## 11. Seguridad del contenedor

### 11.1 Validación de URLs

Antes de crear el iframe, el lobby valida que `external_url`:

- Use HTTPS (`https://`)
- Sea un dominio permitido (lista blanca configurable)
- No contenga caracteres peligrosos (XSS via `javascript:`)
- Haga match con el patrón esperado (`https://*.juegahiphop.cl` o lista explícita)

```typescript
const ALLOWED_URL_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.juegahiphop\.cl$/,
]

function validateGameUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' &&
      ALLOWED_URL_PATTERNS.some(pattern => pattern.test(parsed.origin))
  } catch {
    return false
  }
}
```

### 11.2 Validación de origen en postMessage

**Nunca se usa `targetOrigin = '*'`** ni `event.origin` sin verificar.

```typescript
// En el LOBBY (GameContainer)
const gameClient = createGameClient(iframeRef, game.allowed_origins)
// Internamente:
window.addEventListener('message', (event) => {
  if (!game.allowed_origins.includes(event.origin)) return
  // procesar mensaje
})

// En el JUEGO (lobby-client.ts)
lobby.sendGameCompleted(data)  // targetOrigin = lobbyOrigin (configurado)
```

- El lobby valida `event.origin` contra la columna `allowed_origins` de la tabla `games`
- El juego usa `targetOrigin` fijo (el origen del lobby), nunca `'*'`
- Ambos lados verifican el `source` del mensaje (`'lobby'` o `'game'`)

### 11.3 Política del iframe

```tsx
<iframe
  src={validatedUrl}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation"
  allow="fullscreen; autoplay; clipboard-write; gamepad; gyroscope; accelerometer"
/>
```

### 11.4 Tiempo de espera (timeout)

- Si el juego no envía `jh:game_ready` en 15 segundos → mostrar error "Juego no responde"
- Si el iframe carga con error HTTP → detectar via `onError` del iframe → mostrar pantalla de error
- Si hay error fatal del juego (`jh:error` con `fatal: true`) → mostrar pantalla de error con opción de reintentar

---

## 12. Despliegue en Firebase

### 12.1 Proyecto Firebase único

Un solo proyecto Firebase con múltiples targets/sitios. Cada proyecto frontend se despliega de forma independiente.

### 12.2 Mapa de despliegues (MVP)

| Proyecto | Tipo | Firebase Target | URL |
|----------|------|----------------|-----|
| Lobby | Firebase App Hosting | `lobby` | lobby.juegahiphop.cl |
| PuzzleHH | Firebase App Hosting | `puzzle` | puzzle.juegahiphop.cl |
| HHFighters | Firebase Hosting | `fighters` | fighters.juegahiphop.cl |
| SopaDeltas | Firebase Hosting | `sopa` | sopa.juegahiphop.cl |

### 12.3 Despliegue independiente

```bash
# Lobby (solo cuando cambia el lobby)
cd lobby
firebase deploy --only apphosting:lobby

# PuzzleHH (solo cuando cambia puzzle)
cd puzzlehh
firebase deploy --only apphosting:puzzle

# HHFighters (solo cuando cambia fighters)
cd hhfighters
npm run build && firebase deploy --only hosting:fighters

# Sopa (solo cuando cambia sopa)
cd sopadeletras
npm run build && firebase deploy --only hosting:sopa
```

### 12.4 firebase.json (lobby — App Hosting)

```json
{
  "apphosting": {
    "lobby": {
      "source": ".",
      "ignore": ["node_modules", ".next"]
    }
  }
}
```

### 12.5 firebase.json (SPA — Hosting)

```json
{
  "hosting": {
    "target": "fighters",
    "public": "dist",
    "ignore": ["firebase.json", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

---

## 13. Ambientes: desarrollo y producción

### 13.1 Supabase

| Ambiente | Proyecto Supabase | URL | Propósito |
|----------|------------------|-----|-----------|
| **Producción** | `foidlmqxshklejyxsymf` (existente) | https://foidlmqxshklejyxsymf.supabase.co | Datos reales de usuarios |
| **Desarrollo** | Proyecto separado (a crear) | `juegahiphop-dev.supabase.co` | Pruebas, migraciones, desarrollo |

**Estrategia:**
- El proyecto de desarrollo se usa para migraciones y pruebas
- Las migraciones se versionan en el lobby (`supabase/migrations/`)
- Se aplican primero en dev, después en prod
- Cada proyecto frontend tiene su `.env.local` apuntando a su ambiente

### 13.2 Firebase

| Ambiente | Proyecto Firebase | URLs |
|----------|------------------|------|
| **Producción** | `juegahip-hop` (único proyecto) | lobby.juegahiphop.cl, puzzle.juegahiphop.cl, etc. |
| **Desarrollo** | Segundo proyecto Firebase o emuladores | lobby-dev.juegahiphop.cl (o localhost) |

**Estrategia (MVP):**
- Desarrollo local: `localhost:3000` + Supabase dev
- Preview/QA: Firebase Hosting preview channels
- Producción: Firebase App Hosting con dominios reales

### 13.3 Variables de entorno por proyecto

**Lobby (`.env.local`):**
```
# Producción
NEXT_PUBLIC_SUPABASE_URL=https://foidlmqxshklejyxsymf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Desarrollo (local)
# NEXT_PUBLIC_SUPABASE_URL=https://juegahiphop-dev.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Juegos (`.env`):**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 14. Convenciones

### 14.1 Código

- **TypeScript estricto** en todos los proyectos
- **ESLint** en todos los proyectos
- **Path aliases**: `@/` → `src/` en lobby y juegos Next.js
- **Componentes**: React Server Components por defecto en lobby, Client Components solo cuando hay interactividad

### 14.2 Supabase

- **Tabla `games`** es la única fuente de verdad para el catálogo
- **Cada juego usa `game_id`** consistente (slug del juego en minúsculas) en `game_state` y `game_completions`
- **game_state** almacena estado serializable como JSONB — cada juego define su propia estructura interna
- **Consultas**: usar `select()` / `get()` al montar el componente. Refetch después de escrituras relevantes. No usar suscripciones en tiempo real a menos que sea estrictamente necesario para la funcionalidad
- **RLS siempre activo** — cada usuario solo ve sus propios datos

### 14.3 Comunicación SDK

- **Prefijo `jh:`** en todos los tipos de mensaje para evitar colisiones
- **Timestamp** en cada mensaje
- **Source** siempre presente (`'lobby'` o `'game'`)
- **Validación estricta de origen** (nunca `'*'`)
- **Sin datos sensibles** en los mensajes (no tokens, no contraseñas)

### 14.4 Catálogo

- **slug** en minúsculas, kebab-case, sin espacios
- **external_url** apunta al dominio público del juego, siempre HTTPS
- **allowed_origins** lista explícita de orígenes válidos para postMessage
- **status** controla visibilidad en el lobby

### 14.5 Juegos

- Los juegos son **stateless** desde el punto de vista del backend
- **NO tienen cliente Supabase** ni manejan auth
- Persistencia: el juego le pide al lobby que guarde/cargue vía postMessage (SDK)
- El lobby es la fuente de verdad para todos los datos del juego
- Puede usar localStorage como cache temporal, pero el lobby es la verdad
- No hay código condicional del tipo `if (window.parent !== window)` dentro del juego

---

## 15. MVP — Alcance y plan de integración

### 15.1 Alcance del MVP

El MVP se enfoca exclusivamente en:

1. ✅ **Tabla `games`** en Supabase (migración 00003)
2. ✅ **Catálogo dinámico** — lobby lee juegos desde Supabase en lugar de hardcode
3. ✅ **Ruta `/jugar/[slug]`** — única ruta de juego (eliminar/redirigir `/juego/[slug]`)
4. ✅ **GameContainer** — iframe con:
   - Pantalla de carga (spinner + branding del juego)
   - Validación de URL y origen
   - Sandbox/allow attributes correctos
   - Timeout y manejo de errores
   - Botón Volver al Lobby
   - Botón de pantalla completa
5. ✅ **SDK `@juegahiphop/sdk`** — solo mensajes postMessage del ciclo de vida:
   - `jh:game_ready`, `jh:game_started`, `jh:game_completed`, `jh:exit_game`, `jh:error`
6. ✅ **Integración piloto con UN juego** (PuzzleHH como primer candidato)
7. ✅ **Actualización de GameCard** para usar progreso desde Supabase

**Fuera del MVP:**
- ❌ Auth unificada (post-MVP)
- ❌ Rankings globales
- ❌ Noticias / blog
- ❌ Comunidad / perfiles públicos
- ❌ Eventos / temporadas / misiones
- ❌ Overlays en vivo durante el juego
- ❌ Logros cross-game
- ❌ Integración de los otros dos juegos (se agregan cuando el piloto esté estable)

### 15.2 Estrategia de integración: un juego piloto

**No integrar los tres juegos simultáneamente.**

1. Implementar todo el pipeline con **PuzzleHH** como juego piloto
2. Verificar que funciona:
   - Carga en iframe
   - postMessage funciona
   - El juego es autónomo (abriendo directamente)
   - El contenedor maneja loading/error/back/fullscreen
3. Cuando el piloto esté 100% estable, integrar los otros juegos uno por uno

**Criterios para considerar el piloto exitoso:**
- ✅ iframe carga correctamente con sandbox/allow
- ✅ postMessage bidireccional funciona (game_ready, game_completed)
- ✅ Volver al lobby funciona sin errores
- ✅ Pantalla completa funciona
- ✅ El juego funciona standalone (abriendo su URL directa)
- ✅ Estados de error se muestran correctamente

### 15.3 Tablero de tareas — Fase 1 (MVP)

#### Bloque A: Fundación en Supabase

| # | Tarea | Descripción | Depende de |
|---|-------|-------------|------------|
| A1 | Crear migración 00003 | SQL con tabla `games`, RLS, índices | — |
| A2 | Aplicar migración en Supabase dev | Ejecutar migración en proyecto de desarrollo | A1 |
| A3 | Seed de juegos existentes | Insertar los 3 juegos actuales en la tabla `games` | A1 |
| A4 | Actualizar tipos TypeScript | `GameCatalogEntry` desde la nueva estructura | — |

#### Bloque B: Catálogo dinámico (lobby)

| # | Tarea | Descripción | Depende de |
|---|-------|-------------|------------|
| B1 | Reemplazar GAMES hardcodeado | LobbyClient lee de Supabase `games` table | A3, A4 |
| B2 | Adaptar GameCard | Aceptar datos desde `games` table | B1 |
| B3 | Calcular progreso desde Supabase | Leer `game_state` por `game_id` | B1 |

#### Bloque C: SDK de comunicación

| # | Tarea | Descripción | Depende de |
|---|-------|-------------|------------|
| C1 | Crear paquete `@juegahiphop/sdk` | package.json, tsconfig, build config | — |
| C2 | Implementar tipos del protocolo | `JuegaHipHopMessage`, tipos de mensajes | — |
| C3 | Implementar `lobby-client.ts` | Cliente para usar dentro del juego (iframe) | C2 |
| C4 | Implementar `game-container.ts` | Cliente para usar en el lobby | C2 |
| C5 | Validación de orígenes | `allowed_origins`, `targetOrigin` exacto | C2 |

#### Bloque D: GameContainer

| # | Tarea | Descripción | Depende de |
|---|-------|-------------|------------|
| D1 | Ruta `/jugar/[slug]` | Nueva ruta en Next.js App Router | — |
| D2 | Componente GameContainer | iframe + sandbox + allow + estados | C4 |
| D3 | Pantalla de carga | Spinner, nombre/color del juego | D2 |
| D4 | Manejo de errores | Timeout, error HTTP, error fatal | D2 |
| D5 | Botón Volver al Lobby | Con confirmación | D2 |
| D6 | Botón de pantalla completa | Fullscreen API | D2 |
| D7 | Validación de URL del juego | `validateGameUrl()` | D1 |

#### Bloque E: Integración piloto (PuzzleHH)

| # | Tarea | Descripción | Depende de |
|---|-------|-------------|------------|
| E1 | Integrar SDK en PuzzleHH | Agregar `@juegahiphop/sdk`, enviar mensajes | C3, D2 |
| E2 | Probar flujo completo | iframe → game_ready → game_completed → exit | E1 |
| E3 | Probar autonomía del juego | PuzzleHH funciona standalone fuera del iframe | E1 |
| E4 | Probar errores | Timeout, URL inválida, iframe caído | E1 |

#### Bloque F: Limpieza y estabilización

| # | Tarea | Descripción | Depende de |
|---|-------|-------------|------------|
| F1 | Redirigir `/juego/[slug]` → `/jugar/[slug]` | 301 redirect o componente de redirección | D1 |
| F2 | Remover hardcode de GAME_MAP viejo | Eliminar `GAME_MAP` de juego/[slug] | F1 |
| F3 | Prueba integral | MVP completo funcional con PuzzleHH | E2, F2 |
| F4 | Aplicar migración a Supabase producción | Después de pruebas en dev | A2 |

---

## 16. Roadmap post-MVP

Después de que el MVP esté estable y probado con PuzzleHH:

### Fase 2: Expansión de juegos
- Integrar SopaDeltas (mismo patrón que PuzzleHH)
- Integrar HHFighters (mismo patrón)
- Verificar consistencia cross-game

### Fase 3: Auth unificada (evaluar)
- Investigar cookies SSR cross-subdominio
- Si es viable: implementar puente postMessage con solo accessToken
- Si no es viable: mantener sesiones independientes

### Fase 4: Plataforma
- Rankings globales
- Página de logros dedicada
- Estadísticas detalladas
- Configuración de usuario

### Fase 5: Comunidad y eventos
- Noticias / blog
- Temporadas y eventos
- Misiones y recompensas
- Perfiles públicos
- Overlays en vivo durante el juego

---

## Apéndice: Estado actual del ecosistema

### Lo que YA funciona

| Componente | Estado |
|-----------|--------|
| Auth (email + Google) | ✅ SSR con cookies |
| Home / Hero | ✅ Diseño street art completo |
| GameCard (3 juegos) | ✅ Hardcodeado, funcional |
| Perfil | ✅ Stats + logros desde Supabase |
| Header | ✅ Nav + avatar + nivel |
| Login/Register | ✅ Formulario completo |
| Supabase client/server | ✅ SSR + browser |
| Middleware auth | ✅ Protege rutas |
| Auth callback | ✅ OAuth redirect |
| Supabase schema (00001, 00002) | ✅ Migrado (shared tables) |

### Lo que hay que crear/modificar (MVP)

| Componente | Cambio | Prioridad |
|-----------|--------|-----------|
| **`games` table (migración 00003)** | NUEVA — migración Supabase | A |
| **Catálogo dinámico** | MODIFICAR — de hardcodeado a query Supabase | B |
| **`@juegahiphop/sdk`** | NUEVO — paquete npm (solo comunicación) | C |
| **GameContainer** | NUEVO — ruta `/jugar/[slug]` + iframe | D |
| **Integración PuzzleHH (piloto)** | MODIFICAR — agregar SDK al juego | E |
| **`/juego/[slug]`** | ELIMINAR o redirigir a `/jugar/[slug]` | F |
| **GAME_MAP hardcodeado** | ELIMINAR — reemplazar con datos de Supabase | F |
