import { readFile, writeFile } from 'node:fs/promises'
import { cwd } from 'node:process'
import { join } from 'node:path'
import ora from 'ora'
import { detect } from 'jschardet'
import iconv from 'iconv-lite'
import { Color, colorize, println } from '../utils'

export async function openBook(bookPath: string) {
  // Check if the book path is a relative path or an absolute path
  // - If it is a relative path, convert it to an absolute path
  // - If it is an absolute path, keep it as it is
  const isAbsolutePath = bookPath.startsWith('/') || bookPath.startsWith('~')
  const realBookPath = isAbsolutePath
    ? bookPath
    : join(cwd(), bookPath)

  const loadingBookSpinner = ora(
    `Reading book at ${Color.green(realBookPath)}\n`,
  ).start()

  try {
    // Read the book file, without specifying the encoding.
    // Because we need to detect the encoding of the book file.
    const bookBuffer = await readFile(realBookPath)
    const { encoding: originalEncoding } = detect(bookBuffer)
    if (
      originalEncoding.toLowerCase() !== 'utf-8'
      || originalEncoding.toLowerCase() !== 'utf8'
    ) {
      println(
      `Encoding is detected as ${
        colorize(
          originalEncoding,
          ['bold', 'yellow'],
        )
      }. Converting it to ${
        colorize(
          originalEncoding,
          ['bold', 'cyan'],
        )
      }...`,
      )
    }

    // Whatever encoding the book file is, we will convert it to UTF-8.
    const detectedContent = iconv.decode(bookBuffer, originalEncoding)
    const encodedContent = iconv.encode(detectedContent, 'UTF-8')

    await writeFile(realBookPath, encodedContent)
    loadingBookSpinner.succeed(`Book setup is done.`)

    return encodedContent.toString()
  }
  catch (err) {
    loadingBookSpinner.fail('Failed to open the book with UTF-8 encoding.')
    throw err
  }
}
