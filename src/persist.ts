import { cwd, env } from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import ora from 'ora'
import { printPanic } from './utils'

const PERSIST_DATA_FILE_PATH = join(
  env.HOME || env.USERPROFILE || cwd(),
  '.relaxer.yaml',
)
const DEFAULT_PERSIST_DATA: RelaxerPersistData = {
  books: [],
}

export interface RelaxerBookData {
  path: string
  progress: number // Last reading progress line number
}

export interface RelaxerPersistData {
  books: RelaxerBookData[]
}

export class Persist {
  constructor(
    private data: RelaxerPersistData,
  ) {}

  static async load() {
    const loadPersistSpinner = ora('Loading Relaxer persist data...').start()
    let dataContent: string
    let persistData: RelaxerPersistData
    let isInitRelaxer = false

    try {
      dataContent = await readFile(
        PERSIST_DATA_FILE_PATH,
        { encoding: 'utf-8' },
      )
    }
    catch (err: any) {
      // If the file does not exist, create it with default data
      if (err.code === 'ENOENT' && err.message.includes('no such file')) {
        isInitRelaxer = true
        loadPersistSpinner.warn('Relaxer persist data not found, initializing...')
      }
      else {
        printPanic(err)
      }
    }

    try {
      if (!isInitRelaxer)
        persistData = parse(dataContent!) ?? DEFAULT_PERSIST_DATA
    }
    catch (err) {
      printPanic(`Relaxer persist data format invalid: ${err}`)
    }

    const persist = new Persist(
      isInitRelaxer
        ? DEFAULT_PERSIST_DATA
        : persistData!,
    )
    if (isInitRelaxer) {
      await persist.save()
      loadPersistSpinner.succeed('Relaxer persist data initialized!')
    }
    else {
      loadPersistSpinner.succeed('Relaxer persist data loaded!')
    }

    return persist
  }

  async save() {
    if (!this.data)
      return

    try {
      await writeFile(
        PERSIST_DATA_FILE_PATH,
        stringify(this.data),
      )
    }
    catch (err) {
      printPanic(`Failed to save Relaxer persist data: ${err}`)
    }
  }

  findBook(bookPath: string) {
    const foundBook = (this.data!.books ?? []).find(book => book.path === bookPath)
    if (!foundBook) {
      const newBook = {
        path: bookPath,
        progress: 0,
      }
      this.data!.books.push(newBook)
      return newBook
    }

    return foundBook
  }
}
