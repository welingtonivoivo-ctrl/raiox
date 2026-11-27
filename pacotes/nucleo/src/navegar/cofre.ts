// Chave mestra do Raio-X (32 bytes), guardada no cofre do sistema (docs/02-TRD.md §4 e 05-BACKEND §8).
// Decisão da Etapa 4: o app e a linha de comando usam o mesmo cofre (@napi-rs/keyring, entrada "Raio-X"),
// para as sessões salvas por um servirem no outro.
import { randomBytes } from 'node:crypto'
import { ErroRaioX } from '../medir/endereco.js'

export type Cofre = {
  ler(): string | null
  gravar(valor: string): void
}

const SERVICO = 'Raio-X'
const CONTA = 'chave-mestra'

/** Cofre só na memória: para testes (RAIOX_COFRE=memoria). Nunca toca o cofre de verdade. */
export function cofreNaMemoria(): Cofre {
  let valor: string | null = null
  return {
    ler: () => valor,
    gravar: (v) => {
      valor = v
    },
  }
}

const memoriaDoProcesso = cofreNaMemoria()

/** Cofre do sistema (Gerenciador de Credenciais no Windows). Carregado só quando for usado. */
async function cofreDoSistema(): Promise<Cofre> {
  let Entry: typeof import('@napi-rs/keyring').Entry
  try {
    ;({ Entry } = await import('@napi-rs/keyring'))
  } catch {
    throw new ErroRaioX('cofreIndisponivel')
  }
  const entrada = new Entry(SERVICO, CONTA)
  return {
    ler: () => {
      try {
        return entrada.getPassword() ?? null
      } catch {
        return null
      }
    },
    gravar: (v) => {
      try {
        entrada.setPassword(v)
      } catch {
        throw new ErroRaioX('cofreIndisponivel')
      }
    },
  }
}

/** Cofre a usar: RAIOX_COFRE=memoria nos testes; senão o do sistema. */
export async function escolherCofre(amb: NodeJS.ProcessEnv = process.env): Promise<Cofre> {
  return amb.RAIOX_COFRE === 'memoria' ? memoriaDoProcesso : cofreDoSistema()
}

/** Lê a chave mestra; cria uma nova na primeira vez. */
export function chaveMestra(cofre: Cofre): Buffer {
  const guardada = cofre.ler()
  if (guardada) {
    const chave = Buffer.from(guardada, 'base64')
    if (chave.length === 32) return chave
    // conteúdo estranho no cofre: não sobrescreve (pode ser de outra versão); avisa
    throw new ErroRaioX('cofreInvalido')
  }
  const nova = randomBytes(32)
  cofre.gravar(nova.toString('base64'))
  return nova
}
