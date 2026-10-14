import { createInterface } from 'node:readline/promises'

export const hasFlag = (name: string) => process.argv.includes(`--${name}`)

export const flagValue = (name: string) => {
  const index = process.argv.indexOf(`--${name}`)
  if (index !== -1) return process.argv[index + 1]
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
}

// Pide confirmación antes de tocar la tienda real, salvo que se pase --yes.
export const confirm = async (question: string) => {
  if (hasFlag('yes')) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${question} [s/N] `)
  rl.close()
  return /^s(i|í)?$/i.test(answer.trim())
}

export const run = (main: () => Promise<void>) => {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
