export type ContractName = 'scenario' | 'input' | 'recording'

/** Thrown by every parse in core and by sim-world's load, so a bad file is reported by the field that broke it. */
export class ContractError extends Error {
  override readonly name = 'ContractError'
  readonly contract: ContractName
  /** Dotted field path such as 'environment.sea.fetch' or 'ships.0.pose.yaw'; empty for the document itself. */
  readonly path: string

  constructor(contract: ContractName, path: string, reason: string) {
    super(`${path === '' ? contract : path}: ${reason}`)
    this.contract = contract
    this.path = path
  }
}
