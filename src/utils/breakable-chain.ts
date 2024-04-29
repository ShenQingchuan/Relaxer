export class BreakableChain {
  constructor() {}

  endIf(endCondition: boolean) {
    return endCondition
      ? undefined
      : this
  }
}
