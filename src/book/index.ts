import type { Command } from 'commander'
import type { Fika } from '../fika'
import { openBook } from './open'
import { BookManager } from './manager'

export function setupBookCommand({ app, program }: {
  app: Fika
  program: Command
}) {
  program
    .command('book <bookPath>')
    .description('Reading a book in terminal.')
    .action(async (bookPath) => {
      (await BookManager
        .loadContent({ app, bookPath }))
        .loadProgress()
        .fitTerminalSize()
    })
}
