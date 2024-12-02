import { describe, expect, it } from 'vitest'
import { chunkString } from '../src/utils/chunk-string'

describe('unit tests for util functions', () => {
  it('chunk-string', () => {
    const str = `
lorem ipsum dolor sit amet, consectetur adipiscing elit.
sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    `.trim()
    expect(chunkString(str, 10)).toEqual([
      'lorem ipsu',
      'm dolor si',
      't amet, co',
      'nsectetur ',
      'adipiscing',
      ' elit.\nsed',
      ' do eiusmo',
      'd tempor i',
      'ncididunt ',
      'ut labore ',
      'et dolore ',
      'magna aliq',
      'ua.',
    ])
  })
})
