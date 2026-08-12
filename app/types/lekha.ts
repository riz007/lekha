export type LayoutType = 'fixed' | 'phonetic'

export type LayoutId = 'bijoy' | 'unijoy' | 'somewherein' | 'avro' | 'boishakhi' | 'probhat'

export interface LayoutDefinition {
  id: LayoutId
  name: string
  type: LayoutType
  /** Short description shown in the layout picker. */
  hint: string
  mappings: Record<string, string>
  supportsDirectKeyInput: boolean
}

export interface EnginePreferences {
  smartBackspace: boolean
}

export interface ProcessKeyInput {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

/** Text on either side of the caret, as a plain string with aligned offsets. */
export interface KeyContext {
  before: string
  after: string
}

/**
 * A local edit around the caret. `deleteBefore`/`deleteAfter` are UTF-16 unit
 * counts measured from the caret outwards; `insert` replaces them.
 */
export interface EditResult {
  accepted: boolean
  deleteBefore: number
  deleteAfter: number
  insert: string
}
