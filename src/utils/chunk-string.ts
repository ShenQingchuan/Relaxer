/**
 * Splits a string into chunks of a specified size
 *
 * @param str String to be split
 * @param size Size of each string chunk
 */
export function chunkString(str: string, size: number): string[] {
  const result = []
  for (let i = 0; i < str.length; i += size)
    result.push(str.slice(i, i + size))

  return result
}
