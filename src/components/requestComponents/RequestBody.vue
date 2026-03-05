<script setup lang="ts">

import { ref, watch } from "vue";

const props = defineProps<{
  body: string;
}>();

const emit = defineEmits<{
  'update:body': [body: string]
}>();

const localBody = ref(props.body || "");

watch(
  () => props.body,
  (newValue) => {
    if (localBody.value !== newValue) {
      localBody.value = newValue || "";
    }
  },
  { immediate: true }
);


const updateBody = () => {
  emit('update:body', localBody.value);
};

const formatJSON = () => {
  try {
    const parsed = JSON.parse(localBody.value);
    localBody.value = JSON.stringify(parsed, null, 2);
    updateBody();
  } catch (e) {
  }
};

const clearBody = () => {
  localBody.value = "";
  updateBody();
};
</script>

<template>
  <div class="p-4 border rounded-md bg-white">
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-lg font-medium">Request Body</h3>

      <div class="flex gap-2">

        <button @click="formatJSON" class="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm"
          title="Format JSON">
          Format
        </button>

        <button @click="clearBody" class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
          title="Clear body">
          Clear
        </button>
      </div>
    </div>

    <textarea v-model="localBody" @input="updateBody"
      class="w-full h-48 p-2 border rounded font-mono text-sm resize-none focus:outline-none focus:ring focus:border-blue-300"
      placeholder="Enter request body here..."></textarea>
  </div>
</template>