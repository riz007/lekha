// Utility to sanitize Bengali text for cross-platform compatibility
// Removes or adds ZWJ/ZWNJ as needed for Word/Photoshop

export function safeCopy(text: string): string {
  // Remove unwanted ZWJ/ZWNJ
  let sanitized = text.replace(/[\u200C\u200D]/g, '')
  // Optionally add ZWJ/ZWNJ for specific conjuncts
  // Example: add ZWJ after certain clusters
  sanitized = sanitized.replace(/([ক-হড়ঢ়য়ৎ][্][ক-হড়ঢ়য়ৎ])/g, '$1\u200D')
  return sanitized
}
