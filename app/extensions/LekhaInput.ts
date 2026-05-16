import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
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

    // Prevents double-insert on desktop Chrome: keydown sets this so beforeinput
    // knows not to re-process the same character.
    let handledByKeydown = false

    // Prevents double-insert when beforeinput already ran the character through
    // the engine. handleTextInput acts as a fallback (Android Chrome, non-standard
    // inputTypes) rather than a blanket block when this is false.
    let processedByPlugin = false

    function processKeyInView(view: EditorView, key: string): boolean {
      if (!engine) return false

      const { selection, doc } = view.state
      const from = selection.from
      const to = selection.to
      const hasSelection = from !== to

      const $from = doc.resolve(from)
      const $to = hasSelection ? doc.resolve(to) : $from

      if (hasSelection && $from.parent !== $to.parent) return false

      const textBefore = $from.parent.textBetween(0, $from.parentOffset)
      const textAfterOffset = hasSelection ? $to.parentOffset : $from.parentOffset
      const textAfter = $from.parent.textBetween(textAfterOffset, $from.parent.content.size)

      engine.setText(textBefore + textAfter, textBefore.length)

      if (hasSelection && (key === 'Backspace' || key === 'Delete')) {
        const startOfBlock = from - $from.parentOffset
        const endOfBlock = startOfBlock + $from.parent.content.size
        const newText = textBefore + textAfter
        const transaction = view.state.tr.insertText(newText, startOfBlock, endOfBlock)
        const nextPos = startOfBlock + textBefore.length
        transaction.setSelection(TextSelection.near(transaction.doc.resolve(nextPos)))
        view.dispatch(transaction)
        engine.setText(newText, textBefore.length)
        return true
      }

      const result = engine.processKey({ key, ctrlKey: false, metaKey: false, altKey: false })
      if (!result.accepted) return false

      const startOfBlock = from - $from.parentOffset
      const endOfBlock = startOfBlock + $from.parent.content.size
      const transaction = view.state.tr.insertText(result.text, startOfBlock, endOfBlock)
      const nextCursor = startOfBlock + result.cursor
      transaction.setSelection(TextSelection.near(transaction.doc.resolve(nextCursor)))
      view.dispatch(transaction)
      return true
    }

    return [
      new Plugin({
        key: new PluginKey('lekha-input'),
        props: {
          handleTextInput: (view, _from, _to, text) => {
            if (!engine) return false
            if (engine.isEnglish.value) return false

            if (processedByPlugin) {
              processedByPlugin = false
              return true
            }

            // Fallback for Android Chrome (beforeinput.preventDefault() ignored) and
            // keyboards using non-standard inputTypes (insertFromMobile, etc.).
            for (const char of text) {
              processKeyInView(view, char)
            }
            return true
          },

          handleDOMEvents: {
            beforeinput: (view, event) => {
              if (!engine?.isEnglish.value) {
                if ('inputType' in event) {
                  const ie = event as InputEvent
                  const inputType = ie.inputType

                  if (inputType === 'insertText' || inputType === 'insertCompositionText') {
                    event.preventDefault()
                    if (!handledByKeydown) {
                      if (ie.data) {
                        processedByPlugin = true
                        for (const char of ie.data) {
                          processKeyInView(view, char)
                        }
                      }
                    } else {
                      processedByPlugin = true
                    }
                    handledByKeydown = false
                    return true
                  }

                  if (
                    inputType === 'deleteContentBackward' ||
                    inputType === 'deleteSoftLineBackward' ||
                    inputType === 'deleteWordBackward'
                  ) {
                    event.preventDefault()
                    if (!handledByKeydown) {
                      processKeyInView(view, 'Backspace')
                    }
                    handledByKeydown = false
                    return true
                  }

                  if (inputType === 'deleteContentForward' || inputType === 'deleteWordForward') {
                    event.preventDefault()
                    if (!handledByKeydown) {
                      processKeyInView(view, 'Delete')
                    }
                    handledByKeydown = false
                    return true
                  }
                }
              }
              handledByKeydown = false
              return false
            },
          },

          handleKeyDown: (view, event) => {
            if (!engine) return false
            handledByKeydown = false

            if (
              (event.ctrlKey || event.metaKey) &&
              event.altKey &&
              event.key.toLowerCase() === 'c'
            ) {
              const transaction = view.state.tr.delete(0, view.state.doc.content.size)
              view.dispatch(transaction)
              engine.setText('', 0)
              engine.resetPhoneticBuffer()
              return true
            }

            if (
              event.key === 'Escape' ||
              ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm')
            ) {
              engine.toggleLanguage()
              engine.resetState()
              view.focus()
              return true
            }

            if (engine.isEnglish.value) {
              return false
            }

            // Block OS IME keystrokes (isComposing + 'Process') to prevent raw composition text.
            if (event.isComposing && event.key === 'Process') {
              event.preventDefault()
              return true
            }

            const isSingleChar = event.key.length === 1
            const isEditingKey = event.key === 'Backspace' || event.key === 'Delete'
            const isNavigationKey =
              event.key === 'Enter' ||
              event.key === 'ArrowLeft' ||
              event.key === 'ArrowRight' ||
              event.key === 'ArrowUp' ||
              event.key === 'ArrowDown' ||
              event.key === 'Home' ||
              event.key === 'End' ||
              event.key === 'PageUp' ||
              event.key === 'PageDown'

            if (isNavigationKey) {
              engine.resetState()
              return false
            }

            // Virtual keyboards send 'Unidentified' — beforeinput carries the actual char.
            if (event.key === 'Unidentified') return false

            if (!isSingleChar && !isEditingKey) {
              return false
            }

            const { selection, doc } = view.state
            const from = selection.from
            const to = selection.to
            const hasSelection = from !== to

            const $from = doc.resolve(from)
            const $to = hasSelection ? doc.resolve(to) : $from

            if (hasSelection && $from.parent !== $to.parent) {
              return false
            }

            const textBefore = $from.parent.textBetween(0, $from.parentOffset)
            const textAfterOffset = hasSelection ? $to.parentOffset : $from.parentOffset
            const textAfter = $from.parent.textBetween(textAfterOffset, $from.parent.content.size)

            engine.setText(textBefore + textAfter, textBefore.length)

            if (hasSelection && isEditingKey) {
              event.preventDefault()
              const startOfBlock = from - $from.parentOffset
              const endOfBlock = startOfBlock + $from.parent.content.size
              const newText = textBefore + textAfter
              const transaction = view.state.tr.insertText(newText, startOfBlock, endOfBlock)
              const nextPos = startOfBlock + textBefore.length
              transaction.setSelection(TextSelection.near(transaction.doc.resolve(nextPos)))
              view.dispatch(transaction)
              engine.setText(newText, textBefore.length)
              handledByKeydown = true
              return true
            }

            const result = engine.processKey({
              key: event.key,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              altKey: event.altKey,
            })

            if (!result.accepted) {
              return false
            }

            event.preventDefault()

            const startOfBlock = from - $from.parentOffset
            const endOfBlock = startOfBlock + $from.parent.content.size

            const transaction = view.state.tr.insertText(result.text, startOfBlock, endOfBlock)

            const nextCursor = startOfBlock + result.cursor
            transaction.setSelection(TextSelection.near(transaction.doc.resolve(nextCursor)))

            view.dispatch(transaction)
            handledByKeydown = true
            return true
          },

          handleClick: _view => {
            if (engine) engine.resetState()
            return false
          },
        },
      }),
    ]
  },
})
