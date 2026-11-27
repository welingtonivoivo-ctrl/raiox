import { defineConfig } from 'vitest/config'

// Os testes de medição abrem o navegador e o Lighthouse: um arquivo por vez, para não
// disputarem o processador (num PC fraco isso derruba a nota de desempenho) e com prazo folgado.
// RAIOX_COFRE=memoria: nenhum teste toca o cofre de senhas de verdade do sistema.
export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 120_000,
    env: { RAIOX_COFRE: 'memoria' },
  },
})
