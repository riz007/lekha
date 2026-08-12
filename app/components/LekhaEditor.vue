<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { Editor as CoreEditor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { LekhaInput } from '../extensions/LekhaInput'
import { useLekhaEngine } from '../composables/useLekhaEngine'
import { usePlatform } from '../composables/usePlatform'
import type { LayoutId } from '../types/lekha'
import { CONJUNCT_SUGGESTIONS } from '../constants/predictive'
import { safeCopy } from '../utils/safeCopy'
import { convertToBijoy } from '../utils/unicodeToBijoy'

const props = defineProps<{
  modelValue: string
  layoutId: LayoutId
  fontSize?: number
  smartBackspace?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const engine = useLekhaEngine(props.layoutId)
const { ctrl, mod, alt } = usePlatform()
const toast = useToast()

watch(
  () => props.layoutId,
  newId => engine.setLayout(newId)
)

watch(
  () => props.smartBackspace,
  newVal => {
    if (newVal !== undefined) engine.preferences.smartBackspace = newVal
  },
  { immediate: true }
)

const suggestions = ref<string[]>([])
const suggestionPrefix = ref('')
const suggestionPosition = ref({ top: 0, left: 0 })
const isFocused = ref(false)

/** The editor DOM node the capture-phase suggestion listener is bound to. */
let suggestionHost: HTMLElement | null = null

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    TextStyle,
    Color,
    LekhaInput.configure({
      engine
    })
  ],
  onCreate: ({ editor }) => {
    // Capture phase, so a suggestion shortcut is consumed before ProseMirror —
    // and therefore the typing engine — turns the digit into a Bengali numeral.
    suggestionHost = editor.view.dom as HTMLElement
    suggestionHost.addEventListener('keydown', handleSuggestionKeys, true)
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getText())
    updateSuggestions(editor)
  },
  onSelectionUpdate: ({ editor }) => updateSuggestions(editor),
  onFocus: () => {
    isFocused.value = true
  },
  onBlur: () => {
    isFocused.value = false
    suggestions.value = []
  },
  editorProps: {
    attributes: {
      class: 'lekha-surface focus:outline-none',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'বাংলা এডিটর',
      // Keep the browser and its extensions from re-writing Bengali behind our back
      spellcheck: 'false',
      autocorrect: 'off',
      autocapitalize: 'none',
      autocomplete: 'off',
      translate: 'no',
      'data-gramm': 'false',
      'data-lt-active': 'false'
    }
  }
})

const characterCount = computed(() => Array.from(props.modelValue.trim()).length)
const wordCount = computed(() => {
  const trimmed = props.modelValue.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
})

const canUndo = computed(() => editor.value?.can().undo() ?? false)
const canRedo = computed(() => editor.value?.can().redo() ?? false)

/**
 * Conjunct hints, offered only for fixed layouts: after a consonant + hasant the
 * typist has to know which second consonant produces which ligature. Phonetic
 * layouts spell conjuncts out already, so the popup would only be in the way.
 */
function updateSuggestions(editorInstance: CoreEditor) {
  if (engine.layout.value.type !== 'fixed' || engine.isEnglish.value) {
    suggestions.value = []
    return
  }

  const { state } = editorInstance
  const { from, empty } = state.selection
  if (!empty) {
    suggestions.value = []
    return
  }

  const $pos = state.doc.resolve(from)
  const key = $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 2), $pos.parentOffset)

  const match = key.endsWith('্') ? CONJUNCT_SUGGESTIONS[key] : undefined
  if (!match) {
    suggestions.value = []
    return
  }

  suggestions.value = match
  suggestionPrefix.value = key

  const coords = editorInstance.view.coordsAtPos(from)
  suggestionPosition.value = { top: coords.bottom + 8, left: coords.left }
}

function applySuggestion(suggestion: string) {
  if (!editor.value) return

  const { from } = editor.value.state.selection
  const replaceFrom = Math.max(0, from - suggestionPrefix.value.length)

  editor.value.chain().focus().insertContentAt({ from: replaceFrom, to: from }, suggestion).run()
  suggestions.value = []
  engine.resetState()
}

/**
 * Suggestions are picked with 1–9 and dismissed with Escape. This listens in the
 * capture phase so the digit is consumed before ProseMirror — and therefore the
 * typing engine — turns it into a Bengali numeral.
 */
function handleSuggestionKeys(event: KeyboardEvent) {
  if (!suggestions.value.length) return
  if (event.ctrlKey || event.metaKey || event.altKey) return

  if (event.key === 'Escape') {
    suggestions.value = []
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const index = Number(event.key)
  if (Number.isInteger(index) && index >= 1 && index <= suggestions.value.length) {
    event.preventDefault()
    event.stopPropagation()
    applySuggestion(suggestions.value[index - 1] as string)
  }
}

onBeforeUnmount(() => {
  suggestionHost?.removeEventListener('keydown', handleSuggestionKeys, true)
})

async function copyToClipboard(mode: 'unicode' | 'bijoy') {
  if (!editor.value) return

  const text = editor.value.getText()
  if (!text.trim()) {
    toast.add({
      title: 'কপি করার মতো কিছু নেই',
      color: 'warning',
      icon: 'i-lucide-alert-circle',
      duration: 2000
    })
    return
  }

  const toCopy = mode === 'unicode' ? safeCopy(text) : convertToBijoy(text)

  try {
    await navigator.clipboard.writeText(toCopy)
    toast.add({
      title: mode === 'unicode' ? 'ইউনিকোড কপি হয়েছে' : 'বিজয় কপি হয়েছে',
      description:
        mode === 'unicode'
          ? 'আধুনিক অ্যাপের জন্য টেক্সট কপি করা হয়েছে।'
          : 'পুরাতন ডিজাইনিং অ্যাপের জন্য টেক্সট কনভার্ট করে কপি করা হয়েছে।',
      color: 'success',
      icon: 'i-lucide-check-circle',
      duration: 2500
    })
  } catch {
    // Clipboard access needs a secure context and can be denied outright.
    toast.add({
      title: 'কপি করা যায়নি',
      description: 'ব্রাউজার ক্লিপবোর্ড ব্লক করেছে। টেক্সট নির্বাচন করে ম্যানুয়ালি কপি করুন।',
      color: 'error',
      icon: 'i-lucide-clipboard-x',
      duration: 4000
    })
  }
}

function toggleLanguage() {
  engine.toggleLanguage()
  editor.value?.commands.focus()
}

const colors = [
  '#000000',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#64748b'
]

watch(engine.isEnglish, newVal => {
  toast.add({
    title: newVal ? 'English Mode' : 'বাংলা মোড',
    description: newVal
      ? 'Standard QWERTY layout active.'
      : `${engine.layout.value.name} লেআউট সক্রিয়।`,
    color: newVal ? 'neutral' : 'primary',
    icon: newVal ? 'i-lucide-languages' : 'i-lucide-type',
    duration: 1800
  })
})

// Accept content pushed in from the outside (e.g. the clear button) without
// stomping on what the user is currently typing.
watch(
  () => props.modelValue,
  newVal => {
    if (editor.value && newVal !== editor.value.getText()) {
      editor.value.commands.setContent(newVal, { emitUpdate: false })
      engine.resetState()
    }
  }
)

defineExpose({ editor })
</script>

<template>
  <div
    class="lekha-editor-container border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden relative transition-all duration-200 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500"
  >
    <div
      v-if="editor"
      class="border-b border-gray-200 dark:border-gray-800 p-2 flex flex-wrap items-center gap-2 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm"
    >
      <div class="flex gap-1 border-r border-gray-200 dark:border-gray-800 pr-2">
        <UTooltip :text="`আনডু (${mod}+Z)`">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-undo-2"
            aria-label="আনডু"
            :disabled="!canUndo"
            @click="editor.chain().focus().undo().run()"
          />
        </UTooltip>
        <UTooltip :text="`রিডু (${mod}+Shift+Z)`">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-redo-2"
            aria-label="রিডু"
            :disabled="!canRedo"
            @click="editor.chain().focus().redo().run()"
          />
        </UTooltip>
      </div>

      <div class="flex gap-1 border-r border-gray-200 dark:border-gray-800 pr-2">
        <UTooltip :text="`বোল্ড (${mod}+B)`">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-bold"
            aria-label="বোল্ড"
            :active="editor.isActive('bold')"
            @click="editor.chain().focus().toggleBold().run()"
          />
        </UTooltip>
        <UTooltip :text="`ইটালিক (${mod}+I)`">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-italic"
            aria-label="ইটালিক"
            :active="editor.isActive('italic')"
            @click="editor.chain().focus().toggleItalic().run()"
          />
        </UTooltip>
        <UPopover>
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-palette"
            aria-label="লেখার রং"
          />
          <template #content>
            <div class="p-2 grid grid-cols-4 gap-1">
              <button
                v-for="color in colors"
                :key="color"
                class="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                :style="{ backgroundColor: color }"
                :aria-label="`রং ${color}`"
                @click="editor.chain().focus().setColor(color).run()"
              />
              <button
                class="col-span-4 text-[10px] uppercase font-bold text-center py-1 mt-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                @click="editor.chain().focus().unsetColor().run()"
              >
                রিসেট
              </button>
            </div>
          </template>
        </UPopover>
      </div>

      <div class="flex gap-2">
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          icon="i-lucide-copy"
          label="ইউনিকোড কপি"
          @click="copyToClipboard('unicode')"
        />
        <UTooltip text="পুরাতন ডিজাইনিং সফটওয়্যারের (Illustrator, InDesign) জন্য">
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            icon="i-lucide-arrow-right-left"
            label="বিজয় কপি"
            @click="copyToClipboard('bijoy')"
          />
        </UTooltip>
      </div>

      <div class="flex-1" />

      <UTooltip :text="`বাংলা ↔ English (${ctrl}+M বা F2)`">
        <UButton
          size="sm"
          :color="engine.isEnglish.value ? 'neutral' : 'primary'"
          variant="subtle"
          :icon="engine.isEnglish.value ? 'i-lucide-languages' : 'i-lucide-type'"
          class="font-mono"
          :aria-pressed="!engine.isEnglish.value"
          @click="toggleLanguage"
        >
          {{ engine.isEnglish.value ? 'ENGLISH' : 'বাংলা' }}
        </UButton>
      </UTooltip>
    </div>

    <EditorContent
      :editor="editor"
      class="lekha-content"
      :style="{ fontSize: `${fontSize || 22}px` }"
    />

    <div
      class="border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/50"
    >
      <div class="flex items-center gap-4">
        <span>{{ wordCount }} শব্দ</span>
        <span>{{ characterCount }} অক্ষর</span>
      </div>
      <div class="hidden sm:flex items-center gap-3">
        <span>{{ engine.layout.value.name }}</span>
        <span class="opacity-60">·</span>
        <span>মুছতে {{ mod }}+{{ alt }}+C</span>
      </div>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="suggestions.length > 0 && isFocused"
          class="fixed z-[100] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-2 max-w-[340px] backdrop-blur-md"
          :style="{ top: `${suggestionPosition.top}px`, left: `${suggestionPosition.left}px` }"
          role="listbox"
          aria-label="যুক্তাক্ষর সাজেশন"
        >
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="(s, index) in suggestions"
              :key="s"
              size="sm"
              color="neutral"
              variant="soft"
              role="option"
              class="text-xl font-medium px-3 h-9"
              :aria-label="`সাজেশন ${s}`"
              @mousedown.prevent="applySuggestion(s)"
            >
              {{ s }}
              <span class="text-[10px] opacity-50 ml-1 font-mono">{{ index + 1 }}</span>
            </UButton>
          </div>
          <p class="text-[10px] text-gray-400 mt-1.5 px-1">১–৯ চেপে নির্বাচন · Esc বাতিল</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.lekha-editor-container :deep(.lekha-surface) {
  /* Unicode Bengali faces only. SutonnyMJ is a legacy ASCII (Bijoy) font and
     renders Unicode Bengali as tofu, so it must never sit in this stack. */
  font-family: 'SolaimanLipi', 'Noto Sans Bengali', 'Anek Bangla', 'Hind Siliguri', sans-serif;
  min-height: 340px;
  padding: 1.25rem 1.5rem;
  line-height: 1.9;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.lekha-editor-container :deep(.lekha-surface p) {
  margin: 0 0 0.65em;
}

.lekha-editor-container :deep(.lekha-surface p:last-child) {
  margin-bottom: 0;
}

/* Placeholder-free empty state still needs a caret target */
.lekha-editor-container :deep(.lekha-surface:focus) {
  outline: none;
}
</style>
