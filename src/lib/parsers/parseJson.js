/**
 * Parser de questões a partir de JSON.
 *
 * Aceita dois formatos de chave:
 *   - Completo:  { pergunta, alt_a, alt_b, alt_c, alt_d, correta, tempo_limite }
 *   - Abreviado: { pergunta, a, b, c, d, correta, tempo }
 *
 * Retorna { questoes: [...], errors: [...] }
 */
export function parseJson(raw) {
  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    return { questoes: [], errors: ['JSON inválido. Verifique a sintaxe do arquivo.'] }
  }

  if (!Array.isArray(parsed)) {
    return { questoes: [], errors: ['O JSON deve ser um array de questões: [{ ... }, ...]'] }
  }

  const questoes = []
  const errors   = []

  parsed.forEach((item, i) => {
    const n = i + 1
    if (typeof item !== 'object' || item === null) {
      errors.push(`Item ${n}: deve ser um objeto.`)
      return
    }

    const q = normalizeKeys(item)
    const rowErrors = validateQuestao(q, n)

    if (rowErrors.length) {
      errors.push(...rowErrors)
    } else {
      questoes.push(q)
    }
  })

  return { questoes, errors }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Normaliza chaves abreviadas para o formato interno */
function normalizeKeys(item) {
  return {
    pergunta:    String(item.pergunta    ?? '').trim(),
    alt_a:       String(item.alt_a ?? item.a ?? '').trim(),
    alt_b:       String(item.alt_b ?? item.b ?? '').trim(),
    alt_c:       String(item.alt_c ?? item.c ?? '').trim(),
    alt_d:       String(item.alt_d ?? item.d ?? '').trim(),
    correta:     String(item.correta    ?? '').trim().toUpperCase(),
    tempo_limite: Number(item.tempo_limite ?? item.tempo ?? 30),
  }
}

function validateQuestao(q, n) {
  const errs = []
  if (!q.pergunta)                           errs.push(`Questão ${n}: "pergunta" obrigatória.`)
  if (!q.alt_a)                              errs.push(`Questão ${n}: alternativa A obrigatória.`)
  if (!q.alt_b)                              errs.push(`Questão ${n}: alternativa B obrigatória.`)
  if (!q.alt_c)                              errs.push(`Questão ${n}: alternativa C obrigatória.`)
  if (!q.alt_d)                              errs.push(`Questão ${n}: alternativa D obrigatória.`)
  if (!['A','B','C','D'].includes(q.correta)) errs.push(`Questão ${n}: "correta" deve ser A, B, C ou D.`)
  if (isNaN(q.tempo_limite) || q.tempo_limite < 5) q.tempo_limite = 30
  return errs
}
