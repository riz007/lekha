<script setup lang="ts">
import { LAYOUTS, LAYOUT_OPTIONS } from '../constants/layouts'
import type { LayoutId } from '../types/lekha'
import LekhaEditor from '../components/LekhaEditor.vue'

useSeoMeta({
  title: 'Lekha.js - Advanced Bengali Typographic Engine',
  description: 'High-performance headless Bengali typing engine for Nuxt 4 + TipTap.',
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

const isMac = ref(false)
onMounted(() => {
  isMac.value = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
})

function clearCanvas(): void {
  editorText.value = ''
}

const keyMapRows = computed(() => {
  const mapping = LAYOUTS[selectedLayout.value].mappings
  if (!mapping) return []
  return Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <UContainer class="py-12 max-w-5xl">
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div class="bg-primary-500 rounded-lg p-2 shadow-lg shadow-primary-500/20">
              <UIcon name="i-lucide-pen-tool" class="w-6 h-6 text-white" />
            </div>
            <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Lekha<span class="text-primary-500">.js</span>
            </h1>
          </div>
          <p class="text-gray-500 dark:text-gray-400 max-w-md">
            পরবর্তী প্রজন্মের বাংলা টাইপিং ইঞ্জিন। আধুনিক ওয়েব এডিটর এবং প্রফেশনাল টাইপোগ্রাফির জন্য
            অপ্টিমাইজড।
          </p>
        </div>

        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-simple-icons-github"
            to="https://github.com/riz007/lekha"
            target="_blank"
          />
          <UColorModeButton />
        </div>
      </div>

      <!-- Controls Card -->
      <UCard
        class="border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl"
      >
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <UFormField label="কীবোর্ড লেআউট" description="পছন্দমতো লেআউট নির্বাচন করুন।">
            <USelect
              v-model="selectedLayout"
              :items="LAYOUT_OPTIONS"
              value-key="value"
              label-key="label"
              class="w-full"
              icon="i-lucide-keyboard"
            />
          </UFormField>

          <UFormField label="ফন্ট সাইজ" :description="`${fontSize} পিক্সেল`">
            <div class="pt-2">
              <USlider v-model="fontSize" :min="16" :max="48" :step="1" color="primary" />
            </div>
          </UFormField>

          <UFormField>
            <template #label>
              <div class="flex items-center gap-1">
                <span>ইঞ্জিন বিহেভিয়ার</span>
                <UTooltip
                  text="স্মার্ট ডিলিট যুক্তাক্ষরকে একটি একক ইউনিট হিসেবে মুছে ফেলে। এটি হসন্ত (্) অবশিষ্ট রেখে টাইপোগ্রাফি নষ্ট হওয়া প্রতিরোধ করে।"
                  :content="{ side: 'top', align: 'center' }"
                >
                  <UIcon
                    name="i-lucide-help-circle"
                    class="w-3.5 h-3.5 text-gray-400 cursor-help"
                  />
                </UTooltip>
              </div>
            </template>
            <template #description> বুদ্ধিমান ক্যারেক্টার ডিলিট। </template>
            <div class="pt-2">
              <UCheckbox v-model="smartBackspace" label="স্মার্ট ডিলিট মোড" />
            </div>
          </UFormField>

          <UFormField label="দ্রুত একশন" description="আপনার কাজের জায়গা নিয়ন্ত্রণ করুন।">
            <div class="flex gap-2 pt-1">
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-info"
                block
                @click="showMap = true"
              >
                কীম্যাপ
              </UButton>
              <UButton color="error" variant="soft" icon="i-lucide-trash-2" @click="clearCanvas">
                মুছুন
              </UButton>
            </div>
          </UFormField>
        </div>
      </UCard>

      <!-- Main Editor -->
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">লাইভ এডিটর</h2>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-400">
            <span>মোড পাল্টাতে: <UKbd value="Esc" /></span>
            <span
              >মুছতে: <UKbd :value="isMac ? 'Cmd' : 'Ctrl'" /> + <UKbd value="Alt" /> +
              <UKbd value="C"
            /></span>
          </div>
        </div>

        <LekhaEditor
          v-model="editorText"
          :layout-id="selectedLayout"
          :font-size="fontSize"
          :smart-backspace="smartBackspace"
        />
      </div>

      <!-- Footer Info -->
      <div
        class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <div class="flex items-center gap-6 text-xs font-medium text-gray-400">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-cpu" class="w-4 h-4" />
            <span>{{ LAYOUTS[selectedLayout].type.toUpperCase() }} ইঞ্জিন সক্রিয়</span>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-shield-check" class="w-4 h-4" />
            <span>নিরাপদ ক্লাস্টার মোড</span>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold italic">
          Built with ❤️ for Bengali
        </p>
      </div>
    </div>

    <!-- Enhanced Keymap Modal -->
    <UModal
      v-model:open="showMap"
      :title="`কীবোর্ড রেফারেন্স: ${LAYOUTS[selectedLayout].name}`"
      :ui="{ width: 'sm:max-w-3xl' }"
    >
      <template #content>
        <div class="p-0 overflow-hidden rounded-xl">
          <div
            class="bg-gray-50 dark:bg-gray-900 p-6 border-b border-gray-200 dark:border-gray-800"
          >
            <p class="text-sm text-gray-500 mb-4">
              যেকোনো ক্যারেক্টার দেখুন। ম্যাপিং ফরম্যাট: [কী] → [অক্ষর]।
            </p>

            <div
              class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar"
            >
              <div
                v-for="[key, value] in keyMapRows"
                :key="`${key}-${value}`"
                class="flex flex-col items-center justify-center p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:border-primary-500 transition-colors group cursor-default"
              >
                <span
                  class="text-[10px] font-mono text-gray-400 group-hover:text-primary-500 mb-1"
                  >{{ key }}</span
                >
                <span class="text-2xl font-semibold">{{ value }}</span>
              </div>
            </div>
          </div>
          <div class="p-4 bg-white dark:bg-gray-950 flex justify-end">
            <UButton color="neutral" variant="ghost" @click="showMap = false">বন্ধ করুন</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1e293b;
}
</style>
