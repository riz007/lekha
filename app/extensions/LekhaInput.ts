import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { CONTEXT_WINDOW, type UseLekhaEngine } from '../composables/useLekhaEngine'
import type { EditResult, KeyContext } from '../types/lekha'

export interface LekhaOptions {
  engine?: UseLekhaEngine
}

/**
 * Stand-in for inline leaf nodes (hard breaks, images) when reading text around
 * the caret. Leaf nodes are one position wide, so a one-character placeholder
 * keeps string offsets aligned with ProseMirror positions — without it a single
 * <br> in the paragraph would throw off every subsequent edit.
 */
const LEAF_PLACEHOLDER = '￼'

/**
 * Physical-key fallback for keyboards whose OS layout is not Latin (Bangla,
 * Russian, Greek…). Those report event.key as a non-ASCII character, which no
 * fixed layout can map. event.code is layout independent, so we translate it
 * through US QWERTY — the layout every Bijoy-family keymap is drawn against.
 */
const US_QWERTY: Record<string, [string, string]> = {
  KeyA: ['a', 'A'],
  KeyB: ['b', 'B'],
  KeyC: ['c', 'C'],
  KeyD: ['d', 'D'],
  KeyE: ['e', 'E'],
  KeyF: ['f', 'F'],
  KeyG: ['g', 'G'],
  KeyH: ['h', 'H'],
  KeyI: ['i', 'I'],
  KeyJ: ['j', 'J'],
  KeyK: ['k', 'K'],
  KeyL: ['l', 'L'],
  KeyM: ['m', 'M'],
  KeyN: ['n', 'N'],
  KeyO: ['o', 'O'],
  KeyP: ['p', 'P'],
  KeyQ: ['q', 'Q'],
  KeyR: ['r', 'R'],
  KeyS: ['s', 'S'],
  KeyT: ['t', 'T'],
  KeyU: ['u', 'U'],
  KeyV: ['v', 'V'],
  KeyW: ['w', 'W'],
  KeyX: ['x', 'X'],
  KeyY: ['y', 'Y'],
  KeyZ: ['z', 'Z'],
  Digit0: ['0', ')'],
  Digit1: ['1', '!'],
  Digit2: ['2', '@'],
  Digit3: ['3', '#'],
  Digit4: ['4', '$'],
  Digit5: ['5', '%'],
  Digit6: ['6', '^'],
  Digit7: ['7', '&'],
  Digit8: ['8', '*'],
  Digit9: ['9', '('],
  Minus: ['-', '_'],
  Equal: ['=', '+'],
  BracketLeft: ['[', '{'],
  BracketRight: [']', '}'],
  Backslash: ['\\', '|'],
  Semicolon: [';', ':'],
  Quote: ["'", '"'],
  Backquote: ['`', '~'],
  Comma: [',', '<'],
  Period: ['.', '>'],
  Slash: ['/', '?'],
  Space: [' ', ' '],
}

const NAVIGATION_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Enter',
  'Tab',
])

function isPrintableAscii(key: string): boolean {
  if (key.length !== 1) return false
  const code = key.codePointAt(0)
  return code !== undefined && code >= 0x20 && code <= 0x7e
}

/**
 * The character a keypress should feed the engine. Prefers what the OS layout
 * produced (that is what is printed on the user's keycaps) and only falls back
 * to the physical position when the layout is non-Latin.
 */
function resolveKey(event: KeyboardEvent): string {
  if (isPrintableAscii(event.key)) return event.key
  const fallback = US_QWERTY[event.code]
  if (fallback) return event.shiftKey ? fallback[1] : fallback[0]
  return event.key
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

    // Both flags are cleared on a macrotask, which always runs before the next
    // user gesture. That is what keeps them from going stale — the previous
    // implementation used sticky booleans and silently ate the next keystroke.
    let keydownHandled = false
    let beforeInputHandled = false

    function markKeydownHandled(): void {
      keydownHandled = true
      setTimeout(() => {
        keydownHandled = false
      }, 0)
    }

    function markBeforeInputHandled(): void {
      beforeInputHandled = true
      setTimeout(() => {
        beforeInputHandled = false
      }, 0)
    }

    /** Text on either side of the caret, bounded and offset-aligned. */
    function readContext(view: EditorView, from: number, to: number): KeyContext {
      const { doc } = view.state
      const $from = doc.resolve(from)
      const $to = doc.resolve(to)

      // Select-all produces an AllSelection whose endpoints resolve to the doc
      // node rather than a paragraph. There is no usable context then — and none
      // is needed, because the selection is about to be replaced wholesale.
      if (!$from.parent.isTextblock || !$to.parent.isTextblock) return { before: '', after: '' }

      const beforeStart = Math.max(0, $from.parentOffset - CONTEXT_WINDOW)
      const before = $from.parent.textBetween(
        beforeStart,
        $from.parentOffset,
        undefined,
        LEAF_PLACEHOLDER
      )

      const afterEnd = Math.min($to.parent.content.size, $to.parentOffset + CONTEXT_WINDOW)
      const after = $to.parent.textBetween(
        $to.parentOffset,
        afterEnd,
        undefined,
        LEAF_PLACEHOLDER
      )

      return { before, after }
    }

    /**
     * Apply an engine edit as a minimal replacement around the caret. Everything
     * outside the touched range — marks, line breaks, other paragraphs — is left
     * untouched, and each keystroke becomes one undo step.
     */
    function applyEdit(view: EditorView, result: EditResult): void {
      const tr = view.state.tr

      // deleteSelection normalises whatever the selection is — including an
      // AllSelection, which a raw range delete would leave in an invalid state.
      if (!tr.selection.empty) tr.deleteSelection()

      const pos = tr.selection.from
      const start = Math.max(0, pos - result.deleteBefore)
      const end = Math.min(tr.doc.content.size, pos + result.deleteAfter)

      if (result.insert) {
        tr.insertText(result.insert, start, end)
      } else if (end > start) {
        tr.delete(start, end)
      }

      if (!tr.steps.length) return

      const caret = Math.min(start + result.insert.length, tr.doc.content.size)
      tr.setSelection(TextSelection.near(tr.doc.resolve(caret)))
      view.dispatch(tr)
    }

    /** Run one character (or editing key) through the engine and apply the result. */
    function processKeyInView(view: EditorView, key: string, input: Partial<KeyboardEvent> = {}) {
      if (!engine || engine.isEnglish.value) return false

      const { selection } = view.state
      const { from, to } = selection

      const context = readContext(view, from, to)

      // With an active selection the engine only sees what precedes it; the
      // selected range is removed as part of the same transaction.
      const result = engine.processKey(
        {
          key,
          ctrlKey: Boolean(input.ctrlKey),
          metaKey: Boolean(input.metaKey),
          altKey: Boolean(input.altKey),
          shiftKey: Boolean(input.shiftKey),
        },
        from === to ? context : { before: context.before, after: '' }
      )

      if (!result.accepted) return false

      applyEdit(view, result)
      return true
    }

    return [
      new Plugin({
        key: new PluginKey('lekha-input'),
        props: {
          // Last resort: keyboards that reach ProseMirror without a usable
          // beforeinput (some Android IMEs report non-standard inputTypes).
          handleTextInput: (view, _from, _to, text) => {
            if (!engine || engine.isEnglish.value) return false
            if (keydownHandled || beforeInputHandled) return true

            for (const char of text) processKeyInView(view, char)
            return true
          },

          handleDOMEvents: {
            beforeinput: (view, event) => {
              if (!engine || engine.isEnglish.value) return false
              if (!('inputType' in event)) return false

              const inputEvent = event as InputEvent
              const { inputType } = inputEvent

              // The physical-keyboard path already handled this gesture. History
              // events are left alone so undo/redo keeps working.
              if (keydownHandled) {
                if (inputType.startsWith('insert') || inputType.startsWith('delete')) {
                  event.preventDefault()
                  markBeforeInputHandled()
                  return true
                }
                return false
              }

              if (
                inputType === 'insertText' ||
                inputType === 'insertCompositionText' ||
                inputType === 'insertReplacementText'
              ) {
                if (!inputEvent.data) return false
                event.preventDefault()
                markBeforeInputHandled()
                for (const char of inputEvent.data) processKeyInView(view, char)
                return true
              }

              if (
                inputType === 'deleteContentBackward' ||
                inputType === 'deleteWordBackward' ||
                inputType === 'deleteSoftLineBackward'
              ) {
                event.preventDefault()
                markBeforeInputHandled()
                processKeyInView(view, 'Backspace')
                return true
              }

              if (inputType === 'deleteContentForward' || inputType === 'deleteWordForward') {
                event.preventDefault()
                markBeforeInputHandled()
                processKeyInView(view, 'Delete')
                return true
              }

              return false
            },

            blur: () => {
              engine?.resetState()
              return false
            },

            compositionstart: () => {
              engine?.resetState()
              return false
            },
          },

          handleKeyDown: (view, event) => {
            if (!engine) return false
            keydownHandled = false

            const isMod = event.ctrlKey || event.metaKey
            const lowerKey = event.key.length === 1 ? event.key.toLowerCase() : event.key

            // Clear the canvas — Ctrl/Cmd + Alt + C
            if (isMod && event.altKey && (event.code === 'KeyC' || lowerKey === 'c')) {
              const tr = view.state.tr.delete(0, view.state.doc.content.size)
              view.dispatch(tr)
              engine.resetState()
              return true
            }

            // Bangla / English toggle. Deliberately Ctrl (not Cmd) on every
            // platform: Cmd+M is "minimise window" on macOS and cannot be
            // reliably cancelled from a web page. F2 is a free alias everywhere.
            if (
              event.key === 'F2' ||
              (event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                (event.code === 'KeyM' || lowerKey === 'm'))
            ) {
              engine.toggleLanguage()
              return true
            }

            if (engine.isEnglish.value) return false

            // Let the IME own the keystroke while a composition is in flight.
            if (event.isComposing || event.keyCode === 229) return false

            if (NAVIGATION_KEYS.has(event.key)) {
              engine.resetState()
              return false
            }

            // Virtual keyboards report this; beforeinput carries the character.
            if (event.key === 'Unidentified') return false

            const isEditingKey = event.key === 'Backspace' || event.key === 'Delete'

            // Let ProseMirror delete a selection natively — it preserves marks
            // and structure far better than reconstructing the block ourselves.
            if (isEditingKey && !view.state.selection.empty) {
              engine.resetState()
              return false
            }

            const key = isEditingKey ? event.key : resolveKey(event)
            if (!isEditingKey && key.length !== 1) return false

            if (processKeyInView(view, key, event)) {
              event.preventDefault()
              markKeydownHandled()
              return true
            }

            return false
          },

          handleClick: () => {
            engine?.resetState()
            return false
          },

          handlePaste: () => {
            engine?.resetState()
            return false
          },
        },
      }),
    ]
  },
})
