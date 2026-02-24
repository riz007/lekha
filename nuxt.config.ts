// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt'],

  ssr: false, // Set to false for Static Site Generation (SSG) on GitHub Pages

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  app: {
    // If you are deploying to https://<username>.github.io/<repo-name>/
    // Set baseURL to '/<repo-name>/'
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
  },

  compatibilityDate: '2025-01-15',
  typescript: {
    strict: true,
    typeCheck: true,
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs',
      },
    },
  },
})
