import AvatarDisplay from '@/components/AvatarDisplay'

const CHARACTERS = [
  { e: '🚀', label: 'Foguete'   },
  { e: '🔥', label: 'Fogo'      },
  { e: '⚡', label: 'Raio'      },
  { e: '💎', label: 'Diamante'  },
  { e: '🦄', label: 'Unicórnio' },
  { e: '🐉', label: 'Dragão'    },
  { e: '👾', label: 'Alien'     },
  { e: '🤖', label: 'Robô'      },
  { e: '👻', label: 'Fantasma'  },
  { e: '🐺', label: 'Lobo'      },
  { e: '🦊', label: 'Raposa'    },
  { e: '🦁', label: 'Leão'      },
  { e: '🐯', label: 'Tigre'     },
  { e: '🦈', label: 'Tubarão'   },
  { e: '🌟', label: 'Estrela'   },
  { e: '🐱', label: 'Gato'      },
]

const COLORS = [
  { key: 'violet', bg: 'bg-violet-500', label: 'Roxo'     },
  { key: 'blue',   bg: 'bg-blue-500',   label: 'Azul'     },
  { key: 'green',  bg: 'bg-green-500',  label: 'Verde'    },
  { key: 'red',    bg: 'bg-red-500',    label: 'Vermelho' },
  { key: 'orange', bg: 'bg-orange-500', label: 'Laranja'  },
  { key: 'pink',   bg: 'bg-pink-500',   label: 'Rosa'     },
  { key: 'yellow', bg: 'bg-yellow-500', label: 'Amarelo'  },
  { key: 'cyan',   bg: 'bg-cyan-500',   label: 'Ciano'    },
]

const ACCESSORIES = [
  { a: '',    label: 'Nenhum'    },
  { a: '🎩', label: 'Cartola'   },
  { a: '🎓', label: 'Formatura' },
  { a: '👑', label: 'Coroa'     },
  { a: '⚡', label: 'Raio'      },
  { a: '🌟', label: 'Estrela'   },
  { a: '🔥', label: 'Fogo'      },
]

/**
 * AvatarBuilder — seletor de avatar personalizado (personagem + cor + acessório)
 * Props: { value: string (JSON), onChange: (jsonString) => void }
 */
export default function AvatarBuilder({ value, onChange }) {
  let current = { e: '🚀', c: 'violet', a: '' }
  try {
    const p = JSON.parse(value)
    if (p && p.e) current = { e: p.e, c: p.c ?? 'violet', a: p.a ?? '' }
  } catch {}

  function update(key, val) {
    onChange(JSON.stringify({ ...current, [key]: val }))
  }

  return (
    <div className="space-y-5">
      <p className="text-white/70 text-sm font-semibold uppercase tracking-widest">
        Crie seu avatar
      </p>

      {/* Preview */}
      <div className="flex justify-center py-2">
        <AvatarDisplay avatar={value} size="8xl" />
      </div>

      {/* Personagem */}
      <div className="space-y-2">
        <p className="text-white/50 text-xs uppercase tracking-widest">Personagem</p>
        <div className="grid grid-cols-8 gap-2">
          {CHARACTERS.map(({ e, label }) => (
            <button
              key={e}
              type="button"
              onClick={() => update('e', e)}
              aria-label={label}
              className={`text-2xl p-2 rounded-xl transition-all ${
                current.e === e
                  ? 'bg-white/25 ring-2 ring-white/50 scale-110'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Cor de fundo */}
      <div className="space-y-2">
        <p className="text-white/50 text-xs uppercase tracking-widest">Cor de fundo</p>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(({ key, bg, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => update('c', key)}
              aria-label={label}
              className={`w-9 h-9 rounded-full ${bg} transition-all ${
                current.c === key ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-90'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Acessório */}
      <div className="space-y-2">
        <p className="text-white/50 text-xs uppercase tracking-widest">Acessório</p>
        <div className="flex gap-2 flex-wrap">
          {ACCESSORIES.map(({ a, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => update('a', a)}
              aria-label={label}
              className={`px-3 py-2 rounded-xl text-xl transition-all ${
                current.a === a
                  ? 'bg-white/25 ring-2 ring-white/50'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {a || <span className="text-white/30 text-sm font-bold">∅</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
