import debug from 'debug'

export const debugBook = debug('Relaxer:book')

export interface BookCommandOptions {
  keepEmptyLines?: boolean
}
