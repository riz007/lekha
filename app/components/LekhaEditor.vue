<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { LekhaInput } from '../extensions/LekhaInput'
import { useLekhaEngine } from '../composables/useLekhaEngine'
import type { LayoutId } from '../types/lekha'
import { CONJUNCT_SUGGESTIONS, COMMON_PHONETIC_SUGGESTIONS } from '../constants/predictive'
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

const engine = useLekhaEngine(props.layoutId, props.modelValue)
const toast = useToast()

watch(() => props.layoutId, (newId) => {
  engine.setLayout(newId)
})

watch(() => props.smartBackspace, (newVal) => {
  if (newVal !== undefined) {
    engine.preferences.smartBackspace = newVal
  }
})

const suggestions = ref<string[]>([])
const suggestionPosition = ref({ top: 0, left: 0 })

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    TextStyle,
    Color,
    LekhaInput.configure({
      engine,
    }),
  ],
  onUpdate: ({ editor }) => {
    const text = editor.getText()
    emit('update:modelValue', text)
    updateSuggestions(editor)
  },
  onSelectionUpdate: ({ editor }) => {
    updateSuggestions(editor)
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[400px]',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Bengali editor',
    },
  },
})

function updateSuggestions(editorInstance: any) {
  const { view, state } = editorInstance
  const { selection } = state
  const { from } = selection
  
  if (from === 0) {
    suggestions.value = []
    return
  }

  const $pos = state.doc.resolve(from)
  const textBefore = $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 2), $pos.parentOffset)
  
  if (!textBefore) {
    suggestions.value = []
    return
  }

  const lastChar = textBefore[textBefore.length - 1]
  const lastTwo = textBefore.slice(-2)
  
  let match: string[] | undefined
  
  if (lastChar === '্' && textBefore.length > 1) {
    match = CONJUNCT_SUGGESTIONS[textBefore.slice(-2) as keyof typeof CONJUNCT_SUGGESTIONS]
  } else if (lastTwo && CONJUNCT_SUGGESTIONS[lastTwo as keyof typeof CONJUNCT_SUGGESTIONS]) {
    match = CONJUNCT_SUGGESTIONS[lastTwo as keyof typeof CONJUNCT_SUGGESTIONS]
  }
  
  if (!match && engine.layout.value.id === 'avro') {
     const buffer = engine.buffer.value
     if (buffer.length > 0) {
        const lastTyped = buffer[buffer.length - 1] as keyof typeof COMMON_PHONETIC_SUGGESTIONS
        match = COMMON_PHONETIC_SUGGESTIONS[lastTyped]
     }
  }

  if (match) {
    suggestions.value = match
    const coords = view.coordsAtPos(from)
    suggestionPosition.value = {
      top: coords.top + window.scrollY + 32,
      left: coords.left + window.scrollX
    }
  } else {
    suggestions.value = []
  }
}

function applySuggestion(suggestion: string) {
  if (!editor.value) return
  
  const { state } = editor.value
  const { selection } = state
  const { from } = selection
  
  const $pos = state.doc.resolve(from)
  let replaceFrom = from - 1 
  
  const textBefore = $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 2), $pos.parentOffset)
  if (textBefore.endsWith('্')) {
     replaceFrom = from - 2
  }

  editor.value.chain().focus().insertContentAt({ from: replaceFrom, to: from }, suggestion).run()
  suggestions.value = []
}

function copyToClipboard(mode: 'unicode' | 'bijoy') {
  if (!editor.value) return
  const text = editor.value.getText()
  const toCopy = mode === 'unicode' ? safeCopy(text) : convertToBijoy(text)
  
  navigator.clipboard.writeText(toCopy).then(() => {
    toast.add({
      title: mode === 'unicode' ? 'ইউনিকোড কপি হয়েছে' : 'বিজয় কপি হয়েছে',
      description: mode === 'unicode' 
        ? 'আধুনিক অ্যাপের জন্য টেক্সট কপি করা হয়েছে।' 
        : 'পুরাতন ডিজাইনিং অ্যাপের জন্য টেক্সট কনভার্ট করে কপি করা হয়েছে।',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  })
}

const colors = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
]

watch(engine.isEnglish, (newVal) => {
  toast.add({
    title: newVal ? 'English Mode' : 'বাংলা মোড',
    description: newVal ? 'Standard QWERTY layout active.' : `${engine.layout.value.name} লেআউট সক্রিয়।`,
    color: newVal ? 'neutral' : 'primary',
    icon: newVal ? 'i-lucide-languages' : 'i-lucide-type',
    duration: 2000
  })
})

// Sync external modelValue changes back to editor if needed
watch(() => props.modelValue, (newVal) => {
  if (editor.value && newVal !== editor.value.getText()) {
    editor.value.commands.setContent(newVal, { emitUpdate: false })
  }
})

defineExpose({
  editor
})
</script>

<template>
  <div 
    class="lekha-editor-container border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 shadow-sm overflow-hidden relative transition-all duration-200 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500"
    :style="{ fontSize: `${fontSize || 18}px` }"
  >
    <div v-if="editor" class="border-b border-gray-200 dark:border-gray-800 p-2 flex flex-wrap items-center gap-2 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div class="flex gap-1 border-r border-gray-200 dark:border-gray-800 pr-2">
        <UTooltip text="Bold (Ctrl+B)">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-bold"
            aria-label="Toggle Bold"
            :active="editor.isActive('bold')"
            @click="editor.chain().focus().toggleBold().run()"
          />
        </UTooltip>
        <UTooltip text="Italic (Ctrl+I)">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-italic"
            aria-label="Toggle Italic"
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
            aria-label="Text Color"
          />
          <template #content>
            <div class="p-2 grid grid-cols-4 gap-1">
              <button
                v-for="color in colors"
                :key="color"
                class="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                :style="{ backgroundColor: color }"
                @click="editor.chain().focus().setColor(color).run()"
              />
              <button
                class="col-span-4 text-[10px] uppercase font-bold text-center py-1 mt-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                @click="editor.chain().focus().unsetColor().run()"
              >
                Reset Color
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
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-right-left"
          label="বিজয় কপি"
          @click="copyToClipboard('bijoy')"
        />
      </div>

      <div class="flex-1" />

      <div class="flex items-center gap-2 px-2">
        <span class="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Mode</span>
        <UBadge 
          variant="subtle" 
          :color="engine.isEnglish.value ? 'neutral' : 'primary'"
          class="font-mono px-2"
        >
          {{ engine.isEnglish.value ? 'ENGLISH' : 'BANGLA' }}
        </UBadge>
      </div>
    </div>
    
    <EditorContent :editor="editor" class="p-4" />

    <!-- Suggestions Tooltip -->
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
          v-if="suggestions.length > 0"
          class="absolute z-[100] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-2 flex flex-wrap gap-2 max-w-[320px] backdrop-blur-md"
          :style="{ top: `${suggestionPosition.top}px`, left: `${suggestionPosition.left}px` }"
          role="listbox"
          aria-label="Conjunct suggestions"
        >
          <UButton
            v-for="(s, index) in suggestions"
            :key="s"
            size="sm"
            color="neutral"
            variant="soft"
            class="text-xl font-medium px-4 h-10 hover:scale-105 transition-transform"
            :aria-label="`Suggest ${s}`"
            @click="applySuggestion(s)"
          >
            {{ s }}
            <span class="text-[10px] opacity-50 ml-1 font-mono">{{ index + 1 }}</span>
          </UButton>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.lekha-editor-container :deep(.ProseMirror) {
  font-family: 'SolaimanLipi', 'SutonnyMJ', sans-serif;
  min-height: 400px;
}

/* Custom Scrollbar for the map and tooltips */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.dark ::-webkit-scrollbar-thumb {
  background: #1e293b;
}
</style>
