import * as XLSX from 'xlsx'

/**
 * Gera e faz download de uma planilha Excel de modelo (.xlsx)
 * para o professor preencher com as questões.
 */
export function downloadExcelTemplate() {
  const headers = ['pergunta', 'alt_a', 'alt_b', 'alt_c', 'alt_d', 'correta', 'tempo_limite']

  const example = [
    ['Qual é a capital do Brasil?', 'São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador',  'C', 30],
    ['Quanto é 2 + 2?',            '3',         '4',             '5',        '6',          'B', 15],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...example])

  // Largura das colunas
  ws['!cols'] = [
    { wch: 50 }, { wch: 25 }, { wch: 25 },
    { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Questões')
  XLSX.writeFile(wb, 'modelo_questoes.xlsx')
}
