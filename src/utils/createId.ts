export type For = (
  'button' |
  'mentionable' |
  'select' |
  'modal'
)

/**
 * Creates an ID based on 3 parameters so that it can be unique.
 * @param usedFor The element the ID is used with
 * @param command The command that the Id is generated for
 * @param type A third string that should relate to what this id is used for
 * @returns A formatted string
 */
const createId = (usedFor: For, command: string, type: string): string => {
  return `${usedFor}-${command}-${type}`;
}

export { createId };