import type { RelaxerBookData } from '../persist'
import type { Relaxer } from '../relaxer'
import type { BookCommandOptions } from './shared'
import process from 'node:process'
import { clearScreen, Color, colorize, print, println } from '../utils'
import { BreakableChain } from '../utils/breakable-chain'
import { chunkString } from '../utils/chunk-string'
import { listenKeyOnce } from '../utils/listen-key-once'
import { openBook } from './open'
import { debugBook } from './shared'

export class BookManager extends BreakableChain {
  private isDebugWaitStart: boolean = process.env.DEBUG?.includes('Relaxer:book') || false
  private isOnSearchView: boolean = false
  private isOnCmdMode: boolean = false
  private isOnCmdErrorView: boolean = false
  private cmdInput: string = ''
  private searchFoundLineIndexes: number[] = []
  private searchViewDisplayIndex: number = 0

  constructor(
    private readonly app: Relaxer,
    private readonly userInputBookPath: string,
    private contentLines: string[],
    private progress: number = 0,
    private bookViewRows: number = 0,
    private lineNumStrLen: number = String(contentLines.length).length,
    private bookName: string = '',
    private bookData?: RelaxerBookData,
  ) {
    super()
  }

  get cmdArgsList() {
    return this.cmdInput.split(' ').slice(1)
  }

  get cmdArgsStr() {
    return this.cmdArgsList.join(' ')
  }

  private readonly readingViewKeyActionsMap: Record<string, () => void> = {
    'q': async () => {
      await this.exitBook()
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
    ':': () => {
      this.isOnCmdMode = true
      this.cmdInput = ''
      this.renderReadingViewFrame()
    },
  }

  static async loadContent(params: {
    app: Relaxer
    userInputBookPath: string
    cmdOptions: BookCommandOptions
  }) {
    const { app, userInputBookPath, cmdOptions } = params

    const { bookPath, bookContent, bookName } = await openBook(userInputBookPath)

    // Make sure every line content width
    // is resized lower to the terminal columns
    const splitted = bookContent.split('\n')
    const terminalWidth = process.stdout.columns
    const widthFactor = 0.45
    const displayWidth = Math.floor(widthFactor * terminalWidth)

    debugBook('Terminal width: %d', terminalWidth)
    debugBook('Display width: %d', displayWidth)

    const hasOverflowLine = splitted.some(line => line.length > displayWidth)
    debugBook(
      'Has line length greater than %d: %o',
      displayWidth,
      hasOverflowLine,
    )

    const resizedLines: string[] = []
    for (const line of splitted) {
      if (line.trim() === '' && !cmdOptions.keepEmptyLines) {
        // Remove empty lines
        continue
      }

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
    // Remaining 1 row for the Relaxer app info display
    this.bookViewRows = terminalRows - 1
    debugBook('Book view size: %d rows', this.bookViewRows)

    return this
  }

  listenKeyPress() {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (key: string) => {
      if (this.isDebugWaitStart) {
        this.handleDebugStartKeyPress(key)
        return
      }
      if (this.isOnCmdMode) {
        this.handleCmdModeKeyPress(key)
        return
      }
      if (this.isOnSearchView) {
        this.handleSearchViewKeyPress(key)
        return
      }

      const action = this.readingViewKeyActionsMap[key]
      action?.()
    })

    return this
  }

  handleDebugStartKeyPress(key: string) {
    if (key === 'q') {
      this.exitBook()
    }
    // Hit enter to start reading view
    else if (key === '\r') {
      this.isDebugWaitStart = false
      this.renderReadingViewFrame()
    }
    else {
      println(
        Color.red(
          `Pressed key is ignored until hit 'Enter' to start reading view.`,
        ),
      )
    }
  }

  handleCmdModeKeyPress(key: string) {
    switch (key) {
      case '\r': // Enter
        this.execCmd()
        this.isOnCmdMode = false
        // If switched to search view, keep cmdInput for keyword display
        // If showing error view, don't overwrite it
        if (!this.isOnSearchView && !this.isOnCmdErrorView) {
          this.cmdInput = ''
          this.renderReadingViewFrame()
        }
        break
      case '\u007F': // Backspace
        // Use Array.from to handle multi-byte Unicode characters (e.g. Chinese)
        this.cmdInput = Array.from(this.cmdInput).slice(0, -1).join('')
        this.renderReadingViewFrame()
        break
      case '\u001B': // Escape
        this.isOnCmdMode = false
        this.cmdInput = ''
        this.renderReadingViewFrame()
        break
      default:
        // Ignore control characters
        if (key.codePointAt(0)! < 32)
          break
        this.cmdInput += key
        this.renderReadingViewFrame()
    }
  }

  handleSearchViewKeyPress(key: string) {
    switch (key) {
      case 'q':
        this.isOnSearchView = false
        this.renderReadingViewFrame() // Quit search view, back to reading view
        break
      case 'j': {
        if (this.searchViewDisplayIndex < this.searchFoundLineIndexes.length - 1) {
          this.searchViewDisplayIndex = Math.min(
            this.searchFoundLineIndexes.length - 1,
            this.searchViewDisplayIndex + 1,
          )
        }

        this.renderSearchViewFrame()
        break
      }
      case 'k': {
        if (this.searchViewDisplayIndex > 0)
          this.searchViewDisplayIndex = Math.max(0, this.searchViewDisplayIndex - 1)

        this.renderSearchViewFrame()
        break
      }
      case '\r':
        this.isOnSearchView = false
        // Only jump to line if there are search results
        if (this.searchFoundLineIndexes.length > 0) {
          this.progress = this.searchFoundLineIndexes[this.searchViewDisplayIndex]
        }
        this.renderReadingViewFrame()
        break
    }
  }

  showCmdError(message: string) {
    this.isOnCmdErrorView = true
    clearScreen()
    println(
      colorize(
        [
          '┌─────────────────────────────────────────┐',
          `│  ${message.padEnd(39)}│`,
          '│  Enter to continue reading ...          │',
          '│  Type "q" to quit.                      │',
          '└─────────────────────────────────────────┘',
        ].join('\n'),
        ['red', 'bold'],
      ),
    )
    listenKeyOnce({
      '\r': () => {
        this.isOnCmdErrorView = false
        this.renderReadingViewFrame()
      },
      'q': () => this.exitBook(),
    })
  }

  execCmd() {
    const [cmdType, ...cmdArgs] = this.cmdInput.split(' ')
    const cmdArgsStr = cmdArgs.join(' ').trim()

    switch (cmdType) {
      case 's': {
        if (!cmdArgsStr) {
          this.showCmdError('Usage: s <keyword>')
          break
        }

        // Reset search state
        this.searchFoundLineIndexes = []
        this.searchViewDisplayIndex = 0

        this.isOnCmdMode = false
        this.isOnSearchView = true

        // Search
        for (let i = 0; i < this.contentLines.length; i++) {
          if (this.contentLines[i].includes(cmdArgsStr))
            this.searchFoundLineIndexes.push(i)
        }
        this.renderSearchViewFrame()
        break
      }
      case 'g': {
        const lineNum = Number(cmdArgs[0])
        if (!cmdArgs[0] || Number.isNaN(lineNum)) {
          this.showCmdError('Usage: g <line_number>')
          break
        }

        this.progress = Math.min(
          Math.max(0, lineNum - 1),
          this.contentLines.length,
        )
        break
      }
      case 'j': {
        const n = Number(cmdArgs[0])
        if (!cmdArgs[0] || Number.isNaN(n)) {
          this.showCmdError('Usage: j <n>')
          break
        }

        this.progress = Math.min(
          this.progress + n,
          this.contentLines.length,
        )
        break
      }
      case 'k': {
        const n = Number(cmdArgs[0])
        if (!cmdArgs[0] || Number.isNaN(n)) {
          this.showCmdError('Usage: k <n>')
          break
        }

        this.progress = Math.max(0, this.progress - n)
        break
      }
      default: {
        const displayCmd = cmdType.length > 22
          ? `${cmdType.slice(0, 19)}...`
          : cmdType
        this.showCmdError(`Unknown command: ${displayCmd}`)
        break
      }
    }
  }

  composeReadingViewTitle() {
    const bookName = colorize(this.bookName, ['bold', 'yellow'])
    const readProgress = this.progress + 1 > this.contentLines.length
      ? colorize('END', ['bold', 'yellow'])
      : colorize(`(${this.progress + 1}/${this.contentLines.length})`, ['bold', 'yellow'])
    const readPercentage = (this.progress + this.bookViewRows) > this.contentLines.length
      ? colorize('\u{1F389} Finished reading!', ['bold', 'green'])
      : colorize(
        `${String(((this.progress / this.contentLines.length) * 100).toFixed(2))}%`,
        ['bold', 'cyan'],
      )

    const basicTitle = `${bookName} ${readProgress} - ${readPercentage}`
    const titleParts = [basicTitle]

    if (this.isOnCmdMode) {
      const cmd = colorize(
        ` :${this.cmdInput} `,
        ['bold', 'grey', 'bgWhite'],
      )
      titleParts.push(cmd)
    }

    return titleParts.join(' ')
  }

  composeSearchViewTitle() {
    const bookName = colorize(this.bookName, ['bold', 'yellow'])
    const searchKeyword = colorize(this.cmdArgsStr, ['bold', 'cyan'])
    const searchFoundCount = colorize(
      this.searchFoundLineIndexes.length === 0
        ? 'No result found'
        : `(${this.searchViewDisplayIndex + 1} / ${this.searchFoundLineIndexes.length} found)`,
      ['bold', 'cyan'],
    )

    return `${bookName} Search: ${searchKeyword} - ${searchFoundCount}`
  }

  renderSearchViewFrame() {
    const displayLines = [
      this.composeSearchViewTitle(),
    ]

    // No search results
    if (this.searchFoundLineIndexes.length === 0) {
      clearScreen()
      print(displayLines.join('\n'))
      return
    }

    // Display lines before and after the current found line
    const displayIndex = this.searchFoundLineIndexes[this.searchViewDisplayIndex]
    const lineIndexBeforeCount = Math.ceil((this.bookViewRows - 1) / 2)
    const lineIndexAfterCount = lineIndexBeforeCount + (this.bookViewRows % 2 === 0 ? 0 : 1)
    const displayStartIndex = Math.max(0, displayIndex - lineIndexBeforeCount)
    const highlightLineOffset = displayIndex - displayStartIndex
    const searchViewLines = this.contentLines
      .slice(
        displayStartIndex,
        displayIndex + lineIndexAfterCount,
      )
    for (let i = 0; i < searchViewLines.length; i++) {
      // Highlight the found line
      if (i === highlightLineOffset) {
        // Replace the found keyword with red color
        const foundLine = searchViewLines[i]
        const foundKeyword = this.cmdArgsStr
        const foundKeywordIndex = foundLine.indexOf(foundKeyword)
        const foundKeywordEndIndex = foundKeywordIndex + foundKeyword.length
        const foundKeywordColorized = colorize(
          foundLine.slice(foundKeywordIndex, foundKeywordEndIndex),
          ['bold', 'red'],
        )
        const strBeforeKeyword = foundLine.slice(0, foundKeywordIndex)
        const strAfterKeyword = foundLine.slice(foundKeywordEndIndex)
        const hightlightedContent = `${
          colorize(strBeforeKeyword, ['bold', 'bgYellow'])
        }${
          colorize(foundKeywordColorized, ['bold', 'bgYellow'])
        }${
          colorize(strAfterKeyword, ['bold', 'bgYellow'])
        }`

        displayLines.push(`${
          colorize(
            `${String(displayIndex + 1).padStart(this.lineNumStrLen, ' ')} | `,
            ['bold', 'bgYellow', 'cyan'],
          )
        }${
          hightlightedContent
        }`)
      }
      else {
        displayLines.push(`${
          Color
            .cyan(`${String(displayStartIndex + i + 1)
              .padStart(this.lineNumStrLen, ' ')} | `)
        }${
          searchViewLines[i]
        }`)
      }
    }

    clearScreen()
    print(displayLines.join('\n'))
  }

  renderReadingViewFrame() {
    const currentPageContentLines = this.contentLines.slice(
      this.progress,
      this.progress + this.bookViewRows,
    )
    const displayLines = [
      this.composeReadingViewTitle(),
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

  async exitBook() {
    clearScreen()
    await this.saveProgress()
    process.exit(0)
  }
}
