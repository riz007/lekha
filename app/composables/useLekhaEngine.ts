import { LAYOUTS } from '../constants/layouts'
import {
  deleteNextCluster,
  deletePreviousCluster,
  insertAtCursor,
  isBanglaConsonant,
  isBanglaKar,
  isBanglaVowel,
  isPreKar,
  reorderSimplePreKar,
  toKar,
} from '../utils/bengali'
import { getAvroParserSync, resolveAvroParser } from '../utils/avro-parser'
import type {
  EnginePreferences,
  LayoutDefinition,
  LayoutId,
  ProcessKeyInput,
  ProcessKeyResult,
} from '../types/lekha'

export type UseLekhaEngine = ReturnType<typeof useLekhaEngine>

interface InternalState {
  lastBanglaChar: string
  avroAWaiting: boolean
  avroChaToggle: boolean
  avroRomanText: string
  avroRomanCursor: number
}

function shouldToggleLanguage(input: ProcessKeyInput): boolean {
  return Boolean(
    input.key === 'Escape' ||
    ((input.ctrlKey || input.metaKey) && (input.key === 'm' || input.key === 'M'))
  )
}

function applyAvroModification(
  prev: string,
  next: string,
  state: InternalState
): { text: string; replacePrevious: boolean } {
  if (next !== 'হ') {
    state.avroChaToggle = false
  }

  // Double-Hasant rule (,,)
  if (prev === '্' && next === '্') {
    return { text: '্', replacePrevious: false }
  }

  const pairKey = `${prev}|${next}`
  const pairMap: Record<string, string> = {
    'ক|হ': 'খ',
    'গ|হ': 'ঘ',
    'জ|হ': 'ঝ',
    'ট|হ': 'ঠ',
    'ড|হ': 'ঢ',
    'ত|হ': 'থ',
    'দ|হ': 'ধ',
    'প|হ': 'ফ',
    'ব|হ': 'ভ',
    'স|হ': 'শ',
    'শ|হ': 'ষ',
    'ড়|হ': 'ঢ়',
    'া|ো': 'অ',
    'ি|ি': 'ী',
    'ু|ু': 'ূ',
    'ো|ি': 'ৈ',
    'ো|ু': 'ৌ',
  }

  if (prev === 'চ' && next === 'হ') {
    state.avroChaToggle = !state.avroChaToggle
    return {
      text: state.avroChaToggle ? 'চ' : 'ছ',
      replacePrevious: true,
    }
  }

  if (pairMap[pairKey]) {
    return {
      text: pairMap[pairKey],
      replacePrevious: true,
    }
  }

  // Zaphala vs Ya rule
  if (isBanglaConsonant(prev) && next === 'য') {
      return { text: '্য', replacePrevious: false }
  }

  if (isBanglaConsonant(prev) && next === 'অ' && !state.avroAWaiting) {
    state.avroAWaiting = true
    return {
      text: '',
      replacePrevious: false,
    }
  }

  if (isBanglaConsonant(prev) && isBanglaVowel(next) && state.avroAWaiting) {
    state.avroAWaiting = false
    return {
      text: next,
      replacePrevious: false,
    }
  }

  if (isBanglaConsonant(prev) && isBanglaVowel(next)) {
    state.avroAWaiting = false
    return {
      text: toKar(next),
      replacePrevious: false,
    }
  }

  // Hasant logic
  if (isBanglaConsonant(prev) && isBanglaConsonant(next) && !state.avroAWaiting) {
    return {
      text: `্${next}`,
      replacePrevious: false,
    }
  }

  if (next !== 'অ' && next !== '্') {
    state.avroAWaiting = false
  }

  return {
    text: next,
    replacePrevious: false,
  }
}

function mapChar(layout: LayoutDefinition, char: string): string {
  return layout.mappings[char] ?? char
}

function mapUnicodeCursorToRomanCursor(
  parser: (text: string) => string,
  roman: string,
  unicodeCursor: number
): number {
  if (roman.length === 0 || unicodeCursor <= 0) {
    return 0
  }

  let best = 0
  for (let i = 1; i <= roman.length; i++) {
    const parsed = parser(roman.slice(0, i))
    if (parsed.length <= unicodeCursor) {
      best = i
      continue
    }
    break
  }

  return best
}

export function useLekhaEngine(initialLayout: LayoutId = 'bijoy', initialText = '') {
  const text = ref(initialText)
  const cursor = ref(initialText.length)
  const buffer = ref<string[]>([])
  const isEnglish = ref(false)
  const layoutId = ref<LayoutId>(initialLayout)
  const preferences = reactive<EnginePreferences>({
    smartBackspace: true,
  })

  const internal = reactive<InternalState>({
    lastBanglaChar: '',
    avroAWaiting: false,
    avroChaToggle: false,
    avroRomanText: '',
    avroRomanCursor: 0,
  })

  const layout = computed<LayoutDefinition>(() => LAYOUTS[layoutId.value])

  function pushBuffer(char: string): void {
    buffer.value = [...buffer.value, char].slice(-10)
  }

  function setLayout(id: LayoutId): void {
    layoutId.value = id
    internal.lastBanglaChar = ''
    internal.avroAWaiting = false
    internal.avroChaToggle = false
    resetPhoneticBuffer()
  }

  function resetPhoneticBuffer(): void {
    internal.avroRomanText = ''
    internal.avroRomanCursor = 0
  }

  function setText(value: string, nextCursor = value.length): void {
    text.value = value
    cursor.value = nextCursor
  }

  function setCursor(value: number): void {
    cursor.value = Math.max(0, Math.min(value, text.value.length))
  }

  function toggleLanguage(): void {
    isEnglish.value = !isEnglish.value
  }

  function backspace(): ProcessKeyResult {
    const next = preferences.smartBackspace
      ? deletePreviousCluster(text.value, cursor.value)
      : {
          text: text.value.slice(0, Math.max(0, cursor.value - 1)) + text.value.slice(cursor.value),
          cursor: Math.max(0, cursor.value - 1),
        }

    setText(next.text, next.cursor)
    return {
      accepted: true,
      text: text.value,
      cursor: cursor.value,
    }
  }

  function del(): ProcessKeyResult {
    const next = deleteNextCluster(text.value, cursor.value)
    setText(next.text, next.cursor)
    return {
      accepted: true,
      text: text.value,
      cursor: cursor.value,
    }
  }

  function processKey(input: ProcessKeyInput): ProcessKeyResult {
    if (shouldToggleLanguage(input)) {
      toggleLanguage()
      return {
        accepted: true,
        text: text.value,
        cursor: cursor.value,
        toggledLanguage: true,
      }
    }

    if (input.ctrlKey || input.metaKey || input.altKey) {
      return {
        accepted: false,
        text: text.value,
        cursor: cursor.value,
      }
    }

    if (isEnglish.value) {
      if (input.key === 'Backspace') return backspace()
      if (input.key === 'Delete') return del()
      if (input.key.length !== 1) return { accepted: false, text: text.value, cursor: cursor.value }

      const next = insertAtCursor(text.value, cursor.value, input.key)
      setText(next.text, next.cursor)
      return { accepted: true, text: text.value, cursor: cursor.value }
    }

    // AVRO LAYOUT (Phonetic)
    if (layout.value.id === 'avro') {
      const parser = getAvroParserSync()
      if (parser) {
        internal.avroRomanCursor = mapUnicodeCursorToRomanCursor(
          parser,
          internal.avroRomanText,
          cursor.value
        )

        if (input.key === 'Backspace') {
          if (internal.avroRomanCursor > 0) {
            internal.avroRomanText =
              internal.avroRomanText.slice(0, internal.avroRomanCursor - 1) +
              internal.avroRomanText.slice(internal.avroRomanCursor)
            internal.avroRomanCursor -= 1
          } else {
             return backspace()
          }
        } else if (input.key === 'Delete') {
          internal.avroRomanText =
            internal.avroRomanText.slice(0, internal.avroRomanCursor) +
            internal.avroRomanText.slice(internal.avroRomanCursor + 1)
        } else if (input.key.length === 1) {
          pushBuffer(input.key)
          internal.avroRomanText =
            internal.avroRomanText.slice(0, internal.avroRomanCursor) +
            input.key +
            internal.avroRomanText.slice(internal.avroRomanCursor)
          internal.avroRomanCursor += 1
        } else {
          return { accepted: false, text: text.value, cursor: cursor.value }
        }

        const parsedText = parser(internal.avroRomanText)
        const parsedPrefix = parser(internal.avroRomanText.slice(0, internal.avroRomanCursor))
        setText(parsedText, parsedPrefix.length)

        return { accepted: true, text: text.value, cursor: cursor.value }
      }
    }

    // FIXED LAYOUTS (Bijoy, UniJoy, etc.)
    if (input.key === 'Backspace') return backspace()
    if (input.key === 'Delete') return del()
    if (input.key.length !== 1) return { accepted: false, text: text.value, cursor: cursor.value }

    pushBuffer(input.key)
    const mapped = mapChar(layout.value, input.key)
    if (!mapped) return { accepted: false, text: text.value, cursor: cursor.value }

    let insertTextValue = mapped
    
    // TYPOGRAPHIC NORMALIZATION & COMPLEX TRANSITIONS
    if (layout.value.type === 'fixed') {
      // 1. Reph Logic (র্ + Consonant)
      // If we type 'র্' (A in Bijoy) and then a consonant, it stays 'র্' then consonant.
      // But Unicode usually puts 'র্' AFTER the consonant cluster.
      // Our reorderSimplePreKar handles moving 'র্' to the end of the cluster.

      // 2. Vowel Normalization
      if (internal.lastBanglaChar === 'অ' && mapped === 'া') {
         const removed = deletePreviousCluster(text.value, cursor.value)
         setText(removed.text, removed.cursor)
         insertTextValue = 'আ'
      } else if (internal.lastBanglaChar === 'ে' && mapped === 'া') {
         const removed = deletePreviousCluster(text.value, cursor.value)
         setText(removed.text, removed.cursor)
         insertTextValue = 'ো'
      } else if (internal.lastBanglaChar === 'ে' && mapped === 'ৗ') {
         const removed = deletePreviousCluster(text.value, cursor.value)
         setText(removed.text, removed.cursor)
         insertTextValue = 'ৌ'
      } else if (internal.lastBanglaChar === 'র' && mapped === '্য') {
         // Special handling for র‌্য
         insertTextValue = '\u200C্য'
      }
    }

    if (insertTextValue.length > 0) {
      const next = insertAtCursor(text.value, cursor.value, insertTextValue)
      setText(next.text, next.cursor)
      
      const reordered = reorderSimplePreKar(text.value)
      if (reordered !== text.value) {
         // Keep cursor after the transformation
         setText(reordered, cursor.value) 
      }
      
      internal.lastBanglaChar = insertTextValue
    }

    return {
      accepted: true,
      text: text.value,
      cursor: cursor.value,
    }
  }

  onMounted(async () => {
    await resolveAvroParser()
  })

  return {
    text,
    cursor,
    buffer,
    isEnglish,
    layout,
    layoutId,
    preferences,
    setText,
    setCursor,
    setLayout,
    resetPhoneticBuffer,
    toggleLanguage,
    processKey,
    backspace,
  }
}
