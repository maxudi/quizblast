import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

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
export default function QuestionForm({ questao, index, onChange, onRemove, canRemove, userId }) {
  const [imgMode,     setImgMode]     = useState('url')
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState(null)

  async function handleUpload(file) {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = `${userId ?? 'anon'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('questao-imagens')
      .upload(path, file, { upsert: true })
    if (error) { setUploadError('Erro ao enviar: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('questao-imagens').getPublicUrl(path)
    onChange('imagem_url', data.publicUrl)
    setUploading(false)
  }

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

      {/* Imagem opcional */}
      <div className="space-y-3 pt-1 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">🖼 Imagem (opcional)</span>
          <div className="flex gap-1 bg-white/10 rounded-xl p-1">
            {['url', 'upload'].map((m) => (
              <button key={m} type="button" onClick={() => setImgMode(m)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  imgMode === m ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'
                }`}>
                {m === 'url' ? '🔗 Link' : '📁 Upload'}
              </button>
            ))}
          </div>
        </div>

        {imgMode === 'url' && (
          <input
            type="url"
            placeholder="https://exemplo.com/imagem.jpg"
            value={questao.imagem_url ?? ''}
            onChange={(e) => onChange('imagem_url', e.target.value)}
            className="input-field text-sm"
          />
        )}

        {imgMode === 'upload' && (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              className="text-white/60 text-sm w-full file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:text-white/70 file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-white/20 cursor-pointer"
            />
            {uploading   && <p className="text-white/40 text-xs animate-pulse">Enviando…</p>}
            {uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}
          </div>
        )}

        {questao.imagem_url && (
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={questao.imagem_url}
              alt="Preview"
              className="w-full h-36 object-cover"
              onError={() => onChange('imagem_url', '')}
            />
            <button
              type="button"
              onClick={() => onChange('imagem_url', '')}
              className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
              aria-label="Remover imagem"
            >✕</button>
          </div>
        )}
      </div>

    </div>
  )
}
