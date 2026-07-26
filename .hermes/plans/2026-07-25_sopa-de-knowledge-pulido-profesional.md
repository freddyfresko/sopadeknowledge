# Sopa de Knowledge — Pulido Profesional

> **Para Hermes:** Implementar en orden Hito 1 → Hito 5. Cada hito tiene verificación al final.

**Meta:** Transformar la experiencia visual del juego Sopa de Knowledge en un producto premium comparable a Duolingo/NYT Games, manteniendo toda la funcionalidad existente.

**Stack:** React 19 + Vite 8 + Tailwind 4 + Supabase + Howler + vite-plugin-pwa

**Dirección visual (validada con mockup):**
- Dark charcoal con textura sutil de grid pattern (~5% opacity)
- Punto neón amarillo #FFC107 (CTAs primarios) + púrpura #8E44AD (secundarios)
- Botones 3D/tactilidad: borde inferior oscuro que da efecto "presionable"
- Tipografía editorial con jerarquía clara (display/heading/body/caption)
- Iconografía custom line-art con stroke weight consistente
- Generous whitespace, squircle corners, shadows sutiles
- Micro-interacciones suaves (cubic-bezier)

---

## Hito 1 — Sistema de Tokens (index.css)

**Objetivo:** Establecer fundaciones de design system sólidas antes de tocar componentes.

**Archivos:**
- Modificar: `src/index.css` (todo el `@theme` block + global styles)

### T1.1 — Refinar paleta de colores con contraste mejorado
- Aclarar `--color-text-secondary` de #A0A0A0 a #C7C7C7 (mayor legibilidad)
- Aclarar `--color-text-muted` de #666666 a #8A8A95
- Eliminar duplicados `--color-yellow-neon-400`/`500` que apuntan al mismo color y consolidar
- Mover "legacy mappings" (hiphop-*) al final como aliases claros

### T1.2 — Agregar tokens de spacing y radius
```css
@theme {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-squircle: 14px; /*squircle effect */
}
```

### T1.3 — Agregar tokens de shadow y textura
```css
@theme {
  /* Shadow system */
  --shadow-card: 0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
  --shadow-elevated: 0 8px 24px rgba(0,0,0,0.25);
  --shadow-glow-yellow: 0 4px 20px rgba(255,193,7,0.25);
  --shadow-glow-purple: 0 4px 20px rgba(142,68,173,0.20);
  --shadow-btn-3d: 0 3px 0 0 var(--btn-shadow);
}
```

### T1.4 — Definir jerarquía tipográfica
- `--font-display`: 'Bangers' (graffiti hero)
- `--font-heading`: 'Archivo Black' (titulares UI)
- `--font-body`: 'Inter' (texto general)
- Clases utilitarias: `.text-display`, `.text-heading`, `.text-body`, `.text-caption`, `.text-overline`

### T1.5 — Background global con textura sutil
- Reemplazar `body { background: #0F0F0F }` por:
```css
body {
  background-color: #0F0F0F;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0);
  background-size: 24px 24px;
}
```

### T1.6 — Animaciones y micro-interacciones
- Definir cubic-bezier tokens: `--ease-bounce`, `--ease-smooth`
- `.btn-press` con active state que simula botón físico
- Reemplazar `cellPulse` con variante más sutil

**Verificación Hito 1:** `npm run build` limpio + visual en browser mantiene funcionalidad existente con sutiles mejoras de contraste y textura.

---

## Hito 2 — Sistema de Componentes UI

**Objetivo:** Componentes reutilizables que reemplazan inline styles repetidos.

**Archivos:**
- Crear: `src/components/ui.tsx`
- Modificar: `src/App.tsx`, `src/screens.tsx` (usar nuevos componentes)

### T2.1 — Componente `Button`
- Variantes: `primary` (amarillo), `secondary` (púrpura), `ghost` (oscuro), `danger` (rojo)
- Props: `size`, `fullWidth`, `icon`, `disabled`, `loading`
- Efecto 3D con `box-shadow` bottom border que desaparece en `:active` (translateY(2px))

### T2.2 — Componente `Card`
- Surface con padding consistente (`--spacing-lg`)
- Border subtle + shadow-card
- Variante `elevated` para modales

### T2.3 — Componentes `Stat`, `Progress`, `Chip`
- `Stat`: icon + value + label con layout consistente
- `Progress`: barra con gradiente y transición smooth
- `Chip`: pill con variantes (default/active/disabled)

### T2.4 — Iconos SVG custom inline
- Reemplazar emojis grandes (🎮, 📖, 🛒, 👤) en CTAs principales por SVG line-art
- Mismo stroke width (1.75), mismos viewBoxes (0 0 24 24)
- Guardar en `src/components/icons.tsx`

### T2.5 — Reemplazar buttons planos en Home y GameHub
- Usar `Button` en `HomeScreen`, `GameHubScreen`, `StoreScreen`
- Migrar inline styles a variants

**Verificación Hito 2:** Visual coherente en Home + Game Hub con botones táctiles y contraste mejorado. Sin regression funcional.

---

## Hito 3 — Pantallas Críticas

### T3.1 — Splash + Home (primera impresión)
- **Splash:** Corregir typo "KNOWLEDGE" (quitar W doble), optimizar animación de entrada
- **Home:** Layout editorial con hero más compacto, chips abajo con mejor alineación
- Rediseñar wordmark con kerning mejorado y glow más sutil (text-shadow vectorial no blur difuso)

### T3.2 — Game Hub
- Tabs responsivas: wrap grid 2x3 en mobile, scroll horizontal elegante en desktop
- Player card con padding uniforme y stats grid con iconos custom
- Categories list con hover state y mejor jerarquía

### T3.3 — Board (gameplay)
- Grid de celdas con mejor cuadratura (gap uniforme 3px)
- Feedback visual al seleccionar: outline rectangular con glow (no solo background)
- Word list con chips ordenados y mejor color coding

### T3.4 — Header y Bottom Nav
- Header con logo más sutil + stats compactos
- Bottom nav con iconos SVG custom (mismos del Hito 2.4)
- Estado activo con indicador superior (línea o dot)

**Verificación Hito 3:** Flujo Splash → Home → Play → Game Hub → Board sin regressions visuales ni funcionales.

---

## Hito 4 — Modales y Feedback

### T4.1 — KnowledgeModal
- Mejor layout del header con icono de categoría más prominente
- Animación smooth in/out (no solo `card-enter`)
- Background del hero más structured con gradiente direccional

### T4.2 — LevelComplete / GameOver
- Reordenar stats con mejor jerarquía visual (números grandes, labels pequeñas)
- Iconografía consistente
- Animación staggered en stats (delay incrementales)

### T4.3 — HintModal como bottom sheet
- Drag handle visual (pill bar arriba)
- Mejor separación entre items
- Cerrar con swipe down gesture (opcional)

### T4.4 — AchievementNotification
- Timeline visual con ícono de logro grande
- Animación de entrada desde abajo

### T4.5 — Effects (ScorePopup, ParticleBurst)
- ScorePopup con mejor posición (más cerca del cell)
- ParticleBurst con más partículas y colores basados en categoría

**Verificación Hito 4:** Todos los modales abren/cierran correctamente, animations smooth, sin flicker.

---

## Hito 5 — Performance y PWA

### T5.1 — Verificación de build
- `npm run lint` limpio (oxlint)
- `npm run build` sin errores TypeScript
- Auditoría bundle size

### T5.2 — Optimización de fuentes
- `index.html`: preconnect + preload de Google Fonts
- `font-display: swap` en CSS
- Considerar self-hosting fuentes en futuro (no crítico ahora)

### T5.3 — PWA manifest
- Verificar `manifest.webmanifest` con todos los campos
- Iconos 192/512 presentes en `public/icons/`
- Screenshots actualizados

### T5.4 — Lighthouse PWA
- Lighthouse pass en categorías PWA + Performance > 85
- Service worker registrado correctamente

### T5.5 — Smoke test final
- Flujo completo: Splash → Home → Jugar → Game Hub → Board → encontrar palabra → Knowledge modal → completar → Level Complete → nuevo juego → Cobros diarios → Tienda → Colección → Perfil
- Verificar sync Supabase no rompe
- Verificar lobby SDK sigue funcionando

**Verificación Hito 5:** Build passing, Lighthouse verde, smoke test sin errores.

---

## Riesgos y Trade-offs

- **Refactor visual vs funcionalidad:** Mantener toda la lógica existente intacta (Supabase sync, lobby SDK, progression hook, audio system)
- **Tailwind 4 @theme:** Algunas tokens pueden no ser utilizadas por Tailwind automáticamente (verificar utility generation)
- **Emoji vs SVG icons:** Mantener emojis en places secondary (logros, stats) donde SVG sería overkill; SVG solo en CTAs y nav
- **PWA build:** vite-plugin-pwa puede tener issues con autoUpdate en dev — verificar solo en build prod

## Orden de commits

 Después de cada Hito:
 ```
 git add -A && git commit -m "feat(ui): Hito N — [descripción]"
 ```

---

**Proximo paso:** Comenzar Hito 1 (sistema de tokens) inmediatamente después de aprobar este plan.
