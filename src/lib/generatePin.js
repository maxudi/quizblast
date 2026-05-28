/**
 * Gera um PIN numérico aleatório de 6 dígitos (entre 100000 e 999999).
 * Retorna sempre uma string com exatamente 6 caracteres.
 */
export function generatePin() {
  return String(Math.floor(Math.random() * 900000) + 100000)
}
