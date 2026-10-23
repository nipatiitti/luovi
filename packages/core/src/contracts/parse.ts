import * as v from 'valibot'
import { ContractError, type ContractName } from './error.ts'

/** Validates once at load, never per tick; the first issue is the one reported, since later ones often follow from it. */
export const parseContract = <TSchema extends v.GenericSchema>(
  schema: TSchema,
  contract: ContractName,
  input: unknown,
): v.InferOutput<TSchema> => {
  const result = v.safeParse(schema, input)
  if (result.success) return result.output
  const [issue] = result.issues
  throw new ContractError(contract, v.getDotPath(issue) ?? '', issue.message)
}
