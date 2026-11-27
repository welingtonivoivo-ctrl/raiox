// Comando `raiox`: analisar (com ou sem login), entrar, descobrir, sessoes.
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import textos from '@raiox/textos/pt-BR.json' with { type: 'json' }
import {
  ErroRaioX,
  Registro,
  VERSAO_LIGHTHOUSE,
  VERSAO_RAIOX,
  abrirNavegador,
  apagarSessao,
  caminhoDaSessao,
  conferirEndereco,
  conferirSessao,
  descobrirPaginas,
  entrar,
  lerSessao,
  listarSessoes,
  medir,
  preencher,
  relatorioHtml,
  salvarRelatorios,
  textosMarkdown,
  pastaDaAnalise,
  pastaDeDados,
  type ResultadoDescoberta,
} from '@raiox/nucleo'
import { ErroCli, lerArgumentos, type PedidoCli } from './argumentos.js'
import { abaixoDoMinimo, montarResumo } from './resumo.js'

export type Saidas = {
  /** Resultado (resumo, ou o JSON com --json sem arquivo). */
  out: NodeJS.WritableStream & { isTTY?: boolean }
  /** Andamento, avisos e erros. */
  err: NodeJS.WritableStream
  amb: NodeJS.ProcessEnv
  /** Pasta de onde o comando foi chamado (o pnpm troca a pasta; INIT_CWD guarda a original). */
  pasta: string
  /** Entrada do terminal (Enter = "já entrei"). Ausente fora do terminal: só fechar a janela termina. */
  entrada?: NodeJS.ReadableStream & { isTTY?: boolean }
}

const PADRAO: Saidas = {
  out: process.stdout,
  err: process.stderr,
  amb: process.env,
  pasta: process.env.INIT_CWD ?? process.cwd(),
  entrada: process.stdin,
}

async function gravar(caminho: string, conteudo: string): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true })
  await writeFile(caminho, conteudo, 'utf8')
}

const escrever = (fluxo: NodeJS.WritableStream, texto: string) => fluxo.write(`${texto}\n`)

/** Promessa que resolve no primeiro Enter do terminal (e para de ouvir depois). */
function esperarEnter(entrada: Saidas['entrada']): { promessa: Promise<void>; parar: () => void } {
  if (!entrada?.isTTY) return { promessa: new Promise(() => {}), parar: () => {} }
  let parar = () => {}
  const promessa = new Promise<void>((ok) => {
    const aoLer = (pedaco: Buffer | string) => {
      if (String(pedaco).includes('\n') || String(pedaco).includes('\r')) ok()
    }
    entrada.on('data', aoLer)
    entrada.resume()
    parar = () => {
      entrada.off('data', aoLer)
      entrada.pause()
    }
  })
  return { promessa, parar }
}

async function comandoEntrar(p: PedidoCli, s: Saidas): Promise<number> {
  const endereco = conferirEndereco(p.enderecos[0]!, p.permitirLocal).href
  const t = textos.cli.entrar
  escrever(s.err, preencher(t.abrindo, { endereco }))
  const enter = esperarEnter(s.entrada)
  let r: Awaited<ReturnType<typeof entrar>>
  try {
    r = await entrar(endereco, {
      amb: s.amb,
      jaEntrei: enter.promessa.then(() => {
        escrever(s.err, t.conferindo)
      }),
      aoAndar: () => escrever(s.out, t.instrucoes),
    })
  } finally {
    enter.parar()
  }
  escrever(s.out, preencher(t.salva, { arquivo: caminhoDaSessao(endereco, s.amb), endereco: r.entrada ?? endereco }))
  if (!r.confirmada) escrever(s.err, preencher(t.naoConfirmada, { entrada: r.entrada ?? endereco }))
  return 0
}

async function comandoSessoes(p: PedidoCli, s: Saidas): Promise<number> {
  const t = textos.cli.sessoes
  if (p.acaoSessoes === 'listar') {
    const lista = await listarSessoes(s.amb)
    if (!lista.length) escrever(s.out, t.nenhuma)
    else {
      escrever(s.out, preencher(t.titulo, { pasta: pastaDeDados(s.amb) }))
      for (const x of lista) {
        const quando = new Date(x.alteradaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        escrever(s.out, preencher(t.linha, { host: x.host, quando }))
      }
    }
    return 0
  }
  const site = p.enderecos[0]!
  if (p.acaoSessoes === 'apagar') {
    escrever(s.out, preencher((await apagarSessao(site, { amb: s.amb })) ? t.apagada : t.naoHavia, { site }))
    return 0
  }
  const e = await conferirSessao(site, { amb: s.amb })
  if (!e.existe) throw new ErroRaioX('semSessao')
  escrever(s.out, preencher(e.valida ? t.valida : t.vencida, { site }))
  return e.valida ? 0 : 1
}

async function sessaoObrigatoria(site: string, s: Saidas) {
  const salva = await lerSessao(site, { amb: s.amb })
  if (!salva) throw new ErroRaioX('semSessao')
  return salva
}

async function descobrir(p: PedidoCli, s: Saidas, inicio: string, registro: Registro): Promise<ResultadoDescoberta> {
  const salva = await sessaoObrigatoria(inicio, s)
  const nav = await abrirNavegador({ sessao: salva.estado })
  try {
    return await descobrirPaginas(
      nav.contexto,
      inicio,
      {
        ...(p.limite ? { limite: p.limite } : {}),
        ...(p.paginas ? { limite: Math.max(p.paginas, 1) } : {}),
        ...(p.niveis ? { niveis: p.niveis } : {}),
        evitar: p.evitar,
      },
      registro,
      (m) => escrever(s.err, preencher(textos.cli.andamento, { mensagem: m })),
    )
  } finally {
    await nav.fechar()
  }
}

async function comandoDescobrir(p: PedidoCli, s: Saidas): Promise<number> {
  const inicio = conferirEndereco(p.enderecos[0]!, p.permitirLocal).href
  const registro = new Registro()
  const r = await descobrir(p, s, inicio, registro)
  if (p.json === '-') {
    escrever(s.out, JSON.stringify({ ...r, registro: registro.entradas }, null, 2))
    return 0
  }
  if (p.json) await gravar(resolve(s.pasta, p.json), `${JSON.stringify({ ...r, registro: registro.entradas }, null, 2)}\n`)
  const t = textos.cli.descobrir
  escrever(s.out, preencher(t.titulo, { site: inicio, n: r.paginas.length }))
  for (const pg of r.paginas) escrever(s.out, `  ${pg.endereco}${pg.texto ? `   (${pg.texto})` : ''}`)
  if (r.puladas.length) {
    escrever(s.out, `\n${preencher(t.puladas, { n: r.puladas.length })}`)
    for (const x of r.puladas) escrever(s.out, `  ${x.endereco}   — ${x.motivo}`)
  }
  escrever(s.out, `\n${preencher(t.abertos, { n: registro.entradas.length })}`)
  for (const e of registro.entradas) escrever(s.out, `  ${e.endereco}`)
  escrever(s.out, `\n${preencher(t.medir, { site: inicio, n: r.paginas.length })}`)
  return 0
}

async function comandoAnalisar(p: PedidoCli, s: Saidas): Promise<number> {
  const naTela = p.json === '-'
  const andar = (m: string) => escrever(s.err, preencher(textos.cli.andamento, { mensagem: m }))
  const registro = new Registro()
  let enderecos = p.enderecos.map((e) => conferirEndereco(e, p.permitirLocal).href)
  let sessao: Awaited<ReturnType<typeof sessaoObrigatoria>> | undefined
  let puladas: ResultadoDescoberta['puladas'] = []
  if (p.comLogin) {
    sessao = await sessaoObrigatoria(enderecos[0]!, s)
    if (p.paginas) {
      const d = await descobrir(p, s, enderecos[0]!, registro)
      puladas = d.puladas
      // as digitadas primeiro, depois as descobertas, sem repetir, até o limite
      const juntas = [...enderecos, ...d.paginas.map((x) => x.endereco)]
      enderecos = [...new Set(juntas)].slice(0, Math.max(p.paginas, p.enderecos.length))
    }
  }
  const pasta = pastaDaAnalise(enderecos[0]!, new Date(), s.amb)
  const r = await medir(
    enderecos,
    {
      perfis: p.perfis,
      precisao: p.precisao,
      permitirLocal: p.permitirLocal,
      ...(p.bruto ? { pastaBruta: pasta } : {}),
      ...(sessao ? { sessao: sessao.estado } : {}),
    },
    andar,
    registro,
  )
  if (puladas.length) r.puladas = puladas
  const salvos = await salvarRelatorios(r, pasta)
  if (p.saida) await gravar(resolve(s.pasta, p.saida), relatorioHtml(r))
  if (p.textos) await gravar(resolve(s.pasta, p.textos), textosMarkdown(r))
  if (p.json && !naTela) await gravar(resolve(s.pasta, p.json), `${JSON.stringify(r, null, 2)}\n`)

  const arquivos = {
    relatorio: p.saida ? resolve(s.pasta, p.saida) : salvos.html,
    textos: p.textos ? resolve(s.pasta, p.textos) : salvos.textos,
    dados: salvos.json,
  }
  let resumo = montarResumo(r, arquivos, false)
  if (naTela) {
    // na tela só o JSON (para scripts e para a skill); o resumo vai para o canal de avisos
    escrever(s.out, JSON.stringify(r, null, 2))
  } else {
    const comCor = !p.semCor && !s.amb.NO_COLOR && Boolean(s.out.isTTY)
    resumo = montarResumo(r, arquivos, comCor)
  }
  if (r.registro) resumo += `\n${preencher(textos.cli.registro, { n: r.registro.length })}`
  escrever(naTela ? s.err : s.out, resumo)

  if (r.paginas.every((pg) => pg.erro)) return 1
  if (p.minimoDesempenho !== undefined) {
    const lista = abaixoDoMinimo(r, p.minimoDesempenho)
    if (lista.length) {
      escrever(s.err, preencher(textos.cli.abaixoDoMinimo, { minimo: p.minimoDesempenho, lista: lista.join(', ') }))
      return 2
    }
  }
  return 0
}

/** Roda o comando e devolve o código de saída: 0 deu certo, 1 erro, 2 desempenho abaixo do mínimo. */
export async function principal(args: string[], s: Saidas = PADRAO): Promise<number> {
  try {
    const pedido = lerArgumentos(args)
    switch (pedido.comando) {
      case 'ajuda':
        escrever(s.out, preencher(textos.cli.ajuda, { pasta: pastaDeDados(s.amb) }))
        return 0
      case 'versao':
        escrever(s.out, `raiox ${VERSAO_RAIOX} · Lighthouse ${VERSAO_LIGHTHOUSE}`)
        return 0
      case 'entrar':
        return await comandoEntrar(pedido, s)
      case 'sessoes':
        return await comandoSessoes(pedido, s)
      case 'descobrir':
        return await comandoDescobrir(pedido, s)
      default:
        return await comandoAnalisar(pedido, s)
    }
  } catch (e) {
    if (e instanceof ErroCli || e instanceof ErroRaioX) escrever(s.err, e.message)
    else escrever(s.err, preencher(textos.cli.erros.falhou, { erro: e instanceof Error ? e.message : String(e) }))
    return 1
  }
}
