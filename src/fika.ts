import { argv } from 'node:process'
import { program } from 'commander'
import packageJSON from '../package.json'
import { Persist } from './persist'
import { setupBookCommand } from './book'

export class Fika {
  constructor(
    public persist: Persist,
  ) {}

  static async run() {
    const persistData = await Persist.load()
    const app = new Fika(persistData)

    program
      .version(packageJSON.version)
      .name('fika')
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
