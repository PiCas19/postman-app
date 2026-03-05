<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  headers: Record<string, string[]>
}>();

const emit = defineEmits(['update:headers']);

const headersArray = ref<{
  key: string;
  values: string[];
  isExpanded: boolean;
}[]>([]);

const initializeHeaders = () => {
  const initialHeaders: { key: string; values: string[]; isExpanded: boolean }[] = [];

  if (props.headers && Object.keys(props.headers).length > 0) {
    Object.entries(props.headers).forEach(([key, values]) => {
      initialHeaders.push({
        key,
        values: values.length > 0 ? [...values] : [""],
        isExpanded: false
      });
    });
  }

  headersArray.value = initialHeaders;
};

initializeHeaders();

watch(
  () => props.headers,
  (newHeaders) => {
    if (JSON.stringify(convertToHeadersRecord()) !== JSON.stringify(newHeaders)) {
      initializeHeaders();
    }
  },
  { deep: true }
);

const convertToHeadersRecord = () => {
  const updatedHeaders: Record<string, string[]> = {};

  headersArray.value.forEach(header => {
    if (header.key.trim()) {
      updatedHeaders[header.key] = header.values.filter(v => v !== undefined && v !== null && v !== "");
      if (updatedHeaders[header.key].length === 0) {
        updatedHeaders[header.key] = [""];
      }
    }
  });

  return updatedHeaders;
};

const emitHeadersUpdate = () => {
  const updatedHeaders = convertToHeadersRecord();
  emit('update:headers', updatedHeaders);
};

const addRow = () => {
  headersArray.value = [...headersArray.value, {
    key: "",
    values: [""],
    isExpanded: true
  }];
  emitHeadersUpdate();
};

const removeRow = (index: number) => {
  const newHeaders = [...headersArray.value];
  newHeaders.splice(index, 1);


  headersArray.value = newHeaders;
  emitHeadersUpdate();
};

const addValueToHeader = (headerIndex: number) => {
  const header = headersArray.value[headerIndex];
  const newValues = [...header.values, ""];

  const updatedHeaders = [...headersArray.value];
  updatedHeaders[headerIndex] = {
    ...header,
    values: newValues
  };

  headersArray.value = updatedHeaders;
  emitHeadersUpdate();
};

const removeValueFromHeader = (headerIndex: number, valueIndex: number) => {
  const header = headersArray.value[headerIndex];

  if (header.values.length <= 1) return;

  const newValues = [...header.values];
  newValues.splice(valueIndex, 1);

  const updatedHeaders = [...headersArray.value];
  updatedHeaders[headerIndex] = {
    ...header,
    values: newValues
  };

  headersArray.value = updatedHeaders;
  emitHeadersUpdate();
};

const updateHeaderKey = (headerIndex: number, newKey: string) => {
  const updatedHeaders = [...headersArray.value];
  updatedHeaders[headerIndex] = {
    ...updatedHeaders[headerIndex],
    key: newKey
  };

  headersArray.value = updatedHeaders;
  emitHeadersUpdate();
};

const updateHeaderValue = (headerIndex: number, valueIndex: number, newValue: string) => {
  const header = headersArray.value[headerIndex];
  const newValues = [...header.values];
  newValues[valueIndex] = newValue;

  const updatedHeaders = [...headersArray.value];
  updatedHeaders[headerIndex] = {
    ...header,
    values: newValues
  };

  headersArray.value = updatedHeaders;
  emitHeadersUpdate();
};

const toggleExpand = (headerIndex: number) => {
  const updatedHeaders = [...headersArray.value];
  updatedHeaders[headerIndex] = {
    ...updatedHeaders[headerIndex],
    isExpanded: !updatedHeaders[headerIndex].isExpanded
  };

  headersArray.value = updatedHeaders;
};

</script>

<template>
  <div class="p-4 border rounded-md bg-white shadow">
    <h3 class="text-lg font-medium mb-4">Request Headers</h3>

    <div v-if="headersArray.length > 0" class="mb-4 bg-gray-50 rounded-lg border overflow-hidden">
      <div v-for="(header, headerIndex) in headersArray" :key="headerIndex" class="border-b last:border-b-0">
        <div class="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
          @click="toggleExpand(headerIndex)">
          <div class="flex items-center space-x-2">

            <div class="text-gray-400 transition-transform duration-200"
              :class="{ 'transform rotate-90': header.isExpanded }">
              ⏵
            </div>

            <div class="flex items-center">
              <div v-if="header.key" class="font-medium">{{ header.key }}</div>
              <div v-else class="italic text-gray-400 text-sm">New Header</div>

              <div class="ml-2 text-xs text-gray-500">
                <span v-if="header.values.length > 0 && header.values[0]">
                  {{ header.values.join(', ').length > 30
                    ? header.values.join(', ').substring(0, 30) + '...'
                    : header.values.join(', ') }}
                </span>
                <span v-else class="italic">No values</span>
              </div>
            </div>
          </div>

          <div class="flex items-center">
            <button @click.stop="removeRow(headerIndex)" class="p-1 text-gray-500 hover:text-red-500 rounded"
              title="Remove this header">
              ✖
            </button>
          </div>
        </div>

        <div v-if="header.isExpanded" class="p-3 border-t bg-white">
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Header Name</label>
            <input :value="header.key" @input="updateHeaderKey(headerIndex, ($event.target as HTMLInputElement).value)"
              class="form-input" placeholder="Enter header name" />
          </div>

          <div class="mb-2">
            <div class="flex justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">Values</label>
              <button @click="addValueToHeader(headerIndex)"
                class="text-xs px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                title="Add another value for this header">
                + Add Value
              </button>
            </div>

            <div v-for="(value, valueIndex) in header.values" :key="valueIndex" class="flex items-center mb-2">
              <input :value="value"
                @input="updateHeaderValue(headerIndex, valueIndex, ($event.target as HTMLInputElement).value)"
                class="form-input flex-grow" placeholder="Enter value" />

              <button v-if="header.values.length > 1" @click="removeValueFromHeader(headerIndex, valueIndex)"
                class="ml-2 p-1 text-gray-500 hover:text-red-500 rounded" title="Remove this value">
                ✖
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between">
      <button @click="addRow" class="btn-primary">
        <span class="mr-1">+</span> Add Header
      </button>
    </div>
  </div>
</template>