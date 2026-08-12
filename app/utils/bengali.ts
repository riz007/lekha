// Bengali orthography helpers.
//
// Deletion works on *orthographic units*, not on Unicode grapheme clusters.
// Intl.Segmenter (Unicode 15.1 GB9c) treats a whole conjunct as one grapheme, so
// "স্ট্রি" is a single cluster — deleting by grapheme wipes five keystrokes of work
// with one Backspace. A unit here is what the typist perceives as one press:
// a base letter (with the hasant that binds it to the previous letter), or a
// single matra/sign.

export const ZWJ = '‍'
export const ZWNJ = '‌'
export const HASANT = '্' // ্
export const NUKTA = '়' // ়

const CONSONANTS = new Set([
  'ক',
  'খ',
  'গ',
  'ঘ',
  'ঙ',
  'চ',
  'ছ',
  'জ',
  'ঝ',
  'ঞ',
  'ট',
  'ঠ',
  'ড',
  'ঢ',
  'ণ',
  'ত',
  'থ',
  'দ',
  'ধ',
  'ন',
  'প',
  'ফ',
  'ব',
  'ভ',
  'ম',
  'য',
  'র',
  'ল',
  'শ',
  'ষ',
  'স',
  'হ',
  'ড়',
  'ঢ়',
  'য়',
  'ৎ',
])

const VOWELS = new Set(['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ'])
const KARS = new Set(['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ', 'ৗ'])

// Kars that render to the *left* of their consonant but are typed after it.
const PRE_KARS = new Set(['ি', 'ে', 'ৈ'])

export function isJoiner(char: string): boolean {
  return char === ZWJ || char === ZWNJ
}

/**
 * Combining marks that hang off a base letter: matras, candrabindu/anusvara/visarga,
 * nukta, hasant and the au length mark. These never stand on their own.
 */
export function isCombiningMark(char: string): boolean {
  const code = char.codePointAt(0)
  if (code === undefined) return false
  return (
    (code >= 0x0981 && code <= 0x0983) || // ঁ ং ঃ
    code === 0x09bc || // ়
    (code >= 0x09be && code <= 0x09cc) || // matras
    code === 0x09cd || // ্
    code === 0x09d7 || // ৗ
    code === 0x09e2 ||
    code === 0x09e3
  )
}

function prevCodePointIndex(text: string, index: number): number {
  if (index <= 0) return 0
  const before = index - 1
  const code = text.charCodeAt(before)
  // low surrogate — step back over the whole pair
  if (code >= 0xdc00 && code <= 0xdfff && before > 0) {
    const high = text.charCodeAt(before - 1)
    if (high >= 0xd800 && high <= 0xdbff) return before - 1
  }
  return before
}

function nextCodePointIndex(text: string, index: number): number {
  if (index >= text.length) return text.length
  const code = text.charCodeAt(index)
  if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
    const low = text.charCodeAt(index + 1)
    if (low >= 0xdc00 && low <= 0xdfff) return index + 2
  }
  return index + 1
}

function charAt(text: string, index: number): string {
  const code = text.codePointAt(index)
  return code === undefined ? '' : String.fromCodePoint(code)
}

/**
 * How many UTF-16 units Backspace should remove from the end of `before`.
 *
 * smart = true  → one orthographic unit; a base letter takes its binding hasant with
 *                 it so no orphan ্ is ever left behind.
 * smart = false → one code point, still never stranding an invisible joiner
 *                 (a Backspace that deletes only a ZWJ looks like a dead key).
 */
export function countDeleteBefore(before: string, smart: boolean): number {
  if (!before) return 0

  let index = before.length

  // Invisible joiners are never a unit of their own.
  while (index > 0 && isJoiner(before.charAt(index - 1))) index--
  if (index === 0) return before.length

  const unitEnd = index
  index = prevCodePointIndex(before, index)
  let removed = before.slice(index, unitEnd)

  if (!smart) return before.length - index

  // A nukta belongs to the letter underneath it: ড় is one letter, not two.
  if (removed === NUKTA && index > 0) {
    const baseStart = prevCodePointIndex(before, index)
    removed = before.slice(baseStart, index)
    index = baseStart
  }

  // A matra or sign is a complete unit on its own.
  if (isCombiningMark(removed)) return before.length - index

  // A base letter bound by a hasant takes the hasant (and any joiners) with it,
  // so ক্ষ → ক rather than the unusable ক্.
  let start = index
  while (start > 0 && isJoiner(before.charAt(start - 1))) start--
  if (start > 0 && before.charAt(start - 1) === HASANT) {
    start -= 1
    while (start > 0 && isJoiner(before.charAt(start - 1))) start--
    return before.length - start
  }

  return before.length - index
}

/**
 * How many UTF-16 units forward Delete should remove from the start of `after`.
 * Mirrors countDeleteBefore: a base letter takes its trailing matras and a
 * following hasant, so deleting forward never orphans a mark either.
 */
export function countDeleteAfter(after: string, smart: boolean): number {
  if (!after) return 0

  let index = 0
  while (index < after.length && isJoiner(after.charAt(index))) index++
  if (index === after.length) return after.length

  const start = index
  index = nextCodePointIndex(after, index)
  const removed = after.slice(start, index)

  if (!smart) return index

  // Deleting a hasant forward takes the consonant it binds.
  if (removed === HASANT) {
    while (index < after.length && isJoiner(after.charAt(index))) index++
    if (index < after.length && !isCombiningMark(charAt(after, index))) {
      index = nextCodePointIndex(after, index)
    }
    return index
  }

  if (isCombiningMark(removed)) return index

  // Base letter: absorb its trailing marks, stopping after a binding hasant.
  while (index < after.length) {
    const char = charAt(after, index)
    if (isJoiner(char)) {
      index += char.length
      continue
    }
    if (char === HASANT) {
      index += char.length
      while (index < after.length && isJoiner(after.charAt(index))) index++
      break
    }
    if (isCombiningMark(char)) {
      index += char.length
      continue
    }
    break
  }

  return index
}

export function isBanglaConsonant(char: string): boolean {
  return CONSONANTS.has(char)
}

export function isBanglaVowel(char: string): boolean {
  return VOWELS.has(char)
}

export function isBanglaKar(char: string): boolean {
  return KARS.has(char)
}

export function isPreKar(char: string): boolean {
  return PRE_KARS.has(char)
}

export function toVowel(kar: string): string {
  const map: Record<string, string> = {
    'া': 'আ',
    'ি': 'ই',
    'ী': 'ঈ',
    'ু': 'উ',
    'ূ': 'ঊ',
    'ৃ': 'ঋ',
    'ে': 'এ',
    'ৈ': 'ঐ',
    'ো': 'ও',
    'ৌ': 'ঔ',
    'ৗ': 'ঔ',
  }
  return map[kar] ?? kar
}
