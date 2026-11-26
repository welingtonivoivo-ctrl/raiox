// Teste de verdade: abre o Chromium e roda o Lighthouse numa página de exemplo local.
// Precisa do navegador baixado (pnpm exec playwright-core install chromium).
import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { medir } from '../src/index.js'

const exemplo = (nome: string) => readFileSync(fileURLToPath(new URL(`../../../exemplos/${nome}/index.html`, import.meta.url)))
const pagina = exemplo('basico')
const problemas = exemplo('problemas')
let servidor: Server
let endereco = ''

beforeAll(async () => {
  servidor = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(pagina)
  })
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok))
  const end = servidor.address()
  endereco = `http://127.0.0.1:${typeof end === 'object' && end ? end.port : 0}/`
})
afterAll(() => new Promise<void>((ok) => servidor.close(() => ok())))

describe('medição com Lighthouse', () => {
  it('recusa a página local sem a opção', async () => {
    await expect(medir([endereco])).rejects.toThrow(/localhost/)
  })

  it('mede celular e computador e devolve as 4 notas e as medidas', async () => {
    const r = await medir([endereco], { permitirLocal: true })
    expect(r.versaoFormato).toBe(1)
    expect(r.versaoLighthouse).toMatch(/^\d+\.\d+\.\d+$/)
    const p = r.paginas[0]!
    expect(p.erro).toBeUndefined()
    for (const perfil of ['celular', 'computador'] as const) {
      const res = p.perfis[perfil]!
      for (const n of Object.values(res.notas)) {
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(100)
      }
      // página de exemplo é simples e rápida
      expect(res.notas.desempenho).toBeGreaterThanOrEqual(90)
      expect(res.notas.acessibilidade).toBeGreaterThanOrEqual(90)
      expect(res.medidas.primeiraCoisa.unidade).toBe('s')
      expect(res.medidas.prontoParaTocar).toBeDefined()
    }
  })
})
