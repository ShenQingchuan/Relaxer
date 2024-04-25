import process from 'node:process'
import debug from 'debug'
import type { Fika } from '../fika'
import { Color, clearScreen, colorize, print } from '../utils'
import { openBook } from './open'

const debugBook = debug('Fika:book')

export class BookManager {
  constructor(
    private readonly app: Fika,
    private readonly userInputBookPath: string,
    private contentLines: string[],
    private progress: number = 0,
    private bookViewRows: number = 0,
    private lineNumStrLen: number = String(contentLines.length).length,
    private bookName: string = '',
  ) {}

  static async loadContent(params: {
    app: Fika
    userInputBookPath: string
  }) {
    const { app, userInputBookPath } = params

    const { bookPath, bookContent, bookName } = await openBook(userInputBookPath)

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

    const newBookManager = new BookManager(
      app,
      bookPath,
      resizedLines,
    )
    newBookManager.bookName = bookName

    return newBookManager
  }

  loadProgress() {
    const bookData = this.app.persist.findBook(this.userInputBookPath)
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

  renderViewFrame() {
    const currentPageContentLines = this.contentLines.slice(
      this.progress,
      this.progress + this.bookViewRows,
    )
    const displayLines = [
      `${
        colorize(this.bookName, ['bold', 'yellow'])
      } ${
        colorize(`(${this.progress + 1}/${this.contentLines.length})`, ['bold', 'yellow'])
      } - ${
        colorize((this.progress + this.bookViewRows) > this.contentLines.length
          ? '100'
          : `${String(Math.round((this.progress / this.contentLines.length) * 100))
        }%`, ['bold', 'cyan'])
      }`,
    ]
    for (let i = 0; i < currentPageContentLines.length; i++) {
      displayLines.push(`${
        Color
          .cyan(`${String(this.progress + i + 1)
          .padStart(this.lineNumStrLen, ' ')} | `)
      }${
        currentPageContentLines[i]
      }`)
    }

    clearScreen()
    print(displayLines.join('\n'))

    return this
  }
}
