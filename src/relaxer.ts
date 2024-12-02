import { argv } from 'node:process'
import { program } from 'commander'
import packageJSON from '../package.json'
import { Persist } from './persist'
import { setupBookCommand } from './book'

export class Relaxer {
  constructor(
    public persist: Persist,
  ) {}

  static async run() {
    const persistData = await Persist.load()
    const app = new Relaxer(persistData)

    program
      .version(packageJSON.version)
      .name('relaxer')
    app.setupCommands()

    program.parse(argv)
  }

  setupCommands() {
    const cmds = [
      setupBookCommand,
    ]

    cmds.forEach((cmdSetup) => {
      cmdSetup({ app: this, program })
    })
  }
}