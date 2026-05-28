import { useState } from 'react'

const DEFAULTS = [
  { gradient: 'from-violet-600 to-indigo-700',  emoji: '❓' },
  { gradient: 'from-blue-600 to-cyan-700',       emoji: '🤔' },
  { gradient: 'from-orange-500 to-amber-600',    emoji: '💡' },
  { gradient: 'from-emerald-600 to-teal-700',    emoji: '🧠' },
  { gradient: 'from-pink-600 to-rose-700',       emoji: '⚡' },
  { gradient: 'from-purple-600 to-fuchsia-700',  emoji: '🎯' },
  { gradient: 'from-sky-600 to-blue-700',        emoji: '🔍' },
  { gradient: 'from-amber-500 to-orange-600',    emoji: '🏆' },
]

/**
 * Exibe a imagem de uma questão com efeito de entrada.
 * Se não houver imagem, exibe um placeholder visual temático.
 *
 * @param {string} imagemUrl  — URL da imagem (opcional)
 * @param {number} seed       — índice para selecionar o placeholder
 * @param {string} className  — classes extras
 */
export default function QuestionImage({ imagemUrl, seed = 0, className = '' }) {
  const [imgError, setImgError] = useState(false)
  const def = DEFAULTS[Math.abs(seed) % DEFAULTS.length]

  if (imagemUrl && !imgError) {
    return (
      <div className={`w-full rounded-2xl overflow-hidden animate-fade-in ${className}`}>
        <img
          src={imagemUrl}
          alt=""
          aria-hidden
          onError={() => setImgError(true)}
          className="w-full h-44 object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`w-full rounded-2xl overflow-hidden bg-gradient-to-br ${def.gradient} h-28 flex items-center justify-center animate-fade-in ${className}`}>
      <span className="text-6xl drop-shadow-lg select-none animate-bounce-slow">{def.emoji}</span>
    </div>
  )
}
