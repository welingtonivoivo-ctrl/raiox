// Site de exemplo com login, para os testes da Etapa 4 (nada aqui é real).
// - /entrar: formulário; POST grava o cookie de sessão e vai para /painel
// - /painel, /perfil, /config: protegidas (sem cookie → 302 para /entrar)
// - /local: protegida pelo localStorage (o script manda para /entrar se faltar o token)
// - links perigosos e de fora no /painel, para a descoberta pular
// Cada pedido fica em `abertos`, para o teste provar que nada perigoso foi aberto.
import { createServer } from 'node:http'

const COOKIE = 'sessao_exemplo'
const VALOR = 'valor-secreto-da-sessao-123'

const pagina = (titulo, corpo) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo}</title>
<meta name="description" content="Página de exemplo do Raio-X."></head>
<body><main><h1>${titulo}</h1>${corpo}</main></body></html>`

const PAINEL = pagina('Painel', `
<p>Bem-vindo de volta.</p>
<nav>
  <a href="/perfil">Meu perfil</a>
  <a href="/config">Configurações</a>
  <a href="/local">Área com token</a>
  <a href="/perfil#topo">Perfil (âncora)</a>
  <a href="/sair">Sair</a>
  <a href="/conta/excluir">Excluir conta</a>
  <a href="/checkout?x=1">Finalizar</a>
  <a href="/loja?acao=comprar">Comprar</a>
  <a href="/ajuda">Cancelar assinatura</a>
  <a href="/arquivo.pdf">Manual em PDF</a>
  <a href="/baixar" download>Baixar</a>
  <a href="mailto:contato@example.com">E-mail</a>
  <a href="tel:+5511999999999">Telefone</a>
  <a href="javascript:void(0)">Nada</a>
  <a href="https://example.org/fora">Site de fora</a>
</nav>`)

export function criarSiteComLogin() {
  const abertos = []
  const servidor = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://exemplo')
    abertos.push(`${req.method} ${url.pathname}${url.search}`)
    const logado = (req.headers.cookie ?? '').split(/;\s*/).includes(`${COOKIE}=${VALOR}`)
    const html = (corpo, codigo = 200) => {
      res.writeHead(codigo, { 'content-type': 'text/html; charset=utf-8' })
      res.end(corpo)
    }
    if (url.pathname === '/entrar' && req.method === 'POST') {
      res.writeHead(302, { location: '/painel', 'set-cookie': `${COOKIE}=${VALOR}; Path=/; HttpOnly; SameSite=Lax` })
      return res.end()
    }
    if (url.pathname === '/entrar') {
      return html(pagina('Entrar', '<form method="post" action="/entrar"><label>Senha <input type="password" name="s"></label><button>Entrar</button></form>'))
    }
    if (url.pathname === '/' ) return html(pagina('Início', '<p>Página pública.</p><a href="/painel">Painel</a>'))
    if (url.pathname === '/local') {
      // página que depende só do localStorage (como apps que guardam o token no navegador)
      return html(pagina('Área com token', `<p id="estado">conferindo…</p>
<script>if (localStorage.getItem('token_exemplo') !== 'ok') location.replace('/entrar'); else document.getElementById('estado').textContent = 'token ok';</script>`))
    }
    if (['/painel', '/perfil', '/config'].includes(url.pathname)) {
      if (!logado) {
        res.writeHead(302, { location: '/entrar' })
        return res.end()
      }
      if (url.pathname === '/painel') return html(PAINEL)
      return html(pagina(url.pathname === '/perfil' ? 'Meu perfil' : 'Configurações', '<p>Área fechada.</p><a href="/painel">Voltar</a>'))
    }
    // qualquer outro endereço (inclusive os perigosos): 404 — mas fica registrado em `abertos`
    return html(pagina('Não encontrada', '<p>404</p>'), 404)
  })
  return {
    servidor,
    abertos,
    cookie: { nome: COOKIE, valor: VALOR },
    async iniciar() {
      await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
      const end = servidor.address()
      return `http://127.0.0.1:${typeof end === 'object' && end ? end.port : 0}`
    },
    fechar: () => new Promise((ok) => servidor.close(() => ok())),
  }
}
