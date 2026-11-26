// Comando `raiox` (Etapa 3: análise da superfície, sem login).
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import {
  ErroRaioX,
  VERSAO_LIGHTHOUSE,
  VERSAO_RAIOX,
  medir,
  preencher,
  relatorioHtml,
  salvarRelatorios,
  textosMarkdown,
} from '@raiox/nucleo'
import { ErroCli, lerArgumentos } from './argumentos.js'
import { pastaDaAnalise, pastaDeDados } from './pastas.js'
import { abaixoDoMinimo, montarResumo } from './resumo.js'

export type Saidas = {
  /** Resultado (resumo, ou o JSON com --json sem arquivo). */
  out: NodeJS.WritableStream & { isTTY?: boolean }
  /** Andamento, avisos e erros. */
  err: NodeJS.WritableStream
  amb: NodeJS.ProcessEnv
  /** Pasta de onde o comando foi chamado (o pnpm troca a pasta; INIT_CWD guarda a original). */
  pasta: string
}

const PADRAO: Saidas = {
  out: process.stdout,
  err: process.stderr,
  amb: process.env,
  pasta: process.env.INIT_CWD ?? process.cwd(),
}

async function gravar(caminho: string, conteudo: string): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true })
  await writeFile(caminho, conteudo, 'utf8')
}

/** Roda o comando e devolve o código de saída: 0 deu certo, 1 erro, 2 desempenho abaixo do mínimo. */
export async function principal(args: string[], s: Saidas = PADRAO): Promise<number> {
  const escrever = (fluxo: NodeJS.WritableStream, texto: string) => fluxo.write(`${texto}\n`)
  try {
    const pedido = lerArgumentos(args)
    if (pedido.comando === 'ajuda') {
      escrever(s.out, preencher(textos.cli.ajuda, { pasta: pastaDeDados(s.amb) }))
      return 0
    }
    if (pedido.comando === 'versao') {
      escrever(s.out, `raiox ${VERSAO_RAIOX} · Lighthouse ${VERSAO_LIGHTHOUSE}`)
      return 0
    }

    const naTela = pedido.json === '-'
    const pasta = pastaDaAnalise(pedido.enderecos[0]!, new Date(), s.amb)
    const r = await medir(
      pedido.enderecos,
      {
        perfis: pedido.perfis,
        precisao: pedido.precisao,
        permitirLocal: pedido.permitirLocal,
        ...(pedido.bruto ? { pastaBruta: pasta } : {}),
      },
      (m) => escrever(s.err, preencher(textos.cli.andamento, { mensagem: m })),
    )
    const salvos = await salvarRelatorios(r, pasta)
    if (pedido.saida) await gravar(resolve(s.pasta, pedido.saida), relatorioHtml(r))
    if (pedido.textos) await gravar(resolve(s.pasta, pedido.textos), textosMarkdown(r))
    if (pedido.json && !naTela) await gravar(resolve(s.pasta, pedido.json), `${JSON.stringify(r, null, 2)}\n`)

    const arquivos = {
      relatorio: pedido.saida ? resolve(s.pasta, pedido.saida) : salvos.html,
      textos: pedido.textos ? resolve(s.pasta, pedido.textos) : salvos.textos,
      dados: salvos.json,
    }
    if (naTela) {
      // na tela só o JSON (para scripts e para a skill); o resumo vai para o canal de avisos
      escrever(s.out, JSON.stringify(r, null, 2))
      escrever(s.err, montarResumo(r, arquivos, false))
    } else {
      const comCor = !pedido.semCor && !s.amb.NO_COLOR && Boolean(s.out.isTTY)
      escrever(s.out, montarResumo(r, arquivos, comCor))
    }

    if (r.paginas.every((p) => p.erro)) return 1
    if (pedido.minimoDesempenho !== undefined) {
      const lista = abaixoDoMinimo(r, pedido.minimoDesempenho)
      if (lista.length) {
        escrever(s.err, preencher(textos.cli.abaixoDoMinimo, { minimo: pedido.minimoDesempenho, lista: lista.join(', ') }))
        return 2
      }
    }
    return 0
  } catch (e) {
    if (e instanceof ErroCli || e instanceof ErroRaioX) escrever(s.err, e.message)
    else escrever(s.err, preencher(textos.cli.erros.falhou, { erro: e instanceof Error ? e.message : String(e) }))
    return 1
  }
}
