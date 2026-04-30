export type AvroParseFn = (text: string) => string

let cachedParser: AvroParseFn | null = null
let loadError: string | null = null

export function getAvroParserSync(): AvroParseFn | null {
  return cachedParser
}

export function getAvroLoadError(): string | null {
  return loadError
}

export async function resolveAvroParser(): Promise<AvroParseFn | null> {
  if (cachedParser) return cachedParser

  try {
    const mod = await import('nodejs-avro-phonetic')
    const avro = mod.default ?? mod

    const rawFn: ((text: string) => string) | null
      = avro && typeof avro.parse === 'function'
        ? (text: string) => avro.parse(text) as string
        : typeof avro === 'function'
          ? (text: string) => (avro as (t: string) => string)(text)
          : null

    if (!rawFn) {
      loadError = 'nodejs-avro-phonetic: no usable export found'
      console.error(loadError, avro)
      return null
    }

    // Wrap with try/catch so a single malformed input string can't crash the engine
    cachedParser = (text: string): string => {
      try {
        return rawFn(text)
      } catch (e) {
        console.warn('Avro parse error for input:', JSON.stringify(text), e)
        return text
      }
    }

    return cachedParser
  } catch (e) {
    loadError = String(e)
    console.error('Failed to load nodejs-avro-phonetic:', e)
  }

  return null
}

export async function parseAvroText(text: string): Promise<string | null> {
  const parser = await resolveAvroParser()
  return parser ? parser(text) : null
}
