import process from 'node:process'
import debug from 'debug'
import type { Fika } from '../fika'
import { openBook } from './open'

const debugBook = debug('Fika:book')

export class BookManager {
  constructor(
    private readonly app: Fika,
    private readonly bookPath: string,
    private contentLines: string[],
    private progress: number = 0,
    private bookViewRows: number = 0,
  ) {}

  static async loadContent(params: {
    app: Fika
    bookPath: string
  }) {
    const { app, bookPath } = params

    const bookContent = await openBook(bookPath)

    // Make sure every line content width
    // is resized lower to the terminal columns
    const splitted = bookContent.split('\n')
    const terminalWidth = process.stdout.columns
    const resizedLines = splitted.reduce((acc, current) => {
      if (current.length > terminalWidth) {
        // Cut into 2 lines
        const lineMid = Math.round(current.length / 2)
        acc.push(
          current.slice(0, lineMid),
          current.slice(lineMid),
        )
      }
      else {
        acc.push(current)
      }
      return acc
    }, [] as string[])

    return new BookManager(
      app,
      bookPath,
      resizedLines,
    )
  }

  loadProgress() {
    const bookData = this.app.persist.findBook(this.bookPath)
    this.progress = bookData.progress
    debugBook('Loaded book progress: %d', this.progress)

    return this
  }

  fitTerminalSize() {
    const terminalRows = process.stdout.rows
    // Remaining 1 row for the Fika app info display
    this.bookViewRows = terminalRows - 1
    debugBook('Book view size: %d rows', this.bookViewRows)

    return this
  }
}
