/**
 * Sopa de Knowledge — Custom line-art icon set
 *
 * Consistent stroke width (1.75), 24x24 viewBox, inherit currentColor.
 * Replaces in-app emoji icons in primary CTAs / nav for premium polish.
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function makeIcon(path: React.ReactNode) {
  return function Icon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {path}
      </svg>
    )
  }
}

/* Home */
export const IconHome = makeIcon(
  <>
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </>,
)

/* Grid (categorías) */
export const IconGrid = makeIcon(
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </>,
)

/* Book (colección) */
export const IconBook = makeIcon(
  <>
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </>,
)

/* Profile */
export const IconProfile = makeIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 21a7 7 0 0114 0" />
  </>,
)

/* Play / Gamepad */
export const IconPlay = makeIcon(
  <>
    <path d="M6 12h4M8 10v4" />
    <circle cx="15" cy="11" r="0.5" />
    <circle cx="17.5" cy="13" r="0.5" />
    <rect x="2" y="7" width="20" height="10" rx="4" />
  </>,
)

/* Star (desafíos) */
export const IconStar = makeIcon(
  <>
    <path d="M11.5 3.5l2.5 6.5 6.5 0.5-5 4.5 1.5 6.5L11.5 17.5 5.5 21l1.5-6.5-5-4.5 6.5-0.5z" />
  </>,
)

/* Cart (tienda) */
export const IconCart = makeIcon(
  <>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M3 4h2l2.4 12.5a2 2 0 002 1.5h8.7a2 2 0 002-1.7L22 8H6" />
  </>,
)

/* Crown (logro) */
export const IconCrown = makeIcon(
  <>
    <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />
  </>,
)

/* Back arrow */
export const IconBack = makeIcon(
  <>
    <path d="M15 19l-7-7 7-7" />
  </>,
)

/* Forward arrow */
export const IconForward = makeIcon(
  <>
    <path d="M9 5l7 7-7 7" />
  </>,
)

/* Refresh */
export const IconRefresh = makeIcon(
  <>
    <path d="M3 12a9 9 0 0116-5l2 2M21 12a9 9 0 01-16 5l-2-2" />
    <path d="M18 3v6h-6M6 21v-6h6" />
  </>,
)

/* Lightbulb (pista) */
export const IconHint = makeIcon(
  <>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.8 1 1.5 1 2.5h6c0-1 .3-1.7 1-2.5A6 6 0 0012 3z" />
  </>,
)

/* Shuffle */
export const IconShuffle = makeIcon(
  <>
    <path d="M3 5h4l10 10h4M3 19h4l4-4M17 5l4 4-4 4" />
    <path d="M17 5l4 4M21 13l-4 4" />
  </>,
)

/* Eye (revelar) */
export const IconEye = makeIcon(
  <>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
)

/* Trash (eliminar) */
export const IconTrash = makeIcon(
  <>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14M10 11v6M14 11v6" />
  </>,
)

/* Flame (racha) */
export const IconFlame = makeIcon(
  <>
    <path d="M12 3c2 3 0 5-2 7s-2 5 0 7c2 2 6 2 7-1s0-7-3-9c1 2 0 3-1 3 1-2 0-5-1-7z" />
  </>,
)
