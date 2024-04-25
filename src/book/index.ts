import type { Command } from 'commander'
import type { Fika } from '../fika'
import { BookManager } from './manager'

export function setupBookCommand({ app, program }: {
  app: Fika
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
        .renderViewFrame()
    })
}
