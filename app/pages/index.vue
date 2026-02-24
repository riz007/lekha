<script setup lang="ts">
import { LAYOUTS, LAYOUT_OPTIONS } from '../constants/layouts'
import type { LayoutId } from '../types/lekha'
import LekhaEditor from '../components/LekhaEditor.vue'

useSeoMeta({
  title: 'Lekha.js - Advanced Bengali Typographic Engine',
  description: 'Headless Bengali typing engine with fixed and phonetic layouts for Nuxt 4 + TipTap.',
})

const store = useLekhaStore()

const selectedLayout = computed({
  get: () => store.currentLayout,
  set: (value: LayoutId) => {
    store.currentLayout = value
  },
})

const smartBackspace = computed({
  get: () => store.userPreferences.smartBackspace,
  set: (value: boolean) => {
    store.userPreferences.smartBackspace = value
  },
})

const fontSize = computed({
  get: () => store.userPreferences.fontSize,
  set: (value: number) => {
    store.userPreferences.fontSize = value
  },
})

const editorText = ref('সোনার বাংলা, আমি তোমায় ভালোবাসি।')
const showMap = ref(false)

function clearCanvas(): void {
  editorText.value = ''
}

const keyMapRows = computed(() => {
  const mapping = LAYOUTS[selectedLayout.value].mappings
  if (!mapping) return []
  return Object.entries(mapping)
    .sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <UContainer class="py-6 md:py-10">
    <div class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Lekha.js</h1>
              <p class="text-sm text-muted">
                Advanced Unicode-cluster-safe Bengali typing engine for Nuxt + TipTap.
              </p>
            </div>
          </div>
        </template>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <UFormField label="Layout">
            <USelect
              v-model="selectedLayout"
              :items="LAYOUT_OPTIONS"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Font size">
            <div class="space-y-2">
              <USlider v-model="fontSize" :min="16" :max="48" :step="1" />
              <p class="text-xs text-muted">{{ fontSize }}px</p>
            </div>
          </UFormField>

          <UFormField label="Smart backspace">
            <div class="pt-2">
              <UCheckbox v-model="smartBackspace" label="Delete by grapheme cluster" />
            </div>
          </UFormField>

          <UFormField label="Actions">
            <div class="flex gap-2 pt-1">
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-keyboard"
                @click="showMap = true"
              >
                Keymap
              </UButton>
              <UButton color="error" variant="soft" icon="i-lucide-eraser" @click="clearCanvas">
                Clear
              </UButton>
            </div>
          </UFormField>
        </div>
      </UCard>

      <div class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-base font-medium">Editor</h2>
          <div class="flex items-center gap-4 text-xs text-muted">
             <span>Toggle language: <UKbd value="Esc" /> or <UKbd value="Ctrl" /> + <UKbd value="M" /></span>
          </div>
        </div>

        <LekhaEditor
          v-model="editorText"
          :layout-id="selectedLayout"
          :font-size="fontSize"
          :smart-backspace="smartBackspace"
        />
      </div>

      <UCard variant="subtle">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <p>Active layout: {{ LAYOUTS[selectedLayout].name }} ({{ LAYOUTS[selectedLayout].type }})</p>
          <p>Cluster management: {{ smartBackspace ? 'Active' : 'Disabled' }}</p>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="showMap" :title="`Keyboard Map: ${LAYOUTS[selectedLayout].name}`">
      <template #content>
        <div class="p-6">
          <div class="grid grid-cols-2 gap-2 md:grid-cols-3 max-h-[60vh] overflow-y-auto pr-2">
            <UCard
              v-for="[key, value] in keyMapRows"
              :key="`${key}-${value}`"
              variant="subtle"
              class="p-2"
            >
              <div class="flex items-center justify-between gap-3 text-sm">
                <UKbd :value="key" />
                <span class="text-xl font-medium">{{ value }}</span>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
