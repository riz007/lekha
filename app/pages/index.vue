<script setup lang="ts">
import { KEYBOARD_ROWS, LAYOUTS, LAYOUT_OPTIONS, shiftedKey } from '../constants/layouts'
import { usePlatform } from '../composables/usePlatform'
import type { LayoutId } from '../types/lekha'
import LekhaEditor from '../components/LekhaEditor.vue'

useSeoMeta({
  title: 'Lekha.js — আধুনিক বাংলা টাইপিং ইঞ্জিন',
  description:
    'ব্রাউজারেই বাংলা লিখুন — বিজয়, ইউনিজয়, প্রভাত ও অভ্র ফোনেটিক লেআউটে। যুক্তাক্ষর-সচেতন ডিলিট, রিচ টেক্সট এবং এক ক্লিকে বিজয় কনভার্সন।',
})

const store = useLekhaStore()
const { ctrl, mod, alt } = usePlatform()

onMounted(() => store.hydrate())

const selectedLayout = computed({
  get: () => store.currentLayout,
  set: (value: LayoutId) => {
    store.currentLayout = value
    store.persist()
  },
})

const smartBackspace = computed({
  get: () => store.userPreferences.smartBackspace,
  set: (value: boolean) => {
    store.userPreferences.smartBackspace = value
    store.persist()
  },
})

const fontSize = computed({
  get: () => store.userPreferences.fontSize,
  set: (value: number) => {
    store.userPreferences.fontSize = value
    store.persist()
  },
})

const editorText = ref('সোনার বাংলা, আমি তোমায় ভালোবাসি।')
const showMap = ref(false)

const activeLayout = computed(() => LAYOUTS[selectedLayout.value])

/** Physical keyboard picture: each key with its unshifted and shifted output. */
const keyboardRows = computed(() =>
  KEYBOARD_ROWS.map(row =>
    row.map(key => {
      const shifted = shiftedKey(key)
      return {
        key,
        shifted,
        base: activeLayout.value.mappings[key] ?? '',
        shift: activeLayout.value.mappings[shifted] ?? '',
      }
    })
  )
)

/** Phonetic layouts have no fixed key positions — show a roman → Bengali sheet. */
const phoneticRows = computed(() =>
  Object.entries(activeLayout.value.mappings).sort(([a], [b]) => a.localeCompare(b))
)

const shortcuts = computed(() => [
  { keys: [ctrl.value, 'M'], label: 'বাংলা ↔ English', alt: 'F2' },
  { keys: [mod.value, alt.value, 'C'], label: 'সব মুছুন' },
  { keys: [mod.value, 'Z'], label: 'আনডু' },
  { keys: [mod.value, 'B'], label: 'বোল্ড' },
  { keys: ['১–৯'], label: 'যুক্তাক্ষর সাজেশন নির্বাচন' },
])

function clearCanvas(): void {
  editorText.value = ''
}
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
            পরবর্তী প্রজন্মের বাংলা টাইপিং ইঞ্জিন। আধুনিক ওয়েব এডিটর এবং প্রফেশনাল টাইপোগ্রাফির জন্য
            অপ্টিমাইজড।
          </p>
        </div>

        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            to="https://github.com/riz007/lekha"
            target="_blank"
          />
          <UColorModeButton />
        </div>
      </div>

      <!-- Controls -->
      <UCard
        class="border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl"
      >
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <UFormField label="কীবোর্ড লেআউট" :description="activeLayout.hint">
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
                <span>ইঞ্জিন বিহেভিয়ার</span>
                <UTooltip
                  text="স্মার্ট ডিলিট এক ব্যাকস্পেসে ঠিক একটি অক্ষর-একক মোছে — যেমন স্ট্রি → স্ট্র → স্ট → স। বন্ধ থাকলে একটি করে ইউনিকোড কোডপয়েন্ট মোছে।"
                  :content="{ side: 'top', align: 'center' }"
                >
                  <UIcon
                    name="i-lucide-help-circle"
                    class="w-3.5 h-3.5 text-gray-400 cursor-help"
                  />
                </UTooltip>
              </div>
            </template>
            <template #description> যুক্তাক্ষর-সচেতন ব্যাকস্পেস। </template>
            <div class="pt-2">
              <UCheckbox v-model="smartBackspace" label="স্মার্ট ডিলিট মোড" />
            </div>
          </UFormField>

          <UFormField label="দ্রুত একশন" description="আপনার কাজের জায়গা নিয়ন্ত্রণ করুন।">
            <div class="flex gap-2 pt-1">
              <UButton
                color="neutral"
                variant="subtle"
                icon="i-lucide-keyboard"
                block
                @click="showMap = true"
              >
                কীম্যাপ
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-trash-2"
                aria-label="সব মুছুন"
                @click="clearCanvas"
              >
                মুছুন
              </UButton>
            </div>
          </UFormField>
        </div>
      </UCard>

      <!-- Editor -->
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 px-1">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">লাইভ এডিটর</h2>
          </div>
          <div class="flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <span class="flex items-center gap-1">
              মোড পাল্টাতে <UKbd :value="ctrl" /> + <UKbd value="M" />
              <span class="opacity-60">বা</span> <UKbd value="F2" />
            </span>
            <span class="flex items-center gap-1">
              মুছতে <UKbd :value="mod" /> + <UKbd :value="alt" /> + <UKbd value="C" />
            </span>
          </div>
        </div>

        <LekhaEditor
          v-model="editorText"
          :layout-id="selectedLayout"
          :font-size="fontSize"
          :smart-backspace="smartBackspace"
        />
      </div>

      <!-- Footer -->
      <div
        class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <div class="flex items-center gap-6 text-xs font-medium text-gray-400">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-cpu" class="w-4 h-4" />
            <span>{{ activeLayout.type === 'fixed' ? 'ফিক্সড' : 'ফোনেটিক' }} ইঞ্জিন সক্রিয়</span>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-shield-check" class="w-4 h-4" />
            <span>যুক্তাক্ষর-সচেতন ডিলিট</span>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold italic">
          Built with ❤️ for Bengali
        </p>
      </div>
    </div>

    <!-- Keyboard reference -->
    <UModal
      v-model:open="showMap"
      :title="`কীবোর্ড রেফারেন্স — ${activeLayout.name}`"
      :ui="{ content: 'sm:max-w-4xl' }"
    >
      <template #content>
        <div class="overflow-hidden rounded-xl">
          <div class="p-6 border-b border-gray-200 dark:border-gray-800">
            <div class="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ activeLayout.name }}
                </h3>
                <p class="text-sm text-gray-500">{{ activeLayout.hint }}</p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                aria-label="বন্ধ করুন"
                @click="showMap = false"
              />
            </div>

            <!-- Fixed layouts: a real keyboard picture -->
            <div
              v-if="activeLayout.type === 'fixed'"
              class="space-y-1.5 overflow-x-auto pb-2"
            >
              <div
                v-for="(row, rowIndex) in keyboardRows"
                :key="rowIndex"
                class="flex gap-1.5"
                :style="{ paddingLeft: `${rowIndex * 14}px` }"
              >
                <div
                  v-for="cell in row"
                  :key="cell.key"
                  class="shrink-0 w-14 h-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col items-center justify-center relative shadow-sm"
                >
                  <span
                    class="absolute top-1 left-1.5 text-[9px] font-mono text-gray-400 uppercase"
                  >
                    {{ cell.key }}
                  </span>
                  <span
                    v-if="cell.shift"
                    class="absolute top-0.5 right-1.5 text-[11px] text-primary-500 leading-none"
                    :title="`Shift + ${cell.key}`"
                  >
                    {{ cell.shift }}
                  </span>
                  <span class="text-lg mt-2">{{ cell.base || '·' }}</span>
                </div>
              </div>
              <p class="text-[11px] text-gray-400 pt-2">
                উপরে ডানে <span class="text-primary-500">রঙিন</span> অক্ষর = Shift চেপে পাওয়া যাবে।
              </p>
            </div>

            <!-- Phonetic: roman → Bengali sheet -->
            <div v-else class="space-y-4">
              <div
                class="rounded-lg bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900 p-4 text-sm"
              >
                <p class="font-medium text-gray-900 dark:text-white mb-1">যেভাবে লিখবেন</p>
                <p class="text-gray-600 dark:text-gray-300">
                  ইংরেজি বানানে লিখলেই বাংলা হয়ে যাবে — <code>ami</code> → আমি,
                  <code>tOmay</code> → তোমায়, <code>bhalObasi</code> → ভালোবাসি। বড় হাতের অক্ষর
                  (<code>O</code>, <code>T</code>, <code>N</code>) ভিন্ন বর্ণ দেয়।
                </p>
              </div>
              <div
                class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar"
              >
                <div
                  v-for="[key, value] in phoneticRows"
                  :key="`${key}-${value}`"
                  class="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <span class="text-[10px] font-mono text-gray-400">{{ key }}</span>
                  <span class="text-xl">{{ value }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-6 bg-gray-50 dark:bg-gray-900">
            <h4
              class="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-3"
            >
              শর্টকাট
            </h4>
            <div class="grid sm:grid-cols-2 gap-2">
              <div
                v-for="shortcut in shortcuts"
                :key="shortcut.label"
                class="flex items-center justify-between gap-3 text-sm py-1"
              >
                <span class="text-gray-600 dark:text-gray-300">{{ shortcut.label }}</span>
                <span class="flex items-center gap-1 shrink-0">
                  <template v-for="(k, i) in shortcut.keys" :key="k">
                    <span v-if="i > 0" class="text-gray-400 text-xs">+</span>
                    <UKbd :value="k" />
                  </template>
                  <template v-if="shortcut.alt">
                    <span class="text-gray-400 text-xs mx-1">বা</span>
                    <UKbd :value="shortcut.alt" />
                  </template>
                </span>
              </div>
            </div>
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
