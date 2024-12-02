import { env } from 'node:process'
import type { Command } from 'commander'
import type { Relaxer } from '../relaxer'
import { BookManager } from './manager'

export function setupBookCommand({ app, program }: {
  app: Relaxer
  program: Command
}) {
  program
    .command('book <userInputBookPath>')
    .description('Reading a book in terminal.')
    .action(async (userInputBookPath) => {
      (await BookManager
        .loadContent({ app, userInputBookPath }))
        .loadProgress()
        .fitTerminalSize()
        .listenKeyPress()
        .endIf(!!env.DEBUG?.includes('Relaxer:book'))
        ?.renderReadingViewFrame()
    })
}
