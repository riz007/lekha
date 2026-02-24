export type LayoutType = 'fixed' | 'phonetic'

export type LayoutId = 'bijoy' | 'unijoy' | 'somewherein' | 'avro' | 'boishakhi' | 'probhat'

export interface LayoutDefinition {
  id: LayoutId
  name: string
  type: LayoutType
  mappings: Record<string, string>
  complexRules?: Record<string, string>
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
}

export interface ProcessKeyResult {
  accepted: boolean
  text: string
  cursor: number
  toggledLanguage?: boolean
  
  // Surgical update info (optional for now)
  insertText?: string
  replaceCount?: number
}
