<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
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
    StarterKit.configure({
      // history is already included in StarterKit
    }),
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
    },
  },
})

function updateSuggestions(editor: any) {
  const { view, state } = editor
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
      top: coords.top + window.scrollY + 28,
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
  
  navigator.clipboard.writeText(toCopy)
}

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
    class="lekha-editor-container border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 overflow-hidden relative"
    :style="{ fontSize: `${fontSize || 18}px` }"
  >
    <div v-if="editor" class="border-b border-gray-200 dark:border-gray-800 p-2 flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-900/50">
      <div class="flex gap-1 border-r border-gray-200 dark:border-gray-800 pr-2">
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-bold"
          :active="editor.isActive('bold')"
          @click="editor.chain().focus().toggleBold().run()"
        />
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-italic"
          :active="editor.isActive('italic')"
          @click="editor.chain().focus().toggleItalic().run()"
        />
      </div>

      <div class="flex gap-2">
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          icon="i-lucide-copy"
          @click="copyToClipboard('unicode')"
        >
          Copy Unicode
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-right-left"
          @click="copyToClipboard('bijoy')"
        >
          Copy Bijoy
        </UButton>
      </div>

      <div class="flex-1" />

      <UBadge variant="subtle" :color="engine.isEnglish.value ? 'neutral' : 'primary'">
        {{ engine.isEnglish.value ? 'EN' : 'BN' }}
      </UBadge>
    </div>
    
    <EditorContent :editor="editor" class="p-4" />

    <!-- Suggestions Tooltip -->
    <Teleport to="body">
      <div 
        v-if="suggestions.length > 0"
        class="absolute z-[100] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-xl p-2 flex flex-wrap gap-2 max-w-[300px]"
        :style="{ top: `${suggestionPosition.top}px`, left: `${suggestionPosition.left}px` }"
      >
        <UButton
          v-for="s in suggestions"
          :key="s"
          size="sm"
          color="neutral"
          variant="soft"
          class="text-xl font-medium px-4 h-10"
          @click="applySuggestion(s)"
        >
          {{ s }}
        </UButton>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.lekha-editor-container :deep(.ProseMirror) {
  font-family: 'SolaimanLipi', 'SutonnyMJ', sans-serif;
  min-height: 400px;
}
</style>
