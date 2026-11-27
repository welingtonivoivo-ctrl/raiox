// Onde a análise fica guardada no PC (docs/02-TRD.md §9).
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Pasta de dados do Raio-X. RAIOX_DADOS troca o lugar (usado nos testes). */
export function pastaDeDados(amb: NodeJS.ProcessEnv = process.env): string {
  if (amb.RAIOX_DADOS) return amb.RAIOX_DADOS
  if (amb.APPDATA) return join(amb.APPDATA, 'Raio-X')
  return join(amb.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'), 'raio-x')
}

/** analises\<site>\<AAAAMMDD-HHMMSS> — um nome de pasta seguro para o site. */
export function pastaDaAnalise(site: string, quando: Date, amb: NodeJS.ProcessEnv = process.env): string {
  let nome = 'site'
  try {
    nome = new URL(site).host
  } catch {
    // fica "site"
  }
  nome = nome.replace(/[^\w.-]/g, '_')
  const p = (n: number) => String(n).padStart(2, '0')
  const carimbo = `${quando.getFullYear()}${p(quando.getMonth() + 1)}${p(quando.getDate())}-${p(quando.getHours())}${p(quando.getMinutes())}${p(quando.getSeconds())}`
  return join(pastaDeDados(amb), 'analises', nome, carimbo)
}

/** Nome seguro de arquivo/pasta para o site (host com porta; "site" se não der). */
export function nomeDoHost(site: string): string {
  let nome = 'site'
  try {
    nome = new URL(site).host
  } catch {
    // fica "site"
  }
  return nome.replace(/[^\w.-]/g, '_')
}
