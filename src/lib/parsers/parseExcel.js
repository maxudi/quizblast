import * as XLSX from 'xlsx'

/**
 * Parser de questões a partir de arquivo Excel (.xlsx, .xls) ou CSV.
 *
 * Colunas esperadas (case-insensitive, aceita nomes alternativos):
 *   pergunta | alt_a (ou a) | alt_b (ou b) | alt_c (ou c) | alt_d (ou d) | correta | tempo_limite (ou tempo)
 *
 * A primeira linha deve ser o cabeçalho.
 * Retorna { questoes: [...], errors: [...] }
 *
 * @param {ArrayBuffer} buffer
 * @param {string}      fileName  — usado para detectar CSV vs xlsx
 */
export function parseExcel(buffer, fileName = '') {
  let workbook
  try {
    const opts = fileName.toLowerCase().endsWith('.csv')
      ? { type: 'array', raw: false }
      : { type: 'array' }
    workbook = XLSX.read(new Uint8Array(buffer), opts)
  } catch {
    return { questoes: [], errors: ['Não foi possível ler o arquivo. Certifique-se de que é um .xlsx, .xls ou .csv válido.'] }
  }

  const sheetName = workbook.SheetNames[0]
  const sheet     = workbook.Sheets[sheetName]
  const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rows.length === 0) {
    return { questoes: [], errors: ['A planilha está vazia ou não tem dados após o cabeçalho.'] }
  }

  const questoes = []
  const errors   = []

  rows.forEach((row, i) => {
    const n = i + 1
    const q = normalizeRow(row)
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

/** Busca um valor no row por múltiplos nomes de chave possíveis */
function get(row, ...keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (rk) => rk.trim().toLowerCase() === k.toLowerCase()
    )
    if (found !== undefined && row[found] !== '') return String(row[found]).trim()
  }
  return ''
}

function normalizeRow(row) {
  return {
    pergunta:    get(row, 'pergunta', 'question', 'questao', 'questão'),
    alt_a:       get(row, 'alt_a', 'a', 'alternativa_a', 'opcao_a', 'opção a'),
    alt_b:       get(row, 'alt_b', 'b', 'alternativa_b', 'opcao_b', 'opção b'),
    alt_c:       get(row, 'alt_c', 'c', 'alternativa_c', 'opcao_c', 'opção c'),
    alt_d:       get(row, 'alt_d', 'd', 'alternativa_d', 'opcao_d', 'opção d'),
    correta:     get(row, 'correta', 'resposta', 'answer', 'gabarito').toUpperCase(),
    tempo_limite: Number(get(row, 'tempo_limite', 'tempo', 'time') || 30),
  }
}

function validateQuestao(q, n) {
  const errs = []
  if (!q.pergunta)                            errs.push(`Linha ${n}: "pergunta" obrigatória.`)
  if (!q.alt_a)                               errs.push(`Linha ${n}: alternativa A obrigatória.`)
  if (!q.alt_b)                               errs.push(`Linha ${n}: alternativa B obrigatória.`)
  if (!q.alt_c)                               errs.push(`Linha ${n}: alternativa C obrigatória.`)
  if (!q.alt_d)                               errs.push(`Linha ${n}: alternativa D obrigatória.`)
  if (!['A','B','C','D'].includes(q.correta)) errs.push(`Linha ${n}: "correta" deve ser A, B, C ou D.`)
  if (isNaN(q.tempo_limite) || q.tempo_limite < 5) q.tempo_limite = 30
  return errs
}
