import process from 'node:process'
import debug from 'debug'
import type { Fika } from '../fika'
import { Color, clearScreen, colorize, print } from '../utils'
import type { FikaBookData } from '../persist'
import { chunkString } from '../utils/chunk-string'
import { BreakableChain } from '../utils/breakable-chain'
import { openBook } from './open'

const debugBook = debug('Fika:book')

export class BookManager extends BreakableChain {
  constructor(
    private readonly app: Fika,
    private readonly userInputBookPath: string,
    private contentLines: string[],
    private progress: number = 0,
    private bookViewRows: number = 0,
    private lineNumStrLen: number = String(contentLines.length).length,
    private bookName: string = '',
    private bookData?: FikaBookData,
    private isOnReadingView: boolean = false,
  ) {
    super()
  }

  private readonly readingViewKeyActionsMap: Record<string, () => void> = {
    'q': async () => {
      clearScreen()
      await this.saveProgress()
      process.exit(0)
    },
    'j': () => {
      this.progress = Math.min(
        this.progress + this.bookViewRows,
        this.contentLines.length,
      )
      this.renderReadingViewFrame()
    },
    'k': () => {
      this.progress = Math.max(0, this.progress - this.bookViewRows)
      this.renderReadingViewFrame()
    },
    '\r': () => {
      if (this.isOnReadingView)
        return

      this.renderReadingViewFrame()
      this.isOnReadingView = true
    },
  }

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
    const widthFactor = 0.45
    const displayWidth = Math.floor(widthFactor * terminalWidth)

    debugBook('Terminal width: %d', terminalWidth)
    debugBook('Display width: %d', displayWidth)
    debugBook(
      'Has line length greater than %d: %o',
      displayWidth,
      splitted.some(line => line.length > displayWidth),
    )

    const resizedLines: string[] = []
    for (const line of splitted) {
      if (line.length > displayWidth) {
        // Split the current line into chunks
        const chunks = chunkString(line, displayWidth)
        const chunk1Spaces = chunks[0].match(/\s*$/)?.[0] || ''
        for (let i = 1; i < chunks.length; i++)
          chunks[i] = chunk1Spaces + chunks[i]

        resizedLines.push(...chunks)
      }
      else {
        resizedLines.push(line)
      }
    }

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
    this.bookData = bookData
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

  listenKeyPress() {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (key: string) => {
      const action = this.readingViewKeyActionsMap[key]
      action?.()
    })

    return this
  }

  renderReadingViewFrame() {
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
          (this.progress + this.bookViewRows) > this.contentLines.length
            ? colorize('\u{1F389} Finished', ['bold', 'green'])
            : colorize(
              `${String(((this.progress / this.contentLines.length) * 100).toFixed(2))}%`,
              ['bold', 'cyan'],
            )
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

  async saveProgress() {
    if (!this.bookData)
      return this

    this.bookData.progress = this.progress
    await this.app.persist.save()

    return this
  }
}
