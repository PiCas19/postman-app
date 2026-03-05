<script setup lang="ts">
import { ref, watchEffect } from 'vue';

const props = defineProps<{
  initialQuery?: string;
}>();

const emit = defineEmits<{
  'update:query': [query: string]
}>();

const searchQuery = ref(props.initialQuery || '');

watchEffect(() => {
  emit('update:query', searchQuery.value);
});
</script>

<template>
  <div class="p-2">
    <input v-model="searchQuery" placeholder="Search collections or requests..." class="searchbar-container" />
  </div>
</template>