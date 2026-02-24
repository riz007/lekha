export type AvroParseFn = (text: string) => string

let cachedParser: AvroParseFn | null = null

export function getAvroParserSync(): AvroParseFn | null {
  return cachedParser
}

export async function resolveAvroParser(): Promise<AvroParseFn | null> {
  if (cachedParser) return cachedParser
  
  try {
    const mod = await import('nodejs-avro-phonetic')
    const avro = mod.default || mod
    
    if (avro && typeof avro.parse === 'function') {
      // Bind to ensure 'this' context is preserved if needed by the library
      cachedParser = avro.parse.bind(avro)
      return cachedParser
    } else if (typeof avro === 'function') {
      cachedParser = avro
      return cachedParser
    }
  } catch (e) {
    console.error('Failed to load nodejs-avro-phonetic', e)
  }
  
  return null
}

export async function parseAvroText(text: string): Promise<string | null> {
  const parser = await resolveAvroParser()
  return parser ? parser(text) : null
}
