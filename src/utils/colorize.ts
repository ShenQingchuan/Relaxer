export type ColorOptions =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'inverse'
  | 'strikethrough'
  | 'white'
  | 'grey'
  | 'black'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'magenta'
  | 'red'
  | 'yellow'
  | 'bgWhite'
  | 'bgGrey'
  | 'bgBlack'
  | 'bgBlue'
  | 'bgCyan'
  | 'bgGreen'
  | 'bgMagenta'
  | 'bgRed'
  | 'bgYellow'

const colorMap: Record<ColorOptions, string> = {
  bold: '1',
  italic: '3',
  underline: '4',
  inverse: '7',
  strikethrough: '9',
  white: '37',
  grey: '90',
  black: '30',
  blue: '34',
  cyan: '36',
  green: '32',
  magenta: '35',
  red: '31',
  yellow: '33',
  bgWhite: '47',
  bgGrey: '49',
  bgBlack: '40',
  bgBlue: '44',
  bgCyan: '46',
  bgGreen: '42',
  bgMagenta: '45',
  bgRed: '41',
  bgYellow: '43',
}

/**
 * Transform a string to ascii colorful string.
 *
 * ## Example
 * ```typescript
 * colorize('This is red', ['red'])
 * colorize('This is green background', ['bgGreen'])
 * colorize('This is cyan and bold', ['cyan', 'bold'])
 * ```
 *
 * @param str String to be colored.
 * @param options Colorful options.
 * @returns Ascii colorful string.
 */
export function colorize(str: string, options: ColorOptions[] = []) {
  const colors = options
    .map(option => colorMap[option])
    .join(';')

  return `\u001B[${colors}m${str}\u001B[0m`
}

/** @private */
function createColorful(options: ColorOptions[]) {
  return (str: string) => colorize(str, options)
}

/**
 * Colorize string creator functions map.
 *
 * ## Example
 * ```typescript
 * Color.red('This is red')
 * Color.bgGreen('This is green background')
 * Color.bold('This is bold')
 * ```
 */
export const Color: Record<ColorOptions, (str: string) => string>
  = Object.keys(colorMap).reduce((acc, key) => {
    acc[key as ColorOptions] = createColorful([key as ColorOptions])
    return acc
  }, {} as Record<ColorOptions, (str: string) => string>)
