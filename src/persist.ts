import { cwd, env } from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import ora from 'ora'
import { printPanic } from './utils'

const PERSIST_DATA_FILE_PATH = join(
  env.HOME || env.USERPROFILE || cwd(),
  '.fika.yaml',
)
const DEFAULT_PERSIST_DATA: FikaPersistData = {
  books: [],
}

export interface FikaBookData {
  path: string
  progress: number // Last reading progress line number
}

export interface FikaPersistData {
  books: FikaBookData[]
}

export class Persist {
  constructor(
    private data: FikaPersistData,
  ) {}

  static async load() {
    const loadPersistSpinner = ora('Loading Fika persist data...').start()
    let dataContent: string
    let persistData: FikaPersistData
    let isInitFika = false

    try {
      dataContent = await readFile(
        PERSIST_DATA_FILE_PATH,
        { encoding: 'utf-8' },
      )
    }
    catch (err: any) {
      // If the file does not exist, create it with default data
      if (err.code === 'ENOENT' && err.message.includes('no such file')) {
        isInitFika = true
        loadPersistSpinner.warn('Fika persist data not found, initializing...')
      }
      else {
        printPanic(err)
      }
    }

    try {
      if (!isInitFika)
        persistData = parse(dataContent!) ?? DEFAULT_PERSIST_DATA
    }
    catch (err) {
      printPanic(`Fika persist data format invalid: ${err}`)
    }

    const persist = new Persist(
      isInitFika
        ? DEFAULT_PERSIST_DATA
        : persistData!,
    )
    if (isInitFika) {
      await persist.save()
      loadPersistSpinner.succeed('Fika persist data initialized!')
    }
    else {
      loadPersistSpinner.succeed('Fika persist data loaded!')
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
      printPanic(`Failed to save Fika persist data: ${err}`)
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
