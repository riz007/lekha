import type { LayoutId } from '~/types/lekha'

export const useLekhaStore = defineStore('lekha', () => {
  const currentLayout = ref<LayoutId>('bijoy')
  const isEnglish = ref(false)
  const userPreferences = reactive({
    smartBackspace: true,
    fontSize: 22
  })

  function toggleLanguage(): void {
    isEnglish.value = !isEnglish.value
  }

  return {
    currentLayout,
    isEnglish,
    userPreferences,
    toggleLanguage
  }
})
