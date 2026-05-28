// Cores e ícones de cada alternativa, inspirados no Kahoot
export const ALT_CONFIG = {
  A: { color: 'bg-red-500/20   border-red-400/50   focus:ring-red-400/50',   dot: 'bg-red-400',    icon: '▲', label: 'Triângulo' },
  B: { color: 'bg-blue-500/20  border-blue-400/50  focus:ring-blue-400/50',  dot: 'bg-blue-400',   icon: '◆', label: 'Losango'   },
  C: { color: 'bg-yellow-500/20 border-yellow-400/50 focus:ring-yellow-400/50', dot: 'bg-yellow-400', icon: '●', label: 'Círculo'   },
  D: { color: 'bg-green-500/20 border-green-400/50  focus:ring-green-400/50', dot: 'bg-green-400',  icon: '■', label: 'Quadrado'  },
}

const TIME_OPTIONS = [10, 15, 20, 30, 45, 60]

/**
 * Formulário de uma única questão.
 *
 * @param {object}   questao   — estado da questão
 * @param {number}   index     — índice na lista (0-based)
 * @param {Function} onChange  — (field, value) → void
 * @param {Function} onRemove  — () → void
 * @param {boolean}  canRemove — exibe botão de remover
 */
export default function QuestionForm({ questao, index, onChange, onRemove, canRemove }) {
  return (
    <div className="glass-card p-6 space-y-5">

      {/* Cabeçalho da questão */}
      <div className="flex items-center justify-between">
        <span className="text-white/60 text-sm font-bold uppercase tracking-widest">
          Questão {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover questão ${index + 1}`}
            className="text-white/30 hover:text-red-400 transition-colors text-sm font-semibold"
          >
            ✕ Remover
          </button>
        )}
      </div>

      {/* Pergunta */}
      <div className="space-y-2">
        <label className="block text-white/70 text-xs font-semibold uppercase tracking-widest">
          Pergunta
        </label>
        <textarea
          rows={2}
          maxLength={300}
          placeholder="Digite a pergunta aqui..."
          value={questao.pergunta}
          onChange={(e) => onChange('pergunta', e.target.value)}
          className="input-field resize-none text-base"
        />
      </div>

      {/* Alternativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {['A', 'B', 'C', 'D'].map((letra) => {
          const cfg = ALT_CONFIG[letra]
          return (
            <div key={letra} className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-widest">
                <span className={`w-3 h-3 rounded-sm ${cfg.dot}`} aria-hidden="true" />
                {cfg.icon} Alt. {letra}
              </label>
              <input
                type="text"
                maxLength={150}
                placeholder={`Alternativa ${letra}`}
                value={questao[`alt_${letra.toLowerCase()}`]}
                onChange={(e) => onChange(`alt_${letra.toLowerCase()}`, e.target.value)}
                className={[
                  'w-full rounded-2xl px-4 py-3 text-white text-sm font-medium',
                  'border bg-white/10 placeholder-white/40',
                  'focus:outline-none focus:ring-2 transition-all duration-150',
                  cfg.color,
                ].join(' ')}
              />
            </div>
          )
        })}
      </div>

      {/* Resposta correta + Tempo limite */}
      <div className="flex flex-wrap items-end gap-6">

        {/* Resposta correta */}
        <div className="space-y-2">
          <span className="block text-white/70 text-xs font-semibold uppercase tracking-widest">
            Resposta correta
          </span>
          <div className="flex gap-2" role="radiogroup" aria-label="Resposta correta">
            {['A', 'B', 'C', 'D'].map((letra) => {
              const cfg = ALT_CONFIG[letra]
              const isSelected = questao.correta === letra
              return (
                <button
                  key={letra}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onChange('correta', letra)}
                  className={[
                    'w-11 h-11 rounded-xl font-extrabold text-sm transition-all duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                    isSelected
                      ? `${cfg.dot} text-white scale-110 shadow-lg`
                      : 'bg-white/10 text-white/50 hover:bg-white/20',
                  ].join(' ')}
                >
                  {letra}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tempo limite */}
        <div className="space-y-2">
          <label
            htmlFor={`tempo-${index}`}
            className="block text-white/70 text-xs font-semibold uppercase tracking-widest"
          >
            ⏱ Tempo (seg)
          </label>
          <select
            id={`tempo-${index}`}
            value={questao.tempo_limite}
            onChange={(e) => onChange('tempo_limite', Number(e.target.value))}
            className="bg-white/10 border border-white/25 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t} className="bg-slate-900">
                {t}s
              </option>
            ))}
          </select>
        </div>

      </div>
    </div>
  )
}
