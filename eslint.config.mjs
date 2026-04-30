// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Allow any-typed editor callbacks (TipTap doesn't export full types)
      '@typescript-eslint/no-explicit-any': 'off',
      // Nuxt auto-imports (ref, watch, etc.) are global by design
      'no-undef': 'off'
    }
  }
)
