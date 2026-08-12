import { LAYOUTS } from '~/constants/layouts'
import type { LayoutId } from '~/types/lekha'

const STORAGE_KEY = 'lekha:preferences'

interface PersistedState {
  currentLayout: LayoutId
  smartBackspace: boolean
  fontSize: number
}

const DEFAULTS: PersistedState = {
  currentLayout: 'bijoy',
  smartBackspace: true,
  fontSize: 22,
}

function readPersisted(): PersistedState {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }

    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      currentLayout:
        parsed.currentLayout && parsed.currentLayout in LAYOUTS
          ? parsed.currentLayout
          : DEFAULTS.currentLayout,
      smartBackspace:
        typeof parsed.smartBackspace === 'boolean'
          ? parsed.smartBackspace
          : DEFAULTS.smartBackspace,
      fontSize:
        typeof parsed.fontSize === 'number' && parsed.fontSize >= 16 && parsed.fontSize <= 48
          ? parsed.fontSize
          : DEFAULTS.fontSize,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export const useLekhaStore = defineStore('lekha', () => {
  const currentLayout = ref<LayoutId>(DEFAULTS.currentLayout)
  const userPreferences = reactive({
    smartBackspace: DEFAULTS.smartBackspace,
    fontSize: DEFAULTS.fontSize,
  })

  /** Called from the client so the server-rendered pass keeps the defaults. */
  function hydrate(): void {
    const persisted = readPersisted()
    currentLayout.value = persisted.currentLayout
    userPreferences.smartBackspace = persisted.smartBackspace
    userPreferences.fontSize = persisted.fontSize
  }

  function persist(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentLayout: currentLayout.value,
          smartBackspace: userPreferences.smartBackspace,
          fontSize: userPreferences.fontSize,
        })
      )
    } catch {
      // Private-mode / quota failures are not worth interrupting typing for.
    }
  }

  return {
    currentLayout,
    userPreferences,
    hydrate,
    persist,
  }
})
