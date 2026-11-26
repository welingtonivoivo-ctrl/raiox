// Teste de ponta a ponta: o comando mede uma página de exemplo local de verdade.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ResultadoMedicao } from '@raiox/nucleo'
import { principal } from '../src/principal.js'
import { abaixoDoMinimo, montarResumo } from '../src/resumo.js'

const pagina = readFileSync(fileURLToPath(new URL('../../../exemplos/problemas/index.html', import.meta.url)))
const pasta = mkdtempSync(join(tmpdir(), 'raiox-cli-'))
let servidor: Server
let endereco = ''

function fluxo() {
  let texto = ''
  const w = new Writable({
    write(pedaco, _cod, pronto) {
      texto += String(pedaco)
      pronto()
    },
  })
  return { w, texto: () => texto }
}

function rodar(args: string[]) {
  const out = fluxo()
  const err = fluxo()
  const promessa = principal(args, { out: out.w, err: err.w, amb: { ...process.env, RAIOX_DADOS: join(pasta, 'dados') }, pasta })
  return promessa.then((codigo) => ({ codigo, out: out.texto(), err: err.texto() }))
}

beforeAll(async () => {
  servidor = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(pagina)
  })
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok))
  const end = servidor.address()
  endereco = `http://127.0.0.1:${typeof end === 'object' && end ? end.port : 0}/`
})
afterAll(async () => {
  await new Promise<void>((ok) => servidor.close(() => ok()))
  rmSync(pasta, { recursive: true, force: true })
})

describe('raiox', () => {
  it('ajuda e versão', async () => {
    expect((await rodar(['ajuda'])).out).toContain('raiox analisar <endereço>')
    expect((await rodar(['versao'])).out).toMatch(/^raiox \d+\.\d+\.\d+ · Lighthouse \d+/)
  })

  it('erro de opção devolve código 1 e mensagem em português', async () => {
    const r = await rodar(['analisar', endereco, '--xyz'])
    expect(r.codigo).toBe(1)
    expect(r.err).toContain('Opção não reconhecida: --xyz')
  })

  it('endereço local sem --local é recusado', async () => {
    const r = await rodar(['analisar', endereco])
    expect(r.codigo).toBe(1)
    expect(r.err).toMatch(/localhost/)
  })

  it('analisa, guarda no histórico e grava as cópias pedidas; --json na tela é só JSON', async () => {
    const r = await rodar(['analisar', endereco, '--local', '--perfil', 'celular', '--json', '--saida', 'copia.html', '--textos', 'copia.md'])
    expect(r.codigo).toBe(0)
    const resultado = JSON.parse(r.out) as ResultadoMedicao
    expect(resultado.paginas[0]!.perfis.celular).toBeDefined()
    expect(resultado.paginas[0]!.perfis.computador).toBeUndefined()
    expect(resultado.ajustes.map((a) => a.id)).toContain('lighthouse.image-alt')
    // resumo e andamento no canal de avisos
    expect(r.err).toContain('O que ajustar')
    expect(r.err).toContain('medindo no celular')
    expect(readFileSync(join(pasta, 'copia.html'), 'utf8')).toMatch(/^<!doctype html>/)
    expect(readFileSync(join(pasta, 'copia.md'), 'utf8')).toContain('Texto para a IA:')
    const dados = /Dados: (.+resultado\.json)/.exec(r.err)![1]!
    expect(dados.startsWith(join(pasta, 'dados', 'analises', '127.0.0.1_'))).toBe(true)
    expect(existsSync(dados)).toBe(true)
  })
})

describe('resumo e mínimo de desempenho', () => {
  const base = {
    versaoFormato: 1, versaoRaioX: '0', versaoLighthouse: '13', navegador: 'x', forcaProcessador: 500, avisos: ['lento'],
    site: 'https://a.com/', quando: '2026-11-26T12:00:00Z', ajustes: [],
    paginas: [{
      endereco: 'https://a.com/', comLogin: false,
      perfis: {
        celular: { notas: { desempenho: 72, acessibilidade: 100, boasPraticas: 100, busca: 92 }, medidas: {} },
        computador: { notas: { desempenho: 98, acessibilidade: 100, boasPraticas: 100, busca: 92 }, medidas: {} },
      },
    }],
  } as unknown as ResultadoMedicao

  it('lista as notas abaixo do mínimo', () => {
    expect(abaixoDoMinimo(base, 90)).toEqual(['https://a.com/ (celular: 72)'])
    expect(abaixoDoMinimo(base, 50)).toEqual([])
  })

  it('tabela de notas sem cor, com * no celular quando o PC é lento', () => {
    const t = montarResumo(base, { relatorio: 'r.html', textos: 't.md', dados: 'd.json' }, false)
    expect(t).toContain('Raio-X · a.com')
    expect(t).toMatch(/Desempenho\s+72\*\s+98/)
    expect(t).toContain('* medido num computador lento')
    expect(t).toContain('O que ajustar: nada')
    expect(t).not.toContain('\x1b[')
    expect(montarResumo(base, { relatorio: 'r', textos: 't', dados: 'd' }, true)).toContain('\x1b[')
  })
})
