import { LAYOUTS } from '../constants/layouts'
import {
  HASANT,
  ZWJ,
  countDeleteAfter,
  countDeleteBefore,
  isBanglaConsonant,
  isBanglaKar,
  isJoiner,
  isPreKar,
  toVowel,
} from '../utils/bengali'
import { getAvroParserSync, resolveAvroParser } from '../utils/avro-parser'
import type {
  EditResult,
  EnginePreferences,
  KeyContext,
  LayoutDefinition,
  LayoutId,
  ProcessKeyInput,
} from '../types/lekha'

export type UseLekhaEngine = ReturnType<typeof useLekhaEngine>

interface InternalState {
  /** Pre-kar waiting to be swapped behind the next consonant. */
  activePreKar: string
  /** Roman letters of the word currently being transliterated (Avro only). */
  avroRoman: string
  /** Bengali this engine last emitted for that word, used to verify sync. */
  avroEmitted: string
}

const REJECTED: EditResult = { accepted: false, deleteBefore: 0, deleteAfter: 0, insert: '' }

/** Characters that keep an Avro word going. Anything else commits the word. */
const AVRO_WORD_CHAR = /[A-Za-z0-9`^:]/

/** Longest lookbehind any rule needs (reph back-swap over a conjunct cluster). */
export const CONTEXT_WINDOW = 24

// Consonants as code points so that the two-code-point forms (ড় = ড + ়) are
// matched as units instead of leaking a bare nukta into the character class.
const CONSONANT = '(?:[ক-হৎড়ঢ়য়]়?)'

/** A conjunct cluster with an optional matra, anchored at the end of the string. */
const TRAILING_CLUSTER = new RegExp(
  `(${CONSONANT}(?:্${CONSONANT})*[া-ৌৗ]?)$`
)

function mapChar(layout: LayoutDefinition, char: string): string {
  return layout.mappings[char] ?? char
}

/**
 * True for anything that behaves like a consonant for pre-kar swapping —
 * covers plain consonants, hasant, and cluster mappings such as ক্ষ, ্র, ্য.
 */
function isConsonantLike(mapped: string): boolean {
  if (!mapped) return false
  let hasConsonant = false
  for (const char of mapped) {
    if (isBanglaConsonant(char)) {
      hasConsonant = true
      continue
    }
    if (char === HASANT || isJoiner(char)) continue
    return false
  }
  return hasConsonant || mapped === HASANT
}

function edit(deleteBefore: number, insert: string, deleteAfter = 0): EditResult {
  return { accepted: true, deleteBefore, deleteAfter, insert }
}

export function useLekhaEngine(initialLayout: LayoutId = 'bijoy') {
  const buffer = ref<string[]>([])
  const isEnglish = ref(false)
  const layoutId = ref<LayoutId>(initialLayout)
  const avroReady = ref(getAvroParserSync() !== null)
  const preferences = reactive<EnginePreferences>({
    smartBackspace: true,
  })

  const internal = reactive<InternalState>({
    activePreKar: '',
    avroRoman: '',
    avroEmitted: '',
  })

  const layout = computed<LayoutDefinition>(() => LAYOUTS[layoutId.value])

  function pushBuffer(char: string): void {
    buffer.value = [...buffer.value, char].slice(-10)
  }

  /**
   * Drop every piece of cross-keystroke state. Called whenever the caret may have
   * moved out from under us (click, arrow keys, blur, layout change) — without it
   * the next keystroke would be applied against a context that no longer exists.
   */
  function resetState(): void {
    internal.activePreKar = ''
    internal.avroRoman = ''
    internal.avroEmitted = ''
  }

  function setLayout(id: LayoutId): void {
    layoutId.value = id
    resetState()
  }

  function toggleLanguage(): void {
    isEnglish.value = !isEnglish.value
    resetState()
  }

  function setEnglish(value: boolean): void {
    isEnglish.value = value
    resetState()
  }

  function deleteBackward(context: KeyContext): EditResult {
    const count = countDeleteBefore(context.before, preferences.smartBackspace)
    return count === 0 ? REJECTED : edit(count, '')
  }

  function deleteForward(context: KeyContext): EditResult {
    const count = countDeleteAfter(context.after, preferences.smartBackspace)
    return count === 0 ? REJECTED : { accepted: true, deleteBefore: 0, deleteAfter: count, insert: '' }
  }

  /**
   * Avro re-parses the *current word* on every keystroke and replaces only the
   * Bengali it previously emitted for that word. Before replacing anything it
   * checks that its own output is still sitting immediately behind the caret —
   * if the document moved on (click, paste, undo) the word is abandoned rather
   * than overwriting text the engine does not own.
   */
  function processAvro(input: ProcessKeyInput, context: KeyContext): EditResult {
    const parser = getAvroParserSync()
    if (!parser) {
      // Parser still loading: keep editing keys working, swallow printable keys
      // instead of leaking raw ASCII into the document.
      if (input.key === 'Backspace') return deleteBackward(context)
      if (input.key === 'Delete') return deleteForward(context)
      return input.key.length === 1 ? edit(0, '') : REJECTED
    }

    const inSync = internal.avroRoman !== '' && context.before.endsWith(internal.avroEmitted)
    if (!inSync) {
      internal.avroRoman = ''
      internal.avroEmitted = ''
    }

    if (input.key === 'Backspace') {
      if (!internal.avroRoman) return deleteBackward(context)

      // Undo roman letters until the Bengali actually changes. Some letters
      // produce no glyph of their own — 'o' is Avro's inherent vowel, '`' is the
      // no-transliterate marker — so a naive one-letter undo reads as a dead key.
      let nextRoman = internal.avroRoman
      let nextOut = internal.avroEmitted
      while (nextRoman && nextOut === internal.avroEmitted) {
        nextRoman = nextRoman.slice(0, -1)
        nextOut = nextRoman ? parser(nextRoman) : ''
      }

      const result = edit(internal.avroEmitted.length, nextOut)
      internal.avroRoman = nextRoman
      internal.avroEmitted = nextOut
      return result
    }

    if (input.key === 'Delete') {
      resetState()
      return deleteForward(context)
    }

    if (input.key.length !== 1) return REJECTED

    pushBuffer(input.key)

    if (!AVRO_WORD_CHAR.test(input.key)) {
      // Word boundary: commit what is there and transliterate the separator on its own
      // so that '.' still becomes '।'.
      internal.avroRoman = ''
      internal.avroEmitted = ''
      const standalone = parser(input.key)
      return edit(0, standalone || input.key)
    }

    const nextRoman = internal.avroRoman + input.key
    const nextOut = parser(nextRoman)
    const result = edit(internal.avroEmitted.length, nextOut)
    internal.avroRoman = nextRoman
    internal.avroEmitted = nextOut
    return result
  }

  function processFixed(input: ProcessKeyInput, context: KeyContext): EditResult {
    if (input.key === 'Backspace') {
      internal.activePreKar = ''
      return deleteBackward(context)
    }
    if (input.key === 'Delete') {
      internal.activePreKar = ''
      return deleteForward(context)
    }
    if (input.key.length !== 1) {
      internal.activePreKar = ''
      return REJECTED
    }

    pushBuffer(input.key)

    if (input.key === ' ') {
      internal.activePreKar = ''
      return edit(0, ' ')
    }

    const mapped = mapChar(layout.value, input.key)
    if (!mapped) return REJECTED

    const before = context.before
    const charBefore = before.slice(-1)

    // Rule A — hasant + kar becomes the independent vowel (্ + া → আ)
    if (charBefore === HASANT && isBanglaKar(mapped)) {
      internal.activePreKar = ''
      return edit(1, toVowel(mapped))
    }

    // Rule B — অ + া is never valid; it is আ
    if (charBefore === 'অ' && mapped === 'া') {
      internal.activePreKar = ''
      return edit(1, 'আ')
    }

    // Rule C (apply) — swap the consonant in front of the waiting pre-kar
    if (
      internal.activePreKar &&
      before.endsWith(internal.activePreKar) &&
      isConsonantLike(mapped)
    ) {
      const kar = internal.activePreKar
      // A trailing hasant keeps the kar waiting for the consonant that follows it.
      if (!mapped.endsWith(HASANT)) internal.activePreKar = ''
      return edit(kar.length, mapped + kar)
    }

    // Rule C (set) — hold a pre-positioned kar for the next consonant
    if (isPreKar(mapped)) {
      // ে + া = ো and ে + ৗ = ৌ compose instead of stacking
      if (charBefore === 'ে' && (mapped === 'া' || mapped === 'ৗ')) {
        internal.activePreKar = ''
        return edit(1, mapped === 'া' ? 'ো' : 'ৌ')
      }
      internal.activePreKar = mapped
      return edit(0, mapped)
    }

    // Rule D — composite kars
    if (charBefore === 'ে' && mapped === 'া') {
      internal.activePreKar = ''
      return edit(1, 'ো')
    }
    if (charBefore === 'ে' && mapped === 'ৗ') {
      internal.activePreKar = ''
      return edit(1, 'ৌ')
    }

    // Rule E — র + ্য takes a ZWJ so it renders as র‍্য, not the broken form
    if (charBefore === 'র' && mapped === '্য') {
      internal.activePreKar = ''
      return edit(0, ZWJ + '্য')
    }

    // Rule F — reph moves in front of the cluster it modifies
    if (mapped === 'র্') {
      const match = before.match(TRAILING_CLUSTER)
      if (match) {
        const cluster = match[0]
        internal.activePreKar = ''
        return edit(cluster.length, 'র্' + cluster)
      }
    }

    internal.activePreKar = ''
    return edit(0, mapped)
  }

  /**
   * Turn one keypress into a local document edit: how much to remove on either
   * side of the caret and what to put in its place. The engine never sees or
   * rewrites the whole paragraph, so marks, line breaks and undo history survive.
   */
  function processKey(input: ProcessKeyInput, context: KeyContext): EditResult {
    // Modifier chords belong to the browser and to TipTap, not to us. AltGr on
    // Windows arrives as ctrl+alt, so let that through as ordinary text.
    const isAltGr = Boolean(input.ctrlKey && input.altKey)
    if ((input.ctrlKey || input.metaKey || input.altKey) && !isAltGr) return REJECTED
    if (input.metaKey) return REJECTED

    if (isEnglish.value) return REJECTED

    if (layout.value.type === 'phonetic') return processAvro(input, context)
    return processFixed(input, context)
  }

  onMounted(async () => {
    await resolveAvroParser()
    avroReady.value = getAvroParserSync() !== null
  })

  return {
    buffer,
    isEnglish,
    avroReady,
    layout,
    layoutId,
    preferences,
    setLayout,
    setEnglish,
    resetState,
    toggleLanguage,
    processKey,
  }
}
