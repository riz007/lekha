import type { LayoutDefinition, LayoutId } from '~/types/lekha'

// AUTHORITATIVE BIJOY UNICODE MAPPING
// Based on standard industry usage
const bijoyMap: Record<string, string> = {
  // Normal
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  'j': 'ক', 'k': 'ত', 'l': 'দ', 'h': 'ব', 'v': 'র', 'b': 'ন', 'n': 'স', 'm': 'ম', 'u': 'জ', 'i': 'হ',
  'y': 'চ', 't': 'ট', 'e': 'ড', 'r': 'প', 'o': 'গ', 'p': 'ড়', 'f': 'া', 'd': 'ি', 's': 'ু', 'a': 'ৃ',
  'c': 'ে', 'w': 'য', 'g': '্', 'q': 'ঙ', 'z': '্র', 'x': 'ও', '`': '‌',
  '\\': 'ৎ', ';': '；', ',': '，', '.': '।', '/': '/', '[': ']', ']': '}',
  
  // Shift
  'J': 'খ', 'K': 'থ', 'L': 'ধ', 'H': 'ভ', 'V': 'ল', 'B': 'ণ', 'N': 'ষ', 'M': 'শ', 'U': 'ঝ', 'I': 'ঞ',
  'Y': 'ছ', 'T': 'ঠ', 'E': 'ঢ', 'R': 'ফ', 'O': 'ঘ', 'P': 'ঢ়', 'F': 'অ', 'D': 'ী', 'S': 'ূ', 'A': 'র্',
  'C': 'ৈ', 'W': 'য়', 'G': '।', 'Q': 'ং', 'Z': '্য', 'X': 'ৗ', '~': '‍',
  '&': 'ঁ', '$': '৳', '|': 'ঃ',
}

// AUTHORITATIVE PROBHAT MAPPING
// Based on OpenBangla/Ekushey Standard
const probhatMap: Record<string, string> = {
  // Normal
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  'a': 'া', 'b': 'ব', 'c': 'চ', 'd': 'দ', 'e': 'এ', 'f': 'ফ', 'g': 'গ', 'h': 'হ', 'i': 'ি', 'j': 'জ',
  'k': 'ক', 'l': 'ল', 'm': 'ম', 'n': 'ন', 'o': 'ো', 'p': 'প', 'q': 'ৃ', 'r': 'র', 's': 'স', 't': 'ত',
  'u': 'ু', 'v': 'ভ', 'w': 'ে', 'x': 'ষ', 'y': 'য়', 'z': 'য',
  ';': '；', ',': '，', '.': '।', '[': 'ৎ', ']': '।', '\\': '॥', '`': '‍',
  
  // Shift
  'A': 'আ', 'B': 'ভ', 'C': 'ছ', 'D': 'ড', 'E': 'ৈ', 'F': '্', 'G': 'ঘ', 'H': 'ঃ', 'I': 'ই', 'J': 'ঝ',
  'K': 'খ', 'L': 'ব', 'M': 'ঙ', 'N': 'ঞ', 'O': 'ও', 'P': 'ঢ়', 'Q': 'ৌ', 'R': 'ড়', 'S': 'ষ', 'T': 'ট',
  'U': 'উ', 'V': 'র', 'W': 'ৈ', 'X': 'ক্ষ', 'Y': '্য', 'Z': '্য',
  ':': 'ঃ', '<': 'ৃ', '>': 'ঁ', '{': 'ঁ', '}': 'ৈ', '|': 'ঃ', '~': '‌', '?' : '？'
}

// AUTHORITATIVE UNIJOY MAPPING
const unijoyMap: Record<string, string> = {
  ...bijoyMap,
  'x': 'ো',
  'X': 'ৌ',
  '^': '÷',
  '*': '×',
}

const somewhereInMap: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  'a': 'া', 'A': 'আ', 'd': 'ড', 'D': 'দ', 's': 'স', 'S': 'ষ', 'f': 'ফ', 'F': 'ঋ', 'g': 'গ', 'G': 'ঘ',
  'h': 'হ', 'H': 'ঃ', 'j': 'জ', 'J': 'ঝ', 'k': 'ক', 'K': 'খ', 'l': 'ল', 'L': 'খ', 'z': 'য', 'Z': 'ত',
  'x': 'ক্স', 'X': 'ঢ', 'c': 'চ', 'C': 'ছ', 'v': 'ভ', 'V': 'ঠ', 'b': 'ব', 'B': 'ই', 'n': 'ন', 'N': 'ণ',
  'm': 'ম', 'M': 'গ', 'q': 'য়', 'Q': 'ছ', 'w': 'ৃ', 'W': 'ঋ', 'e': 'ে', 'E': 'এ', 'r': 'র', 'R': 'ড়',
  't': 'ট', 'T': 'ত', 'y': 'য়', 'Y': '্য', 'u': 'ু', 'U': 'উ', 'i': 'ি', 'I': 'ই', 'o': 'ো', 'O': 'ও',
  'p': 'প', 'P': 'চ', '&': '্', '$': '৳', '+': '্', '.': '।', '`': '\u200C', '~': '\u200D',
  '\\': '॥', '|': '।',
}

const avroMap: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  'o': 'অ', 'a': 'আ', 'A': 'আ', 'i': 'ই', 'I': 'ঈ', 'u': 'উ', 'U': 'ঊ', 'e': 'এ', 'E': 'এ', 'O': 'ও',
  'd': 'দ', 'D': 'ড', 's': 'স', 'S': 'শ', 'f': 'ফ', 'g': 'গ', 'h': 'হ', 'H': 'হ', 'j': 'জ', 'J': 'য',
  'k': 'ক', 'K': 'ক', 'l': 'ল', 'L': 'ল', 'z': 'য', 'Z': '্য', 'c': 'চ', 'v': 'ভ', 'V': 'ভ', 'b': 'ব',
  'n': 'ন', 'N': 'ণ', 'm': 'ম', 'y': 'য়', 'w': '্ব', 'r': 'র', 'R': 'ড়', 't': 'ত', 'T': 'ট', 'p': 'প',
  '$': '৳', '+': '্', '.': '।', ':': 'ঃ', '^': 'ঁ', '`': '্'
}

export const LAYOUTS: Record<LayoutId, LayoutDefinition> = {
  bijoy: {
    id: 'bijoy',
    name: 'Bijoy',
    type: 'fixed',
    mappings: bijoyMap,
    supportsDirectKeyInput: true,
  },
  unijoy: {
    id: 'unijoy',
    name: 'UniJoy',
    type: 'fixed',
    mappings: unijoyMap,
    supportsDirectKeyInput: true,
  },
  somewherein: {
    id: 'somewherein',
    name: 'SomewhereIn',
    type: 'fixed',
    mappings: somewhereInMap,
    supportsDirectKeyInput: true,
  },
  avro: {
    id: 'avro',
    name: 'Avro Phonetic',
    type: 'phonetic',
    mappings: avroMap,
    supportsDirectKeyInput: true,
  },
  boishakhi: {
    id: 'boishakhi',
    name: 'Baishakhi',
    type: 'fixed',
    mappings: bijoyMap,
    supportsDirectKeyInput: true,
  },
  probhat: {
    id: 'probhat',
    name: 'Probhat',
    type: 'fixed',
    mappings: probhatMap,
    supportsDirectKeyInput: true,
  },
}

export const LAYOUT_OPTIONS = Object.values(LAYOUTS).map(layout => ({
  label: layout.name,
  value: layout.id,
  disabled: !layout.supportsDirectKeyInput,
}))
