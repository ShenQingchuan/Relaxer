import { exit, stdout } from 'node:process'
import { colorize } from './colorize'

export function println(message: string) {
  stdout.write(`${message}\n`)
}

export function printPanic(err: unknown): never {
  println(
    colorize(
      `Fika panic: ${String(err)}`,
      ['red', 'bold'],
    ),
  )
  exit(-1)
}
