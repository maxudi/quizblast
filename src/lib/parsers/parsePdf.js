/**
 * Parser de questões a partir de PDF.
 * O módulo pdfjs-dist é carregado de forma lazy (dynamic import)
 * para não aumentar o bundle inicial da aplicação.
 *
 * O PDF deve seguir este padrão de texto (gerado por Word, Google Docs etc.):
 *
 *   1. Pergunta aqui?
 *   A) Alternativa A
 *   B) Alternativa B
 *   C) Alternativa C
 *   D) Alternativa D
 *   Correta: B
 *   Tempo: 30          ← opcional, padrão 30s
 *
 * Separadores aceitos para a letra: ) . :  (ex: "A)", "A.", "A:")
 * Prefixos aceitos para a resposta: "Correta", "Resposta", "Gabarito", "Answer"
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{ questoes: Array, errors: Array }>}
 */
export async function parsePdf(buffer) {
  // Dynamic import — pdfjs-dist (~3 MB) só é carregado ao usar esta função
  const [pdfjsLib, { default: pdfjsWorkerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

  let fullText = ''

  try {
    const pdf       = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
    const numPages  = pdf.numPages
    const pageTexts = []

    for (let p = 1; p <= numPages; p++) {
      const page    = await pdf.getPage(p)
      const content = await page.getTextContent()
      pageTexts.push(content.items.map((item) => item.str).join(' '))
    }

    fullText = pageTexts.join('\n')
  } catch (err) {
    return { questoes: [], errors: [`Erro ao ler o PDF: ${err.message}`] }
  }

  return extractQuestoesFromText(fullText)
}

// ------------------------------------------------------------------
// Extração por regex
// ------------------------------------------------------------------

/**
 * Divide o texto em blocos de questão e faz o parse de cada um.
 * Um bloco começa com um número seguido de ponto/parêntese.
 */
function extractQuestoesFromText(text) {
  // Normaliza espaços múltiplos e quebras de linha
  const normalizado = text.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim()

  // Divide nos inícios de questão: "1." "1)" "1 -" etc.
  const blocos = normalizado
    .split(/(?=\n?\d{1,3}[\.\)\-]\s)/)
    .map((b) => b.trim())
    .filter(Boolean)

  if (blocos.length === 0) {
    return {
      questoes: [],
      errors: [
        'Nenhuma questão encontrada no PDF.',
        'Certifique-se de que cada questão começa com um número (ex: "1.", "2)", "3.").',
      ],
    }
  }

  const questoes = []
  const errors   = []

  blocos.forEach((bloco, i) => {
    const resultado = parseBloco(bloco, i + 1)
    if (resultado.error) {
      errors.push(resultado.error)
    } else {
      questoes.push(resultado.questao)
    }
  })

  return { questoes, errors }
}

// Regex para capturar cada alternativa
const ALT_RE = /[A-D][\.\)\:]\s*(.+?)(?=\s+[A-D][\.\)\:]|\s+(?:correta|resposta|gabarito|answer)[\s\:\-]|$)/gi

// Regex para capturar a resposta correta
const CORRETA_RE = /(?:correta|resposta|gabarito|answer)[\s\:\-]+([A-D])/i

// Regex para capturar o tempo limite
const TEMPO_RE = /(?:tempo|time)[\s\:\-]+(\d+)/i

// Regex para capturar a URL da imagem (opcional)
const IMAGEM_RE = /(?:imagem_url|image_url|imagem|image)[\s\:\-]+(https?:\/\/\S+)/i

function parseBloco(bloco, n) {
  // Remove o número inicial da questão
  const semNumero = bloco.replace(/^\d{1,3}[\.\)\-]\s*/, '').trim()

  // Extrai a pergunta (tudo antes da primeira alternativa)
  const primeiraAltPos = semNumero.search(/\b[A-D][\.\)\:]/)
  if (primeiraAltPos === -1) {
    return { error: `Questão ${n}: alternativas não encontradas.` }
  }

  const pergunta = semNumero.slice(0, primeiraAltPos).replace(/\n/g, ' ').trim()
  const resto    = semNumero.slice(primeiraAltPos)

  if (!pergunta) {
    return { error: `Questão ${n}: texto da pergunta não encontrado.` }
  }

  // Extrai alternativas A-D
  const alts = {}
  let match
  const altRe = new RegExp(/([A-D])[\.\)\:]\s*(.+?)(?=\s+[A-D][\.\)\:]|\s+(?:correta|resposta|gabarito|answer)[\s\:\-]|$)/gi)

  while ((match = altRe.exec(resto)) !== null) {
    alts[match[1].toUpperCase()] = match[2].replace(/\n/g, ' ').trim()
  }

  if (!alts.A || !alts.B || !alts.C || !alts.D) {
    return { error: `Questão ${n}: precisa ter exatamente 4 alternativas (A, B, C, D).` }
  }

  // Extrai resposta correta
  const corretaMatch = CORRETA_RE.exec(resto)
  if (!corretaMatch) {
    return {
      error: `Questão ${n}: resposta correta não encontrada. Use "Correta: B", "Gabarito: C" etc.`,
    }
  }

  // Extrai tempo (opcional)
  const tempoMatch = TEMPO_RE.exec(resto)
  const tempo_limite = tempoMatch ? Number(tempoMatch[1]) : 30

  // Extrai URL da imagem (opcional)
  const imagemMatch = IMAGEM_RE.exec(resto)
  const imagem_url  = imagemMatch ? imagemMatch[1].trim() : ''

  return {
    questao: {
      pergunta,
      alt_a: alts.A,
      alt_b: alts.B,
      alt_c: alts.C,
      alt_d: alts.D,
      correta:     corretaMatch[1].toUpperCase(),
      tempo_limite: isNaN(tempo_limite) || tempo_limite < 5 ? 30 : tempo_limite,
      imagem_url,
    },
  }
}
