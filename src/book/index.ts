import type { Command } from 'commander'
import type { Relaxer } from '../relaxer'
import type { BookCommandOptions } from './shared'
import { env } from 'node:process'
import { BookManager } from './manager'
import { debugBook } from './shared'

function getBookHelpText() {
  return `
Command guide in reading a book:
  - Start a command with ':'
  - 's <string>' to search a string in the book
  - 'g <number>' to go to specific line number
  `.trim()
}

export function setupBookCommand({ app, program }: {
  app: Relaxer
  program: Command
}) {
  program
    .command('book <userInputBookPath>')
    .description('Reading a book in terminal.')
    .addHelpText('afterAll', `\n${getBookHelpText()}\n`)
    .option('--keepEmptyLines', 'Keep empty lines in the book content.', false)
    .action(async (userInputBookPath, cmdOptions: BookCommandOptions) => {
      debugBook('Running book command with options:', cmdOptions)

      ;(await BookManager
        .loadContent({ app, userInputBookPath, cmdOptions }))
        .loadProgress()
        .fitTerminalSize()
        .listenKeyPress()
        .endIf(!!env.DEBUG?.includes('Relaxer:book'))
        ?.renderReadingViewFrame()
    })
}
