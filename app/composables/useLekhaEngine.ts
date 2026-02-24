import { LAYOUTS } from '../constants/layouts'
import {
  deleteNextCluster,
  deletePreviousCluster,
  insertAtCursor,
  isBanglaConsonant,
  isBanglaKar,
  isBanglaVowel,
  isPreKar,
  toKar,
  toVowel,
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
  activePreKar: string
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
    activePreKar: '',
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
    internal.activePreKar = ''
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
    if (input.key === 'Backspace') {
      internal.activePreKar = ''
      return backspace()
    }
    if (input.key === 'Delete') {
      internal.activePreKar = ''
      return del()
    }
    if (input.key.length !== 1) {
      internal.activePreKar = ''
      return { accepted: false, text: text.value, cursor: cursor.value }
    }

    pushBuffer(input.key)
    const mapped = mapChar(layout.value, input.key)
    if (!mapped) return { accepted: false, text: text.value, cursor: cursor.value }

    // Flush state on space
    if (input.key === ' ') {
       internal.activePreKar = ''
       internal.lastBanglaChar = ''
       const next = insertAtCursor(text.value, cursor.value, ' ')
       setText(next.text, next.cursor)
       return { accepted: true, text: text.value, cursor: cursor.value }
    }

    let insertTextValue = mapped
    let skipNormalInsert = false

    if (layout.value.type === 'fixed') {
      const charBefore = text.value.charAt(cursor.value - 1);

      // Rule A: Hasant-to-Vowel (Bijoy Shoroborno)
      if (charBefore === '্' && isBanglaKar(mapped)) {
         const textWithoutHasant = text.value.slice(0, cursor.value - 1) + text.value.slice(cursor.value);
         const next = insertAtCursor(textWithoutHasant, cursor.value - 1, toVowel(mapped));
         setText(next.text, next.cursor);
         internal.activePreKar = ''
         skipNormalInsert = true
      }
      
      // Rule B: Standalone Vowel Normalization (অ + া = আ)
      else if (charBefore === 'অ' && mapped === 'া') {
         const textWithoutO = text.value.slice(0, cursor.value - 1) + text.value.slice(cursor.value);
         const next = insertAtCursor(textWithoutO, cursor.value - 1, 'আ');
         setText(next.text, next.cursor);
         internal.activePreKar = ''
         skipNormalInsert = true
      }

      // Rule C: Pre-Kar Swapping State Machine
      else if (isPreKar(mapped)) {
         internal.activePreKar = mapped
      }
      
      else if (internal.activePreKar && charBefore === internal.activePreKar && (isBanglaConsonant(mapped) || mapped === '্')) {
         const textWithoutKar = text.value.slice(0, cursor.value - 1) + text.value.slice(cursor.value);
         const next = insertAtCursor(textWithoutKar, cursor.value - 1, mapped + internal.activePreKar);
         setText(next.text, next.cursor);
         
         if (mapped !== '্') {
            internal.activePreKar = ''
         }
         skipNormalInsert = true
      }

      // Rule D: Composite Kars (ে + া = ো)
      else if (charBefore === 'ে' && mapped === 'া') {
         const textWithoutE = text.value.slice(0, cursor.value - 1) + text.value.slice(cursor.value);
         const next = insertAtCursor(textWithoutE, cursor.value - 1, 'ো');
         setText(next.text, next.cursor);
         internal.activePreKar = ''
         skipNormalInsert = true
      }

      // Rule E: Smooth Special Bijoy Clusters (র‍্য)
      else if (charBefore === 'র' && mapped === '্য') {
         // Using ZWJ (\u200D) for a smooth join in modern fonts
         insertTextValue = '\u200D্য'
         internal.activePreKar = ''
      }

      // Rule F: Reph Back-Swap (Bijoy Post-Typing Reordering)
      else if (mapped === 'র্') {
         const textBefore = text.value.slice(0, cursor.value);
         const match = textBefore.match(/([ক-হড়ঢ়য়ৎ]([্][ক-হড়ঢ়য়ৎ])*([ািীুূৃেৈোৌৗ])?)$/);
         if (match) {
            const cluster = match[0];
            const textWithoutCluster = text.value.slice(0, cursor.value - cluster.length) + text.value.slice(cursor.value);
            const next = insertAtCursor(textWithoutCluster, cursor.value - cluster.length, 'র্' + cluster);
            setText(next.text, next.cursor);
            skipNormalInsert = true;
         }
      }
    }

    if (!skipNormalInsert && insertTextValue.length > 0) {
      const next = insertAtCursor(text.value, cursor.value, insertTextValue)
      setText(next.text, next.cursor)
    }

    internal.lastBanglaChar = text.value.charAt(cursor.value - 1);

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
