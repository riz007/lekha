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

    // Chrome fires beforeinput even after keydown calls preventDefault (Input Events Level 2 spec).
    // On Android / virtual keyboards, keydown fires key:'Unidentified' so handleKeyDown cannot
    // process the character — beforeinput carries the actual char in event.data.
    // This flag lets beforeinput know whether handleKeyDown already consumed the keypress so we
    // don't double-insert on desktop while still handling the Android/virtual-keyboard path.
    let handledByKeydown = false

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
          // Block ProseMirror's own text-insertion path in Bengali mode.
          // Without this, ProseMirror can insert raw characters via composition/input events
          // even after handleKeyDown has already handled the key.
          handleTextInput: (_view, _from, _to, _text) => {
            if (!engine) return false
            return !engine.isEnglish.value
          },

          handleDOMEvents: {
            // Chrome fires beforeinput AFTER keydown even when keydown calls preventDefault().
            // This is per spec (Input Events Level 2): preventDefault on keydown does NOT
            // cancel beforeinput. We must block text-mutation inputTypes here to prevent
            // Chrome from double-inserting characters into the contenteditable.
            // On Android / virtual keyboards, keydown fires 'Unidentified' so we also process
            // the character here when handleKeyDown didn't already handle it.
            beforeinput: (view, event) => {
              if (!engine?.isEnglish.value) {
                if ('inputType' in event) {
                  const ie = event as InputEvent
                  const inputType = ie.inputType

                  if (inputType === 'insertText' || inputType === 'insertCompositionText') {
                    event.preventDefault()
                    if (!handledByKeydown && ie.data) {
                      for (const char of ie.data) {
                        processKeyInView(view, char)
                      }
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

            // 1. GLOBAL SHORTCUTS

            // Clear All: Ctrl+Alt+C
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

            // Language Toggle: Esc or Ctrl+M
            if (
              event.key === 'Escape' ||
              ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm')
            ) {
              engine.toggleLanguage()
              engine.resetState()
              view.focus()
              return true
            }

            // 2. LANGUAGE CHECK
            if (engine.isEnglish.value) {
              return false
            }

            // 3. BLOCK OS IME COMPOSITION KEYS
            // When isComposing is true with key 'Process', the OS Bengali/Hindi IME has
            // intercepted the keystroke. Block it to prevent raw composition text insertion.
            if (event.isComposing && event.key === 'Process') {
              event.preventDefault()
              return true
            }

            // 4. BENGALI TYPING LOGIC
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

            // Reset engine tracking state on navigation so stale pre-kar/phonetic
            // state from a previous position doesn't corrupt the next word typed.
            if (isNavigationKey) {
              engine.resetState()
              return false
            }

            // Android / virtual keyboards send 'Unidentified' — beforeinput carries the actual char.
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

            // Only handle single-block (inline) selections; cross-block is too complex
            if (hasSelection && $from.parent !== $to.parent) {
              return false
            }

            const textBefore = $from.parent.textBetween(0, $from.parentOffset)
            // Skip over the selected region so typed characters replace the selection
            const textAfterOffset = hasSelection ? $to.parentOffset : $from.parentOffset
            const textAfter = $from.parent.textBetween(textAfterOffset, $from.parent.content.size)

            // Sync engine to current editor state
            engine.setText(textBefore + textAfter, textBefore.length)

            // For selection + Backspace/Delete: delete the selected region
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
