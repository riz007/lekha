interface NavigatorUAData {
  platform?: string
}

/**
 * Platform-correct modifier labels. Detection runs on mount because the app is
 * client-rendered and navigator is unavailable during prerender.
 */
export function usePlatform() {
  const isMac = ref(false)

  onMounted(() => {
    const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData
    const platform = uaData?.platform || navigator.platform || navigator.userAgent || ''
    isMac.value = /mac|iphone|ipad|ipod/i.test(platform)
  })

  // The Bangla/English toggle uses the literal Control key on every platform,
  // so it is shown as ⌃ on macOS rather than ⌘.
  const ctrl = computed(() => (isMac.value ? '⌃' : 'Ctrl'))
  const mod = computed(() => (isMac.value ? '⌘' : 'Ctrl'))
  const alt = computed(() => (isMac.value ? '⌥' : 'Alt'))

  return { isMac, ctrl, mod, alt }
}
