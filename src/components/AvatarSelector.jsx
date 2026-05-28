import { AVATARS } from '@/constants/avatars'

/**
 * Componente de seleção visual de avatars.
 *
 * @param {string}   value     — emoji do avatar selecionado atualmente
 * @param {Function} onChange  — callback chamado com o emoji ao selecionar
 */
export default function AvatarSelector({ value, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-white/70 text-sm font-semibold uppercase tracking-widest">
        Escolha seu avatar
      </p>

      <div
        role="radiogroup"
        aria-label="Seletor de avatar"
        className="grid grid-cols-6 gap-2"
      >
        {AVATARS.map((avatar) => {
          const isSelected = value === avatar.emoji

          return (
            <button
              key={avatar.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={avatar.label}
              onClick={() => onChange(avatar.emoji)}
              className={[
                'relative flex items-center justify-center rounded-2xl',
                'text-2xl h-12 w-full',
                'transition-all duration-150 select-none',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                isSelected
                  ? 'bg-white/30 border-2 border-white scale-110 shadow-lg shadow-white/20'
                  : 'bg-white/10 border-2 border-transparent hover:bg-white/20 hover:scale-105',
              ].join(' ')}
            >
              {avatar.emoji}

              {/* Indicador de selecionado */}
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 bg-green-400 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white"
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
