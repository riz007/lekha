import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'

export default [
  {
    ignores: ['.nuxt', '.output', 'dist', 'node_modules'],
  },

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx,vue,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      vue,
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      /** 🔧 Formatting */
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: false,
        },
      ],

      /** 🔧 Quotes (fixes your errors) */
      quotes: ['error', 'single'],
      '@typescript-eslint/quotes': ['error', 'single'],

      /** 🔧 Vue */
      'vue/html-indent': ['error', 2],
      'vue/multi-word-component-names': 'off',

      /** 🔧 Nuxt auto-imports */
      'no-undef': 'off',

      /** 🔧 TS sanity */
      '@typescript-eslint/no-unused-vars': ['warn'],
    },
  },
]
