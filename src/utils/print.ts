import { exit, stdout } from 'node:process'
import { colorize } from './colorize'

export function print(message: string) {
  stdout.write(message)
}

export function println(message: string) {
  stdout.write(`${message}\n`)
}

export function printPanic(err: unknown): never {
  println(
    colorize(
      `Relaxer panic: ${String(err)}`,
      ['red', 'bold'],
    ),
  )
  exit(-1)
}

export function clearScreen() {
  stdout.write('\x1B[2J\x1B[3J\x1B[H')
}
