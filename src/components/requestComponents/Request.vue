<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import eventBus from "../../bus/eventBus";
import type { Request } from "../../types/request";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const selectedRequest = ref<Request | null>(null);
const liveRequest = ref<Request | null>(null);

const selectedMethod = ref("GET");
const selectedUrl = ref("");
const originalMethod = ref("");
const originalUrl = ref("");
const isRequestModified = ref(false);

const selectedMethodClass = computed(() => {
  return `method-${selectedMethod.value.toLowerCase()}`;
});

function handleRequestSelected(request: Request) {
  selectedRequest.value = { ...request };
  selectedMethod.value = request.method || "GET";
  selectedUrl.value = request.uri || "";
  originalMethod.value = request.method || "GET";
  originalUrl.value = request.uri || "";
  isRequestModified.value = false;
}

function handleLiveUpdate(request: Request) {
  liveRequest.value = { ...request };
}

function updateRequestData() {
  if (selectedRequest.value) {
    const method = selectedMethod.value;
    const url = selectedUrl.value;
    const modified = method !== originalMethod.value || url !== originalUrl.value;
    
    isRequestModified.value = modified;
    
    const modifiedRequest = {
      ...selectedRequest.value,
      method,
      uri: url
    };
    
    eventBus.emit("request-modified", modifiedRequest);
  }
}

function handleRequestSubmitted() {
  if (!selectedUrl.value.trim()) {
    eventBus.emit("request-error", new Error("Please enter a valid URL"));
    return;
  }

  const currentRequest = {
    id: "temp-" + Date.now(),
    name: "Ad-hoc Request",
    method: selectedMethod.value,
    uri: selectedUrl.value.trim(),
    headers: liveRequest.value?.headers || {},
    body: liveRequest.value?.body || "",
    collectionId: 0
  };

  console.log("Sending request from NavBar:", {
    method: currentRequest.method,
    url: currentRequest.uri,
    headers: currentRequest.headers,
    body: currentRequest.body
  });

  eventBus.emit("request-submitted", currentRequest);
}

watch([selectedMethod, selectedUrl], () => {
  updateRequestData();
}, { deep: true });

onMounted(() => {
  eventBus.on("request-selected", handleRequestSelected);
  eventBus.on("live-request-update", handleLiveUpdate);
});

onUnmounted(() => {
  eventBus.off("request-selected", handleRequestSelected);
  eventBus.off("live-request-update", handleLiveUpdate);
});
</script>

<template>
  <div class="navbar bg-base-200 shadow-lg p-4 flex items-center justify-between">
    <div class="flex items-center space-x-4 flex-grow justify-center">
      <select
        class="form-select w-32 cursor-pointer focus:outline-none"
        v-model="selectedMethod"
        :class="selectedMethodClass"
      >
        <option v-for="method in HTTP_METHODS" :key="method" :value="method" 
                :class="['method-' + method.toLowerCase(), 'cursor-pointer']">
          {{ method }}
        </option>
      </select>
      <input
        type="url"
        v-model="selectedUrl"
        class="form-input flex-grow focus:outline-none"
        required
        placeholder="https://example.com"
        pattern="^(https?:\/\/)?([a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,})(\/.*)?$"
        title="Must be a valid URL"
      />
      <button 
        @click="handleRequestSubmitted()" 
        class="btn-primary"
      >
        Send
      </button>
    </div>
  </div>
</template> 