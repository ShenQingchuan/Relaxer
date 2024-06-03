import process from 'node:process'

export function listenKeyOnce(
  keyMap: Record<string, () => void>,
) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.once('data', (data: string) => {
    const callback = keyMap[data]
    if (callback)
      callback()
  })
}
