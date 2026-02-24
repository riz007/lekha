<template>
  <div v-if="suggestion" class="ghost-text-tooltip">
    {{ suggestion }}
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLekhaEngine } from '../composables/useLekhaEngine'

const engine = useLekhaEngine()
const suggestion = ref<string | null>(null)

// Dummy frequency dictionary for demo
const frequencyDict = {
  ক্ত: 'ক্ত',
  গ্ন: 'গ্ন',
  স্ত: 'স্ত',
  শ্চ: 'শ্চ',
}

watch(engine.text, val => {
  // Find last cluster
  const clusters = val.match(/([ক-হড়ঢ়য়ৎ][্][ক-হড়ঢ়য়ৎ])/g)
  if (clusters && clusters.length > 0) {
    const last = clusters[clusters.length - 1] as keyof typeof frequencyDict
    suggestion.value = frequencyDict[last] || null
  } else {
    suggestion.value = null
  }
})
</script>

<style scoped>
.ghost-text-tooltip {
  position: absolute;
  background: #fff;
  border: 1px solid #ccc;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 1rem;
  z-index: 100;
}
</style>
