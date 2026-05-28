/**
 * AvatarDisplay — renderiza avatar legado (emoji puro) ou novo formato JSON
 * Formato JSON: { "e": "🚀", "c": "violet", "a": "🎩" }
 */

const COLORS = {
  violet: 'bg-violet-500',
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  pink:   'bg-pink-500',
  yellow: 'bg-yellow-500',
  cyan:   'bg-cyan-500',
}

const SIZES = {
  xl:    { wrap: 'w-7  h-7',   emoji: 'text-sm',   acc: 'text-xs    -top-0.5 -right-0.5' },
  '2xl': { wrap: 'w-10 h-10',  emoji: 'text-xl',   acc: 'text-sm    -top-1   -right-1'   },
  '3xl': { wrap: 'w-12 h-12',  emoji: 'text-2xl',  acc: 'text-sm    -top-1   -right-1'   },
  '4xl': { wrap: 'w-16 h-16',  emoji: 'text-3xl',  acc: 'text-base  -top-1.5 -right-1.5' },
  '8xl': { wrap: 'w-28 h-28',  emoji: 'text-5xl',  acc: 'text-2xl   -top-2   -right-2'   },
}

export function parseAvatar(avatar) {
  if (!avatar) return null
  try {
    const p = JSON.parse(avatar)
    if (p && typeof p === 'object' && p.e) return p
  } catch {}
  return null
}

export default function AvatarDisplay({ avatar, size = '2xl', className = '' }) {
  const parsed = parseAvatar(avatar)

  if (!parsed) {
    // Avatar legado: emoji simples
    const legacySize = {
      xl: 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl', '4xl': 'text-4xl', '8xl': 'text-8xl',
    }[size] ?? 'text-2xl'
    return <span className={`${legacySize} ${className}`}>{avatar ?? '🎮'}</span>
  }

  const { e, c = 'violet', a } = parsed
  const bg = COLORS[c] ?? COLORS.violet
  const s  = SIZES[size] ?? SIZES['2xl']

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 ${bg} ${s.wrap} ${className}`}
    >
      <span className={s.emoji}>{e}</span>
      {a && <span className={`absolute leading-none ${s.acc}`}>{a}</span>}
    </div>
  )
}
