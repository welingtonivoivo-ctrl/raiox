// Registro de cada endereço que o Raio-X abriu (para provar que nada perigoso foi aberto).
// Vai para o resultado.json: o endereço passa pela limpeza de segredos (?token=… vira ••••).
import { limparEndereco } from '../ajustes/segredos.js'

export type MotivoAbertura = 'conferencia' | 'descoberta' | 'medicao'

export type EntradaRegistro = {
  quando: string
  endereco: string
  motivo: MotivoAbertura
}

export class Registro {
  readonly entradas: EntradaRegistro[] = []

  anotar(endereco: string, motivo: MotivoAbertura): void {
    this.entradas.push({ quando: new Date().toISOString(), endereco: limparEndereco(endereco), motivo })
  }
}

/** Espera o necessário para não passar de 1 página por segundo. */
export class Ritmo {
  private ultima = 0

  constructor(private readonly intervaloMs = 1000) {}

  async esperar(): Promise<void> {
    const falta = this.ultima + this.intervaloMs - Date.now()
    if (falta > 0) await new Promise((ok) => setTimeout(ok, falta))
    this.ultima = Date.now()
  }
}
