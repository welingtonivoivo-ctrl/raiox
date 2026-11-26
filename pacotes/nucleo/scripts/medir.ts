// Script provisório (a linha de comando de verdade chega na Etapa 3).
// Uso: pnpm medir <endereço> [--precisao] [--local] [--bruto] [--json arquivo.json] [--saida pasta]
// Grava relatorio.html, textos-ia.md e resultado.json em --saida ou em raiox-saida/<site>-<data>.
// --bruto guarda também o relatório original do Lighthouse de cada rodada.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import { medir, salvarRelatorios, type Medidas } from '../src/index.js'

const USO = 'Uso: pnpm medir <endereço> [--precisao] [--local] [--bruto] [--json arquivo.json] [--saida pasta]'
const args = process.argv.slice(2)
const valorDe = (opcao: string) => {
  const i = args.indexOf(opcao)
  return i >= 0 ? args[i + 1] : undefined
}
const json = valorDe('--json')
const saida = valorDe('--saida')
const endereco = args.find((a, i) => !a.startsWith('--') && !['--json', '--saida'].includes(args[i - 1] ?? ''))
if (!endereco) {
  console.error(USO)
  process.exit(1)
}
// o pnpm roda o script dentro de pacotes/nucleo; INIT_CWD é a pasta de onde o comando foi chamado
const base = process.env.INIT_CWD ?? process.cwd()

let host = 'site'
try {
  host = new URL(endereco).host.replace(/[^\w.-]/g, '_')
} catch {
  // endereço inválido: o medir() explica o erro
}
const carimbo = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_')
const pasta = saida ? resolve(base, saida) : resolve(base, 'raiox-saida', `${host}-${carimbo}`)

const r = await medir(
  [endereco],
  {
    precisao: args.includes('--precisao'),
    permitirLocal: args.includes('--local'),
    ...(args.includes('--bruto') ? { pastaBruta: pasta } : {}),
  },
  (m) => console.error(`… ${m}`),
)
if (json) writeFileSync(resolve(base, json), JSON.stringify(r, null, 2))

for (const p of r.paginas) {
  console.log(`\n${p.endereco}`)
  if (p.erro) console.log(`  erro: ${p.erro}`)
  for (const [perfil, res] of Object.entries(p.perfis)) {
    console.log(`  ${textos.perfis[perfil as 'celular']}:`)
    for (const [k, v] of Object.entries(res.notas)) console.log(`    ${textos.notas[k as 'desempenho'].padEnd(22)} ${v}`)
    for (const [k, m] of Object.entries(res.medidas) as [keyof Medidas, Medidas['primeiraCoisa']][]) {
      console.log(`    ${textos.medidas[k].padEnd(22)} ${(m.unidade === 's' ? m.valor.toFixed(1) : String(m.valor)).replace('.', ',')}${m.unidade ? ' ' + m.unidade : ''} (${textos.faixas[m.faixa]})`)
    }
  }
}
for (const a of r.avisos) console.log(`\n⚠ ${a}`)
console.log(`\nLighthouse ${r.versaoLighthouse} · navegador ${r.navegador} · força do processador ${r.forcaProcessador ?? '?'} · ${r.quando}`)

console.log(`\nO que ajustar (${r.ajustes.length} itens, os 10 primeiros):`)
r.ajustes.slice(0, 10).forEach((a, i) => console.log(`  ${String(i + 1).padStart(2)}. [${textos.blocos[a.bloco]} · ${a.ganho ?? a.gravidade}] ${a.titulo}`))

const arquivos = await salvarRelatorios(r, pasta)
console.log(`\nRelatório: ${arquivos.html}\nTextos para a IA: ${arquivos.textos}\nDados: ${arquivos.json}`)
