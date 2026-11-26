// Script provisório da Etapa 1 (a linha de comando de verdade chega na Etapa 3).
// Uso: pnpm medir <endereço> [--precisao] [--local] [--json arquivo.json]
import { writeFileSync } from 'node:fs'
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import { medir, type Medidas } from '../src/index.js'

const args = process.argv.slice(2)
const endereco = args.find((a) => !a.startsWith('--'))
if (!endereco) {
  console.error('Uso: pnpm medir <endereço> [--precisao] [--local] [--json arquivo.json]')
  process.exit(1)
}
const iJson = args.indexOf('--json')

const r = await medir([endereco], { precisao: args.includes('--precisao'), permitirLocal: args.includes('--local') }, (m) =>
  console.error(`… ${m}`),
)
if (iJson >= 0 && args[iJson + 1]) writeFileSync(args[iJson + 1]!, JSON.stringify(r, null, 2))

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
