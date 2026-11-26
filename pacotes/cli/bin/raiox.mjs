#!/usr/bin/env node
// Comando `raiox`. O código é TypeScript: o tsx traduz na hora (sem etapa de compilação).
// A versão empacotada (compilada) chega com o instalador, na Etapa 9.
import { register } from 'tsx/esm/api'

register()
const { principal } = await import('../src/principal.ts')
process.exitCode = await principal(process.argv.slice(2))
