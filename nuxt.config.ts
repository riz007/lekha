// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt'],

  ssr: false, // Set to false for Static Site Generation (SSG) on GitHub Pages

  devtools: {
    enabled: true
  },

  app: {
    // If you are deploying to https://<username>.github.io/<repo-name>/
    // Set baseURL to '/<repo-name>/'
    baseURL: process.env.NUXT_APP_BASE_URL || '/'
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-01-15',

  vite: {
    // Pre-bundle nodejs-avro-phonetic so Vite resolves it as a browser ESM module
    // instead of attempting a Node.js require() at runtime in Chrome.
    optimizeDeps: {
      include: ['nodejs-avro-phonetic']
    },
    build: {
      // Ensure the Avro phonetic package is bundled into the app chunk,
      // not deferred as a dynamic import that fails under GitHub Pages CSP.
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  },
  typescript: {
    strict: true,
    typeCheck: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
