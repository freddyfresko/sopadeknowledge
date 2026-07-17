# Sopa de Knowledge — Plan de Desarrollo Profesional

> **Versión:** 1.0  
> **Proyecto:** JuegaHipHop Ecosystem  
> **Stack:** Vite 8 + React 19 + TypeScript 6 + Tailwind CSS 4  
> **Repositorio:** `E:\dev\JuegaHipHop\sopadeletras`

---

## Índice

1. [Visión del Producto](#1-visión-del-producto)
2. [Arquitectura Técnica](#2-arquitectura-técnica)
3. [Identidad Visual](#3-identidad-visual)
4. [Fase 1 — Fundación Visual & Game Feel](#4-fase-1--fundación-visual--game-feel)
5. [Fase 2 — Mecánicas de Juego](#5-fase-2--mecánicas-de-juego)
6. [Fase 3 — Progresión & Retención](#6-fase-3--progresión--retención)
7. [Fase 4 — Plataforma JuegaHipHop](#7-fase-4--plataforma-juegahiphop)
8. [Contenido & Pipeline](#8-contenido--pipeline)
9. [Testing & QA](#9-testing--qa)
10. [Deployment & Distribución](#10-deployment--distribución)
11. [Roadmap Temporal](#11-roadmap-temporal)

---

## 1. Visión del Producto

### 1.1 Propósito

Sopa de Knowledge es **la biblioteca interactiva más grande sobre cultura hip hop**, presentada como un juego de sopa de letras. Cada partida enseña algo nuevo: historia, artistas, técnicas, conceptos. No es un juego educativo tradicional — es una experiencia de juego real que casualmente educa.

### 1.2 Público Objetivo

| Segmento | Edad | Motivación | Tono |
|----------|------|------------|------|
| Niños descubriendo el hip hop | 8–14 | Colores vibrantes, logros fáciles, personajes | Amigable, colorido |
| Jóvenes y adultos hip hop | 15–35 | Profundidad de contenido, desafío, respeto cultural | Auténtico, callejero |
| Old school / veteranos | 35+ | Nostalgia, conocimiento profundo, rarezas | Respetuoso, histórico |

### 1.3 Diferenciación vs sopas de letras tradicionales

| Aspecto | Sopa tradicional | Sopa de Knowledge |
|---------|-----------------|-------------------|
| Tema | Genérico (animales, países) | Universo hip hop |
| Feedback | Marcar palabra | Card con historia + importancia + fun fact |
| Progresión | Ninguna | XP, niveles, categorías desbloqueables, logros |
| Contenido | Estático | Enciclopedia creciente que el jugador construye |
| Rejugabilidad | Baja (misma sopa siempre) | Alta (daily challenge, modos, categorías) |
| Identidad visual | Genérica | Hip hop: graffiti, colores vibrantes, tipografía bold |

---

## 2. Arquitectura Técnica

### 2.1 Stack

```
Frontend:     Vite 8 + React 19 + TypeScript 6
Estilos:      Tailwind CSS 4 (@tailwindcss/vite plugin)
Sonido:       Howler.js 2.x
PWA:          vite-plugin-pwa (workbox)
Estado:       React Context (progreso, audio, tema) + localStorage
Grid:         DOM con CSS Grid (12×12)
Animaciones:  CSS keyframes + transiciones nativas
Fuentes:      Google Fonts (Archivo Black + Inter)
```

### 2.2 Estructura del proyecto (final)

```
sopadeletras/
├── public/
│   ├── icons/             # PWA icons (192, 512, maskable)
│   ├── sounds/             # SFX + BGM (mp3/ogg)
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── main.tsx
│   ├── index.css           # Tailwind + tema global
│   ├── App.tsx             # Router de tabs + orquestación
│   ├── game/
│   │   ├── types.ts        # Interfaces del negocio
│   │   ├── engine.ts       # Grid generator, word detection, seed RNG
│   │   ├── word-utils.ts   # Búsqueda, filtros, utilidades
│   │   └── progression.ts  # XP, niveles, logros, streak
│   ├── data/
│   │   ├── words.ts        # Palabras con knowledge cards (crece con el tiempo)
│   │   └── achievements.ts # Definiciones de logros
│   ├── components/
│   │   ├── Header.tsx       # Barra superior con nivel, XP, enciclopedia
│   │   ├── TabBar.tsx       # Navegación: Jugar, Diario, Progreso
│   │   ├── Board.tsx        # Grid interactivo con pointer events
│   │   ├── WordList.tsx     # Lista de palabras a encontrar (agrupadas)
│   │   ├── KnowledgeCard.tsx # Modal de descubrimiento
│   │   ├── Encyclopedia.tsx # Colección de palabras descubiertas
│   │   ├── CategoryUnlock.tsx # Modal celebración nuevo contenido
│   │   ├── SplashScreen.tsx # Pantalla de carga inicial
│   │   ├── ScorePopup.tsx   # +10 XP flotante animado
│   │   └── ParticleBurst.tsx # Efecto partículas al encontrar
│   ├── hooks/
│   │   ├── useGame.ts      # Lógica del grid + selección
│   │   ├── useAudio.ts     # Howler.js wrapper (SFX + BGM)
│   │   └── useProgression.ts # XP, niveles, streak management
│   ├── context/
│   │   └── GameContext.tsx  # Estado global (progreso, audio config)
│   └── assets/
│       ├── logo.svg        # Logo Sopa de Knowledge
│       └── patterns/       # Texturas SVG para backgrounds
├── dist/                   # Build de producción
├── PLAN.md                 # Este documento (vivo)
├── CHANGELOG.md            # Registro de cambios por versión
└── package.json
```

### 2.3 Flujo de datos

```
User interaction (pointer events)
  → Board.tsx (registra selección de letras)
  → engine.checkWord() (valida si forma palabra válida)
  → Si acierta:
      → progression.addXp()
      → progression.recordWord()
      → saveProgress() (localStorage)
      → KnowledgeCard muestra ficha
      → ParticleBurst + SFX
      → ScorePopup anima XP
  → Si completa nivel:
      → TabBar muestra badge "Completado"
      → Botón "Siguiente nivel"

Daily Challenge:
  → getDailySeed() genera seed por fecha
  → pickWordsForGame() selecciona N palabras de las categorías disponibles
  → Misma lógica que modo libre pero grid más pequeño (10×10)
  → Al completar: marca lastDaily = today, streak++
```

### 2.4 Data Layer

**localStorage schema:**

```json
{
  "sopa-knowledge-progress": {
    "xp": 450,
    "level": 3,
    "wordsFound": [
      {"word": "BBOY", "category": "breaking", "timestamp": 1712345678000},
      {"word": "FLOW", "category": "mcing", "timestamp": 1712345690000}
    ],
    "unlockedCategories": ["breaking", "mcing", "djing", "graffiti", "historia"],
    "dailyStreak": 5,
    "lastDaily": "2026-7-16",
    "totalGames": 12,
    "totalWordsFound": 45,
    "achievements": ["first_word", "tenth_word"],
    "settings": {
      "soundEnabled": true,
      "musicEnabled": true,
      "musicVolume": 0.5,
      "sfxVolume": 0.8
    }
  }
}
```

---

## 3. Identidad Visual

### 3.1 Paleta de Colores

```css
/* Sistema: JuegaHipHop Global */
--color-hiphop-50:  #fff7ed;
--color-hiphop-100: #ffedd5;
--color-hiphop-200: #fed7aa;
--color-hiphop-300: #fdba74;
--color-hiphop-400: #fb923c;
--color-hiphop-500: #f97316;   /* Primary */
--color-hiphop-600: #ea580c;
--color-hiphop-700: #c2410c;
--color-hiphop-800: #9a3412;
--color-hiphop-900: #7c2d12;

/* Acento Sopa de Knowledge */
--color-gold:       #fbbf24;
--color-gold-dark:  #d97706;
--color-surface:    #151225;   /* Fondo oscuro principal */
--color-panel:      #1e1b2e;   /* Paneles/cartas */
--color-card:       #2a2640;   /* Cards */
--color-text:       #e2dff0;   /* Texto principal */
--color-text-dim:   #8a86a0;   /* Texto secundario */
```

### 3.2 Tipografía

- **Títulos, branding**: `Archivo Black` (900 weight, uppercase afectado)
- **Cuerpo, UI**: `Inter` (400-800 weight)

### 3.3 Componentes visuales clave

#### Logo
- Texto "SOPA DE" en Inter regular + "KNOWLEDGE" en Archivo Black
- Colores degradado: `#f97316` → `#fbbf24`
- Acompañado del ílogo JuegaHipHop como marca de agua

#### Board Cell (loseta de letra)
- Fondo: gradiente sutil, borde redondeado (md: 8px, mobile: 4px)
- No seleccionada: `bg-white/5`, texto `text-white/40`
- Seleccionada: `bg-hiphop-500/40`, escala 1.05
- Encontrada: gradiente `from-hiphop-600/60 to-hiphop-800/60`, sombra interior
- Animación cell-found: scale bounce 1.3 → 1.0 al descubrir

#### Knowledge Card
- Fondo: `bg-panel` con borde sutil
- Header: ícono de categoría + badge de categoría
- Título: Archivo Black, tamaño grande
- Cuerpo: descripción en texto claro
- Importancia: card con fondo más oscuro
- Fun Fact: card con borde `hiphop-800/30`
- Entrada: slide-up 0.4s

#### Splash Screen
- Logo centrado con animación de entrada (fade-in + scale-up)
- Loading bar inferior animada
- Duración: 2s (suficiente para cargar sonidos)

---

## 4. Fase 1 — Fundación Visual & Game Feel

**Objetivo:** Que el juego SE VEA como un juego, no como un web app.

### 4.1 Assets gráficos

| ID | Asset | Formato | Técnica |
|----|-------|---------|---------|
| A1 | Logo principal | `src/assets/logo.svg` | SVG inline con texto estilizado |
| A2 | Favicon | `public/favicon.svg` | Simplificación del logo |
| A3 | Pattern background | `src/index.css` | CSS radial-gradient + SVG pattern overlay |
| A4 | Splash screen | `src/components/SplashScreen.tsx` | Logo centrado + loading bar, timeout 2s |
| A5 | Tile cell focus glow | CSS | Box-shadow con animación pulse |
| A6 | Iconos categoría | Emoji → SVG inline | Gradientes + fill por categoría |

### 4.2 Sonido (Howler.js)

**Dependencia:** `npm install howler`

**Archivos de sonido** (descargar de freesound.org o generarlos):

| Archivo | Uso | Duración | Loop |
|---------|-----|----------|------|
| `public/sounds/select.mp3` | Al hacer pointer down en letra | 0.1s | No |
| `public/sounds/found.mp3` | Al encontrar palabra | 0.5s | No |
| `public/sounds/levelup.mp3` | Al subir de nivel | 1.5s | No |
| `public/sounds/unlock.mp3` | Al desbloquear categoría | 1.0s | No |
| `public/sounds/complete.mp3` | Nivel completado | 2.0s | No |
| `public/sounds/bgm.mp3` | Música de fondo (instrumental hip hop) | 30s+ | Sí |

**Hook `useAudio.ts`**:
- Carga los sonidos con `Howl` al montar
- Expone: `play(sfxName)`, `toggleMusic()`, `toggleSfx()`
- Respeta mute state global desde localStorage
- Primer play: necesita user gesture (autoplay policy)

### 4.3 PWA

**Dependencia:** `npm install -D vite-plugin-pwa`

**Config:**
```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['sounds/*.mp3', 'icons/*.svg'],
  manifest: {
    name: 'Sopa de Knowledge',
    short_name: 'SopaKnowledge',
    description: 'Aprende hip hop mientras encuentras palabras',
    theme_color: '#151225',
    background_color: '#0d0b1a',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,mp3}'],
  },
})
```

**Icons PWA:** Generar con `npx pwa-asset-generator` o Canva.

### 4.4 Game Feel

**Score floating:**
```tsx
// Componente ScorePopup: aparece "+10" animado y desaparece
<div className="absolute text-hiphop-400 font-heading text-xl animate-score-float">
  +{amount} XP
</div>
```

**Partículas al encontrar:**
```tsx
// ParticleBurst: 8-12 cuadrados diminutos con animación radial
// CSS: @keyframes particle { to { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; } }
<div className="absolute inset-0 pointer-events-none">
  {Array.from({ length: 8 }, (_, i) => (
    <div key={i} className="particle" style={{
      '--dx': `${Math.cos(i * Math.PI / 4) * 40}px`,
      '--dy': `${Math.sin(i * Math.PI / 4) * 40}px`,
      background: colors[i % colors.length],
    }} />
  ))}
</div>
```

**Haptic feedback:**
```ts
navigator.vibrate?.(10) // al seleccionar letra
navigator.vibrate?.(30) // al encontrar palabra
```

---

## 5. Fase 2 — Mecánicas de Juego

### 5.1 Modo Clásico (existente)

Mejoras sobre lo actual:
- **Dificultad adaptativa**: nivel 1-3: grid 10×10, 8 palabras. Nivel 4-10: 12×12, 12 palabras. Nivel 10+: 14×14, 16 palabras.
- **Selección de dificultad** al empezar (Fácil / Normal / Difícil cambia tamaño grid y cantidad palabras)
- **Timer opcional**: toggle para jugar con/sin tiempo
- **Hints gratis**: 1 hint por nivel, +1 hint extra por ver un anuncio (preparar arquitectura)

### 5.2 Modo Contrarreloj (nuevo, ~100 líneas)

**Mecánica:**
- Grid 10×10
- Las palabras aparecen UNA POR UNA (no la lista completa)
- 60 segundos en el reloj
- Cada palabra encontrada: +15 segundos
- Cada error: timeout de 2s (no se puede seleccionar)
- Score: 100pts × multiplicador de tiempo restante
- Game over: timer llega a 0

**Toque visual:**
- Timer grande en el centro superior, rojo cuando < 15s
- Animación de pulso cuando el tiempo se acaba
- Score final con desglose

### 5.3 Modo Categorías (nuevo, ~80 líneas)

**Mecánica:**
- Antes de empezar: elige una categoría desbloqueada
- Grid 8×8 con 5-6 palabras solo de esa categoría
- Knowledge card se muestra doble: ficha normal + progreso de esa categoría
- XP bonus: 15xp por palabra (vs 10xp normal)

### 5.4 Daily Challenge (existente)

Mejoras:
- Marcar visualmente las palabras encontradas con un check ✅
- Streak counter con fuego animado 🔥
- Bonus racha: 3 días → +50xp bonus. 7 días → +200xp bonus

---

## 6. Fase 3 — Progresión & Retención

### 6.1 Sistema de Logros

**Definidos en `src/data/achievements.ts`:**

| ID | Nombre | Requisito | XP |
|----|--------|-----------|----|
| first_word | Primer Descubrimiento | Encontrar 1 palabra | 10 |
| tenth_word | Aprendiz | Encontrar 10 palabras | 50 |
| fifty_word | Conocedor | Encontrar 50 palabras | 100 |
| encyclopedia | Enciclopedista | Encontrar 100 palabras | 500 |
| level_5 | Subiendo de Nivel | Alcanzar nivel 5 | 100 |
| level_10 | Veterano | Alcanzar nivel 10 | 250 |
| streak_3 | Racha de 3 | 3 días consecutivos | 50 |
| streak_7 | Racha Semanal | 7 días consecutivos | 200 |
| category_master | Maestro Breaking | Encontrar todas las palabras de breaking | 100 |
| speed_demon | Velocista | Encontrar 3 palabras en < 30 segundos | 50 |
| nolifer | Dedicación | Jugar 50 partidas | 300 |

**Notificación de logro:** Modal similar a CategoryUnlock con el nombre y XP ganada.

### 6.2 Daily Rewards

- Timer visible: "Tu recompensa diaria en 5:23:14"
- Recompensa: XP + streak boost
- Día 7: power-up gratis

### 6.3 Power-ups

| Power-up | Efecto | Cómo se obtiene |
|----------|--------|-----------------|
| 🔍 Pista | Destella la primera letra de una palabra no encontrada | 1 gratis por nivel / daily reward / ver anuncio |
| ❄️ Congelar | Pausa el timer 15s | Cada 3 niveles |
| 👁️ Destello | Revela todas las palabras de una categoría por 2s | 1 gratis por nivel |
| 🔄 Reiniciar | Reordena el grid (nuevas posiciones) | Cada 5 niveles |

### 6.4 Enciclopedia (existente, mejorar)

- Vista de libro: fondo pergamino, tarjetas coleccionables
- Barra de progreso por categoría: "Breaking: 12/17 descubiertas"
- Vista de detalle: la knowledge card completa guardada
- Estadísticas: tiempo total jugado, palabras por minuto, categoría favorita

---

## 7. Fase 4 — Plataforma JuegaHipHop

### 7.1 Monorepo Structure (cuando haya ≥3 juegos)

```
JuegaHipHop/
├── packages/
│   └── design-system/     # Tema, componentes, tokens
│       ├── tokens/        # Colores, espacios, tipografía
│       ├── components/    # Button, Header, Modal, TabBar
│       └── hooks/         # useAudio, useProgression
├── apps/
│   ├── sopadeletras/      # Este juego
│   ├── puzzlehh/          # Puzzle hip hop (si existe)
│   ├── triviahh/          # Futuro juego de trivia
│   └── lobby/             # Hub de juegos
└── package.json           # npm workspaces
```

### 7.2 Design System

**Tokens (JSON):**
```json
{
  "color": {
    "primary": "#f97316",
    "surface": "#151225",
    "panel": "#1e1b2e",
    "accent": { "sopa": "#fbbf24", "puzzle": "#22c55e", "trivia": "#3b82f6" }
  },
  "font": { "heading": "Archivo Black", "body": "Inter" },
  "radius": { "sm": "4px", "md": "8px", "lg": "16px", "xl": "24px" }
}
```

**Componentes compartidos:**
| Componente | Props | Estado |
|------------|-------|--------|
| GameHeader | `title, level, xp, children` | Diseñado |
| GameBoard | `grid, onSelect, foundWords` | Propio de cada juego |
| Modal | `open, onClose, title, children` | Genérico |
| KnowledgeCard | `word, knowledge, onClose` | Genérico (reutilizable en trivia) |
| TabBar | `tabs, active, onChange` | Genérico |
| ScoreBadge | `value, label, color` | Genérico |

### 7.3 Hub / Lobby

- Grid de juegos disponibles (sopa, puzzle, trivia)
- Progreso global visible (XP total del ecosistema)
- "Juego recomendado del día"

---

## 8. Contenido & Pipeline

### 8.1 Word Data Pipeline

**Formato actual (TS):**
```ts
{ word: 'BBOY', category: 'breaking', difficulty: 'easy', knowledge: { ... } }
```

**Para escalar:** Migrar a JSON en `public/data/words.json` (sin rebuild):
- Editor no-code podría escribir JSON
- Se actualiza sin recompilar

### 8.2 Objetivo de contenido

| Categoría | Actual | Meta v1 | Meta v2 |
|-----------|--------|---------|---------|
| Breaking | 17 | 30 | 50 |
| MCing | 11 | 25 | 50 |
| DJing | 9 | 20 | 40 |
| Graffiti | 12 | 25 | 50 |
| Historia | 17 | 30 | 60 |
| Conceptos | 18 | 30 | 50 |
| Álbumes | 41 | 60 | 100 |
| Ciudades | 14 | 25 | 40 |
| **TOTAL** | **139** | **245** | **440** |

### 8.3 Nuevas categorías planeadas

| Categoría | Contenido | Prioridad |
|-----------|-----------|-----------|
| Películas | Hip hop films, documentales | Media |
| Moda | Streetwear, marcas, estilos | Baja |
| Global | Escenas internacionales (Francia, Japón, Brasil, Chile) | Alta |
| Productores | Beatmakers, productores legendarios | Media |
| Mujeres | MCs, DJs, B-Girls, artistas femeninas | Alta |
| Chilena | Escena nacional chilena (futura expansión) | Media |

---

## 9. Testing & QA

### 9.1 Estrategia

| Tipo | Cobertura | Herramienta |
|------|-----------|-------------|
| Unit (engine) | Grid generation, word placement, word validation | Vitest |
| Component | Board interaction, KnowledgeCard rendering | Vitest + React Testing Library |
| E2E | Flujo completo: seleccionar → encontrar → card → enciclopedia | Playwright |
| Mobile | iOS Safari, Android Chrome, gestos táctiles | Testing manual en dispositivo real |

### 9.2 Test Plan (engine)

```ts
describe('generateGrid', () => {
  test('size matches', ...)
  test('all placed words exist on grid', ...)
  test('same seed produces same grid', ...)
  test('different seeds produce different grids', ...)
})

describe('checkWord', () => {
  test('finds horizontal word', ...)
  test('finds vertical word', ...)
  test('finds diagonal word', ...)
  test('finds reversed word', ...)
  test('rejects invalid word', ...)
  test('does not find already-found word', ...)
})
```

### 9.3 QA Checklist (manual pre-release)

```
[ ] App se abre sin errores en consola
[ ] Grid se renderiza correctamente en portrait/landscape
[ ] Pointer drag funciona táctil y mouse
[ ] Palabras encontradas se marcan visualmente
[ ] Knowledge card aparece con información correcta
[ ] Enciclopedia guarda palabras entre sesiones
[ ] Diario: mismo seed = mismo grid para todos los usuarios
[ ] Diario: cambia al día siguiente
[ ] XP y nivel persisten al recargar
[ ] Desbloqueo de categorías funciona al subir nivel
[ ] Responsive: 320px - 1440px sin rotura
[ ] PWA: se puede instalar en homescreen
[ ] PWA: funciona offline después de primera carga
[ ] Sonidos: no hay errores de autoplay
[ ] Rendimiento: 60fps en dispositivo gama media
```

---

## 10. Deployment & Distribución

### 10.1 Build

```bash
npm run build    # → dist/
```

**Output:** 261KB JS + 29KB CSS + sonidos (~200KB) = ~500KB total.

### 10.2 Hosting

| Opción | Ideal para | Costo |
|--------|-----------|-------|
| Firebase App Hosting | Ya usado en el ecosistema | Plan Spark (gratis) |
| Vercel | Simple, rápido, preview URLs | Hobby (gratis) |
| GitHub Pages | Juego estático, sin backend | Gratis |

### 10.3 Play Store (futuro)

Si queremos Play Store real:
- **Opción A:** WebView wrapper (Trusted Web Activity → PWA en Play Store, gratis)
- **Opción B:** Capacitor (Ionic) → build nativo con WebView
- **Opción C:** React Native rewrite (solo si rendimiento nativo necesario)

**Recomendación:** PWA primero (instalable desde Chrome), TWA cuando haya engagement.

---

## 11. Roadmap Temporal

| Fase | Estado | Hitos |
|------|--------|-------|
| Fundación Visual & Game Feel | ✅ Completo | Splash screen, sonidos (Howler.js), partículas, score popups, haptics |
| Progresión Básica | ✅ Completo | XP, niveles, localStorage, categorías desbloqueables |
| Contenido | ✅ Completo | 469 palabras en 9 categorías con knowledge cards completas |
| Logros | ✅ Completo | 35 logros en 8 categorías con recompensas |
| Rangos | ✅ Completo | 15 rangos con progresión visual (Bronce → Diamante) |
| Economía | ✅ Completo | Monedas, Knowledge Points, power-ups, costos |
| Power-Ups | ✅ Completo | Pista, Revelar, Mezclar, Eliminar, Congelar |
| Game Modes | ✅ Completo | Clásico, Contrarreloj, Supervivencia, Categoría, Diario |
| Rachas Diarias | ✅ Completo | Calendario 7 días, recompensas progresivas, multiplicador XP |
| SDK Lobby | ✅ Completo | Comunicación postMessage con lobby JuegaHipHop |
| Supabase Sync | ✅ Completo | Backup remoto, merge progreso, game_completions |
| Perfil de Jugador | ✅ Completo | Stats, logros, rango, progreso categorías, nombre, avatar |
| Colección | ✅ Completo | Vista expandible por categoría, palabras faltantes/descubiertas |
| Tienda | ✅ Completo | Compra de power-ups con monedas, inventario visible |
| Arquitectura Modular | ✅ Completo | Tipos, motor, progresión, economía, power-ups separados |

---

## Apéndice A: Arquitectura Final de Archivos

```
src/
├── App.tsx                    # Orquestación principal (game loop, routing, SDK)
├── main.tsx                   # Entry point
├── index.css                  # Tailwind 4 theme + animaciones
├── screens.tsx                # Todas las pantallas exportables
│
├── game/
│   ├── types.ts               # Interfaces del negocio (core + progresión)
│   ├── engine.ts              # Grid generator, word detection, word picker
│   ├── progression.ts         # XP, niveles, logros, streak, rewards
│   ├── economy.ts             # Precios, recompensas, curvas, multiplicadores
│   ├── powerups.ts            # Hint, reveal, shuffle, eliminate, freeze
│   └── ranks.ts               # 15 rangos cross-game (Bronze → Diamond)
│
├── data/
│   ├── index.ts               # Combina words.ts + words-extra.ts
│   ├── words.ts               # 399 palabras (breaking, mcing, djing)
│   ├── words-extra.ts         # ~70 palabras (graffiti, cultura, historia, ...)
│   └── achievements.ts        # 35 logros con recompensas y títulos
│
├── hooks/
│   ├── useAudio.ts            # Howler.js wrapper (SFX + BGM)
│   └── useProgression.ts      # Hook central de progresión
│
├── components/
│   ├── SplashScreen.tsx       # Pantalla de carga inicial
│   ├── ScorePopup.tsx         # +XP flotante
│   └── ParticleBurst.tsx      # Partículas al encontrar palabra
│
└── lib/
    ├── supabase.ts            # Cliente Supabase compartido
    ├── supabase-sync.ts       # Sync remoto con merge
    └── sdk/
        ├── types.ts           # Protocolo postMessage JuegaHipHop
        ├── messages.ts        # Helpers de mensajes
        └── lobby-client.ts    # Cliente lobby (iframe)
```

## Apéndice B: Cross-Game Data Schema

El progreso del jugador está diseñado para ser compartido entre juegos:

```typescript
interface CrossGameProfile {
  // Compartido entre todos los juegos
  xp: number          // XP total del ecosistema
  level: number       // Nivel global
  rank: string        // Rango (bronze_1 → diamond_3)
  dailyStreak: number // Racha diaria compartida
  totalWordsFound: number
  totalGames: number

  // Específico de Sopa de Knowledge
  wordsFound: FoundWord[]
  unlockedCategories: string[]
  powerUps: PowerUpInventory
  achievements: AchievementProgress[]
  coins: number
  knowledgePoints: number
  profile: PlayerProfile
}
```

### Timeline estimado (desarrollo part-time)

```
Semana 1 ─── F1: Assets + Splash + PWA + Game Feel
   │  A1 Logo SVG
   │  A4 Splash screen
   │  PWA config + icons
   │  Game feel: score popup, particles, haptic
   │
Semana 2 ─── F1: Sonido + F2: Modos de juego
   │  Howler.js + SFX + BGM
   │  Modo Clásico mejorado (dificultad adaptativa)
   │  Modo Contrarreloj
   │  Modo Categorías
   │
Semana 3 ─── F3: Progresión
   │  Sistema de logros (12 logros)
   │  Daily rewards + streak visual
   │  Power-ups (pista, congelar, destello)
   │  Enciclopedia mejorada
   │
Semana 4 ─── F4: Plataforma + QA + Release
   │  Refactor: separar componentes en archivos
   │  Contenido: +100 palabras
   │  Tests engine + componentes
   │  QA checklist → deploy
   │  Lobby JuegaHipHop (si hay otros juegos)
```

### Milestones

| Hito | Fecha | Deliverable |
|------|-------|-------------|
| MVP jugable | Existente | Grid, palabras, pointer events |
| v0.2 Playable | ⬅️ Semana 1 | Visual completo, sonido, PWA |
| v0.3 Feature | Semana 2 | 3 modos de juego |
| v0.4 Progression | Semana 3 | Logros, rewards, power-ups |
| v1.0 Release | Semana 4 | Contenido suficiente + QA + deploy |

---

## Documentos anexos

- `CHANGELOG.md` — Registro de cambios por versión
- `src/data/words.ts` — Contenido vivo (crece continuamente)
- Este PLAN.md — Documento vivo, se actualiza con cada fase completada

---

*Documento mantenido por Hermes Agent — última actualización: Julio 2026*
