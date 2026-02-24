const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('bn', { granularity: 'grapheme' })
    : null

const CLUSTER_REGEX = /([ক-হড়ঢ়য়ৎ]([্][ক-হড়ঢ়য়ৎ])*)/g 

export function findConjunctClusters(text: string): Array<{ start: number; end: number }> {
  const clusters: Array<{ start: number; end: number }> = []
  let match: RegExpExecArray | null
  const regex = new RegExp(CLUSTER_REGEX)
  while ((match = regex.exec(text))) {
    clusters.push({ start: match.index, end: match.index + match[0].length })
  }
  return clusters
}

const CONSONANTS = new Set([
  'ক', 'খ', 'গ', 'ঘ', 'ঙ',
  'চ', 'ছ', 'জ', 'ঝ', 'ঞ',
  'ট', 'ঠ', 'ড', 'ঢ', 'ণ',
  'ত', 'থ', 'দ', 'ধ', 'ন',
  'প', 'ফ', 'ব', 'ভ', 'ম',
  'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ',
  'ড়', 'ঢ়', 'য়', 'ৎ'
])

const VOWELS = new Set(['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ'])
const KARS = new Set(['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ', 'ৗ'])
const PRE_KARS = new Set(['ি', 'ে', 'ৈ'])

export function splitClusters(text: string): string[] {
  if (!segmenter) {
    return Array.from(text)
  }

  return Array.from(segmenter.segment(text), segment => segment.segment)
}

function boundaryIndexes(text: string): number[] {
  if (!segmenter) {
    const values: number[] = [0]
    let index = 0
    for (const char of Array.from(text)) {
      index += char.length
      values.push(index)
    }
    return values
  }

  const values: number[] = [0]
  for (const segment of segmenter.segment(text)) {
    values.push(segment.index + segment.segment.length)
  }

  if (values[values.length - 1] !== text.length) {
    values.push(text.length)
  }

  return values
}

function findBoundaryBefore(text: string, cursor: number): number {
  const boundaries = boundaryIndexes(text)
  for (let i = boundaries.length - 1; i >= 0; i--) {
    const b = boundaries[i]
    if (typeof b !== 'undefined' && b < cursor) {
      return b
    }
  }
  return 0
}

function findBoundaryAfter(text: string, cursor: number): number {
  const boundaries = boundaryIndexes(text)
  for (const boundary of boundaries) {
    if (boundary > cursor) {
      return boundary
    }
  }
  return text.length
}

export function insertAtCursor(
  text: string,
  cursor: number,
  insertText: string
): { text: string; cursor: number } {
  const nextText = text.slice(0, cursor) + insertText + text.slice(cursor)
  return {
    text: nextText,
    cursor: cursor + insertText.length,
  }
}

export function deletePreviousCluster(
  text: string,
  cursor: number
): { text: string; cursor: number } {
  const start = findBoundaryBefore(text, cursor)
  return {
    text: text.slice(0, start) + text.slice(cursor),
    cursor: start,
  }
}

export function deleteNextCluster(text: string, cursor: number): { text: string; cursor: number } {
  const end = findBoundaryAfter(text, cursor)
  return {
    text: text.slice(0, cursor) + text.slice(end),
    cursor,
  }
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

export function toKar(vowel: string): string {
  const map: Record<string, string> = {
    আ: 'া', ই: 'ি', ঈ: 'ী', উ: 'ু', ঊ: 'ূ', ঋ: 'ৃ', এ: 'ে', ঐ: 'ৈ', ও: 'ো', ঔ: 'ৌ'
  }
  return map[vowel] ?? vowel
}

export function toVowel(kar: string): string {
  const map: Record<string, string> = {
    'া': 'আ', 'ি': 'ই', 'ী': 'ঈ', 'ু': 'উ', 'ূ': 'ঊ', 
    'ৃ': 'ঋ', 'ে': 'এ', 'ৈ': 'ঐ', 'ো': 'ও', 'ৌ': 'ঔ', 'ৗ': 'ঔ'
  }
  return map[kar] ?? kar
}

export function atomicCursor(text: string, cursor: number): number {
  const boundaries = boundaryIndexes(text)
  if (boundaries.includes(cursor)) return cursor
  
  let nearest = 0
  let minDist = Infinity
  for (const b of boundaries) {
    const dist = Math.abs(b - cursor)
    if (dist < minDist) {
      minDist = dist
      nearest = b
    }
  }
  return nearest
}
