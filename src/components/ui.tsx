/**
 * Sopa de Knowledge — Premium UI Components
 *
 * Button with 3D tactile feel, Card with consistent padding,
 * Stat / Progress / Chip primitives — all themed via CSS tokens.
 */
import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { IconBack } from './icons'

/* ═══════════════════════════════════════════════════════
   BUTTON — tactile 3D feel
   ═══════════════════════════════════════════════════════ */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:   'bg-yellow-neon text-black shadow-[0_3px_0_0_var(--btn-shadow-yellow)] hover:brightness-110',
  secondary: 'bg-purple-neon text-white shadow-[0_3px_0_0_var(--btn-shadow-purple)] hover:brightness-110',
  ghost:     'bg-white/5 text-white border border-border-card shadow-[0_3px_0_0_var(--btn-shadow-dark)] hover:bg-white/10',
  danger:    'bg-red-500 text-white shadow-[0_3px_0_0_#991b1b] hover:brightness-110',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs rounded-md',
  md: 'px-4 py-3 text-sm rounded-lg',
  lg: 'px-5 py-4 text-base rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={[
        'btn-3d inline-flex items-center justify-center gap-2',
        'font-heading uppercase tracking-wider font-bold',
        'select-none transition-[filter,transform] duration-100 ease-out',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ].join(' ')}
      {...rest}
    >
      {icon && <span className="flex items-center -ml-0.5">{icon}</span>}
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════
   CARD — consistent surface
   ═══════════════════════════════════════════════════════ */
interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  glow?: 'yellow' | 'purple' | 'green' | null
}

export function Card({ children, className = '', elevated, glow }: CardProps) {
  const glowClass = glow === 'yellow'
    ? 'shadow-[0_4px_24px_rgba(255,193,7,0.15)]'
    : glow === 'purple'
      ? 'shadow-[0_4px_24px_rgba(142,68,173,0.15)]'
      : glow === 'green'
        ? 'shadow-[0_4px_24px_rgba(16,185,129,0.15)]'
        : ''
  return (
    <div
      className={[
        'rounded-2xl border border-border-card bg-bg-card',
        elevated ? 'shadow-[0_8px_24px_rgba(0,0,0,0.25)]' : 'shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
        glowClass,
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   STAT — icon + value + label
   ═══════════════════════════════════════════════════════ */
interface StatProps {
  icon: ReactNode
  value: ReactNode
  label: string
  className?: string
}

export function Stat({ icon, value, label, className = '' }: StatProps) {
  return (
    <div className={`bg-bg-elevated/60 rounded-lg p-2.5 text-center ${className}`}>
      <div className="text-base mb-0.5 flex justify-center">{icon}</div>
      <div className="font-heading text-base text-white leading-tight">{value}</div>
      <div className="text-[9px] text-text-muted uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   PROGRESS — themed bar with smooth fill
   ═══════════════════════════════════════════════════════ */
interface ProgressProps {
  value: number          /* 0..max */
  max?: number
  className?: string
  color?: string         /* tailwind or hex */
  height?: 'sm' | 'md' | 'lg'
}

export function Progress({ value, max = 100, className = '', color, height = 'md' }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const h = height === 'sm' ? 'h-1' : height === 'lg' ? 'h-2.5' : 'h-2'
  const fillStyle = color ? { background: color } : undefined
  return (
    <div className={`w-full ${h} bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out bg-yellow-neon"
        style={{ width: `${pct}%`, ...fillStyle }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   CHIP — pill with variants
   ═══════════════════════════════════════════════════════ */
interface ChipProps {
  children: ReactNode
  active?: boolean
  disabled?: boolean
  color?: string        /* optional hex color when active */
  className?: string
}

export function Chip({ children, active, disabled, color, className = '' }: ChipProps) {
  const style = active && color
    ? { color, background: `${color}22`, borderColor: `${color}55` }
    : undefined
  return (
    <span
      style={style}
      className={[
        'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
        active
          ? 'bg-yellow-neon/10 border-yellow-neon/30 text-yellow-neon font-semibold'
          : disabled
            ? 'bg-white/[0.02] border-border-subtle text-text-muted opacity-50'
            : 'bg-bg-elevated/60 border-border-subtle text-text-secondary',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════
   HEADER — consistent top bar with back button
   ═══════════════════════════════════════════════════════ */
interface HeaderProps {
  title: string
  onBack?: () => void
  right?: ReactNode
}

export function ScreenHeader({ title, onBack, right }: HeaderProps) {
  return (
    <div className="bg-bg-card border-b border-border-subtle">
      <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-white transition-colors -ml-1 px-1"
          >
            <IconBack size={18} />
            Volver
          </button>
        ) : <div className="w-12" />}
        <h2 className="text-heading text-base text-white uppercase tracking-wider">{title}</h2>
        {right ?? <div className="w-12" />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   EMBELLISHMENTS
   ═══════════════════════════════════════════════════════ */

/* Best counter display — for currency/stats */
interface CounterDisplayProps {
  icon: ReactNode
  value: ReactNode
  caption?: string
  color?: string
}
export function CounterDisplay({ icon, value, caption, color = 'text-yellow-neon' }: CounterDisplayProps) {
  return (
    <div className={`flex items-center gap-1 font-bold text-xs ${color}`}>
      <span>{icon}</span>
      <span>{value}</span>
      {caption && <span className="text-text-muted font-normal ml-1">{caption}</span>}
    </div>
  )
}
