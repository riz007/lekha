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

            // Ignore system keys
            if (event.ctrlKey || event.metaKey || event.altKey) {
              if (event.key.toLowerCase() === 'm') {
                engine.toggleLanguage()
                return true
              }
              return false
            }

            if (event.key === 'Escape') {
              engine.toggleLanguage()
              return true
            }

            const isSingleChar = event.key.length === 1
            const isEditingKey = event.key === 'Backspace' || event.key === 'Delete'

            if (!isSingleChar && !isEditingKey) {
              return false
            }

            if (engine.isEnglish.value) {
                return false 
            }

            const { selection, doc } = view.state
            const from = selection.from

            const $pos = doc.resolve(from)
            const textBefore = $pos.parent.textBetween(0, $pos.parentOffset)
            const textAfter = $pos.parent.textBetween($pos.parentOffset, $pos.parent.content.size)
            
            // Check for cursor jump to reset phonetic buffer
            if (Math.abs(engine.cursor.value - textBefore.length) > 1 && !isEditingKey) {
               engine.resetPhoneticBuffer()
            }

            event.preventDefault()
            
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
             // Reset phonetic buffer on click to avoid confusion
             if (engine) engine.resetPhoneticBuffer()
             return false
          }
        },
      }),
    ]
  },
})
