// Instala a partir do repositório (enquanto o Raio-X não está publicado no npm):
//   node scripts/instalar.mjs comando     → cria o comando `raiox` na pasta global do npm (já no PATH)
//   node scripts/instalar.mjs skill       → liga a skill em ~/.claude/skills/raiox (junção, sem copiar)
//   node scripts/instalar.mjs desinstalar → remove os dois (só o que este script criou)
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(REPO, 'pacotes', 'cli', 'bin', 'raiox.mjs')
const SKILL = join(REPO, 'skill', 'raiox')
const DESTINO_SKILL = join(homedir(), '.claude', 'skills', 'raiox')
const MARCA = 'Raio-X: instalado pelo repositório (scripts/instalar.mjs)'
const windows = process.platform === 'win32'

function pastaGlobal() {
  try {
    const prefixo = execFileSync(windows ? 'npm.cmd' : 'npm', ['prefix', '-g'], { encoding: 'utf8', shell: windows }).trim()
    return windows ? prefixo : join(prefixo, 'bin')
  } catch {
    return dirname(process.execPath)
  }
}

function atalhos() {
  const pasta = pastaGlobal()
  return windows
    ? [
        [join(pasta, 'raiox.cmd'), `@echo off\r\nREM ${MARCA}\r\nnode "${BIN}" %*\r\n`],
        [join(pasta, 'raiox.ps1'), `# ${MARCA}\r\n& node "${BIN}" @args\r\nexit $LASTEXITCODE\r\n`],
        [join(pasta, 'raiox'), `#!/bin/sh\n# ${MARCA}\nexec node "${BIN.replace(/\\/g, '/')}" "$@"\n`],
      ]
    : [[join(pasta, 'raiox'), `#!/bin/sh\n# ${MARCA}\nexec node "${BIN}" "$@"\n`]]
}

const nosso = (arquivo) => existsSync(arquivo) && readFileSync(arquivo, 'utf8').includes(MARCA)

function instalarComando() {
  for (const [arquivo, conteudo] of atalhos()) {
    if (existsSync(arquivo) && !nosso(arquivo)) {
      console.error(`Já existe ${arquivo} que não foi criado pelo Raio-X. Nada foi mudado.`)
      process.exit(1)
    }
  }
  for (const [arquivo, conteudo] of atalhos()) writeFileSync(arquivo, conteudo, { mode: 0o755 })
  console.log(`Comando instalado: ${atalhos().map(([a]) => a).join(', ')}\nTeste com: raiox versao`)
}

function ehLigacao(caminho) {
  try {
    return lstatSync(caminho).isSymbolicLink()
  } catch {
    return false
  }
}

function instalarSkill() {
  if (existsSync(DESTINO_SKILL) || ehLigacao(DESTINO_SKILL)) {
    if (ehLigacao(DESTINO_SKILL) && resolve(readlinkSync(DESTINO_SKILL)) === resolve(SKILL)) {
      console.log(`A skill já está ligada: ${DESTINO_SKILL}`)
      return
    }
    console.error(`Já existe ${DESTINO_SKILL} que não aponta para este repositório. Nada foi mudado.`)
    process.exit(1)
  }
  mkdirSync(dirname(DESTINO_SKILL), { recursive: true })
  symlinkSync(SKILL, DESTINO_SKILL, windows ? 'junction' : 'dir')
  console.log(`Skill ligada: ${DESTINO_SKILL} → ${SKILL}\nAbra uma nova conversa no Claude Code para ela aparecer.`)
}

function desinstalar() {
  for (const [arquivo] of atalhos()) {
    if (nosso(arquivo)) {
      unlinkSync(arquivo)
      console.log(`Removido: ${arquivo}`)
    }
  }
  if (ehLigacao(DESTINO_SKILL) && resolve(readlinkSync(DESTINO_SKILL)) === resolve(SKILL)) {
    // apaga só a ligação, nunca a pasta do repositório (junção no Windows sai com rmdir; ligação no Linux/Mac com unlink)
    if (windows) rmdirSync(DESTINO_SKILL)
    else unlinkSync(DESTINO_SKILL)
    console.log(`Removida a ligação da skill: ${DESTINO_SKILL}`)
  }
}

const acao = process.argv[2]
if (acao === 'comando') instalarComando()
else if (acao === 'skill') instalarSkill()
else if (acao === 'desinstalar') desinstalar()
else {
  console.error('Uso: node scripts/instalar.mjs comando|skill|desinstalar')
  process.exit(1)
}
