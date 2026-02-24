import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { UseLekhaEngine } from '../composables/useLekhaEngine'

export interface LekhaOptions {
  engine?: UseLekhaEngine
}

export const LekhaInput = Extension.create<LekhaOptions>({
  name: 'lekha-input',

  addOptions() {
    return {
      engine: undefined,
    }
  },

  addProseMirrorPlugins() {
    const { engine } = this.options
    
    return [
      new Plugin({
        key: new PluginKey('lekha-input'),
        props: {
          handleKeyDown: (view, event) => {
            if (!engine) return false

            // 1. GLOBAL SHORTCUTS
            
            // Clear All Shortcut: Ctrl+Alt+C
            if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'c') {
               const transaction = view.state.tr.delete(0, view.state.doc.content.size)
               view.dispatch(transaction)
               engine.setText('', 0)
               engine.resetPhoneticBuffer()
               return true
            }

            // Language Toggle: Esc or Ctrl+M (Manual trigger)
            if (event.key === 'Escape' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm')) {
              engine.toggleLanguage()
              engine.resetPhoneticBuffer()
              // Ensure editor keeps focus
              view.focus()
              return true
            }

            // 2. LANGUAGE CHECK
            if (engine.isEnglish.value) {
                // Return false to let TipTap/StarterKit handle standard English typing
                return false 
            }

            // 3. BENGALI TYPING LOGIC
            const isSingleChar = event.key.length === 1
            const isEditingKey = event.key === 'Backspace' || event.key === 'Delete'

            if (!isSingleChar && !isEditingKey) {
              return false
            }

            const { selection, doc } = view.state
            const from = selection.from

            const $pos = doc.resolve(from)
            const textBefore = $pos.parent.textBetween(0, $pos.parentOffset)
            const textAfter = $pos.parent.textBetween($pos.parentOffset, $pos.parent.content.size)
            
            // Sync engine before processing
            engine.setText(textBefore + textAfter, textBefore.length)
            
            const result = engine.processKey({
              key: event.key,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              altKey: event.altKey,
            })

            if (!result.accepted) {
              return false
            }

            // Prevent default browser behavior for handled keys
            event.preventDefault()

            const startOfBlock = from - $pos.parentOffset
            const endOfBlock = startOfBlock + $pos.parent.content.size
            
            const transaction = view.state.tr.insertText(
              result.text,
              startOfBlock,
              endOfBlock
            )
            
            const nextCursor = startOfBlock + result.cursor
            transaction.setSelection(TextSelection.near(transaction.doc.resolve(nextCursor)))
            
            view.dispatch(transaction)
            
            return true
          },
          handleClick: (view) => {
             if (engine) engine.resetPhoneticBuffer()
             return false
          }
        },
      }),
    ]
  },
})
