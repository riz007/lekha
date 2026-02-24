import type { Editor } from '@tiptap/vue-3'
import type { UseLekhaEngine } from '../composables/useLekhaEngine'
import type { ProcessKeyInput } from '../types/lekha'

export interface LekhaTipTapContext {
  editor: Editor
  engine: UseLekhaEngine
}

export function handleLekhaKeydown(context: LekhaTipTapContext, event: KeyboardEvent): boolean {
  const { editor, engine } = context
  const { state } = editor
  const { selection } = state
  const { from } = selection

  // Sync engine state with editor
  const fullText = state.doc.textBetween(0, state.doc.content.size, '\n')

  if (event.ctrlKey || event.metaKey || event.altKey) {
    if (event.key === 'm' || event.key === 'M') {
      engine.toggleLanguage()
      return true
    }
    return false
  }

  if (event.key === 'Escape') {
    engine.toggleLanguage()
    return true
  }

  // We only care about characters and basic editing keys
  if (event.key.length > 1 && event.key !== 'Backspace' && event.key !== 'Delete') {
    return false
  }

  engine.setText(fullText, from - 1) // ProseMirror 1-based -> Engine 0-based

  const result = engine.processKey({
    key: event.key,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
  } satisfies ProcessKeyInput)

  if (!result.accepted) {
    return false
  }

  editor.commands.setContent(result.text, { emitUpdate: false })
  editor.commands.setTextSelection(result.cursor + 1)

  return true
}
