<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed, inject } from "vue";
import { fetchCollectionRequests, fetchCollections, addRequest } from "../../api/client";
import type { Collection } from "../../types/collection";
import type { RequestInput, Request } from "../../types/request";
import eventBus from "../../bus/eventBus";
import SearchBar from "./SearchBar.vue";

const props = defineProps<{
  showSearch: boolean;
}>();

inject('httpClientConfig', {
  baseUrl: 'https://supsi-ticket.cloudns.org/supsi-http-client/bff/',
  showSearch: true,
  showCollections: true
});

const collections = ref<Collection[]>([]);
const requestsMap = reactive<Record<number, Request[]>>({});
const expandedCollections = reactive<Record<number, boolean>>({});
const dropdownOpen = reactive<Record<number, boolean>>({});
const hoveredCollection = ref<number | null>(null);
const hoveredRequest = ref<string | null>(null);
const selectedRequestId = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const searchQuery = ref("");
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarType = ref<"success" | "error" | "info">("success");
const manuallyExpanded = reactive<Record<number, boolean>>({});

function showSnackbar(message: string, type: "success" | "error" | "info" = "success") {
  snackbarMessage.value = message;
  snackbarType.value = type;
  snackbar.value = true;
  setTimeout(() => (snackbar.value = false), 3000);
}

async function loadCollections() {
  try {
    const data = await fetchCollections();
    collections.value = data;
    collections.value.forEach((collection) => {
      if (expandedCollections[collection.id] === undefined) {
        expandedCollections[collection.id] = false;
      }
      dropdownOpen[collection.id] = false;
      loadRequests(collection.id);
    });
  } catch {
    showSnackbar("Error loading collections", "error");
  }
}

async function loadRequests(collectionId: number) {
  if (!requestsMap[collectionId]) {
    try {
      const data = await fetchCollectionRequests(collectionId);
      requestsMap[collectionId] = data;
    } catch {
      requestsMap[collectionId] = [];
      showSnackbar(`Error loading requests for collection ${collectionId}`, "error");
    }
  }
}

function cloneRequest(request: Request): Request {
  const clonedHeaders: Record<string, string[]> = {};
  if (request.headers) {
    Object.entries(request.headers).forEach(([key, values]) => {
      clonedHeaders[key] = Array.isArray(values) ? [...values] : [];
    });
  }
  return {
    id: request.id,
    name: request.name,
    uri: request.uri || "",
    method: request.method || "GET",
    body: request.body || "",
    headers: clonedHeaders,
    collectionId: request.collectionId
  };
}

function handleRequestSaved(savedRequest: Request) {
  if (!savedRequest.collectionId) {
    console.error("Saved request does not have a collectionId");
    return;
  }

  const collectionId = savedRequest.collectionId;

  const existingRequestIndex = requestsMap[collectionId]?.findIndex(r => r.id === savedRequest.id);

  if (existingRequestIndex === -1 || existingRequestIndex === undefined) {
    requestsMap[collectionId] = requestsMap[collectionId] || [];
    requestsMap[collectionId].push(cloneRequest(savedRequest));

    expandedCollections[collectionId] = true;
    manuallyExpanded[collectionId] = true;

    showSnackbar(`Request "${savedRequest.name}" added to collection`, "success");
  } else {
    requestsMap[collectionId][existingRequestIndex] = cloneRequest(savedRequest);
    showSnackbar(`Request "${savedRequest.name}" updated`, "info");
  }
}

async function createNewRequest(collectionId: number) {
  const newRequest: RequestInput = {
    name: "Empty Request",
    uri: "",
    method: "GET",
    headers: {},
    body: "",
  };

  try {
    const created = await addRequest(collectionId, newRequest);

    requestsMap[collectionId] ||= [];
    requestsMap[collectionId].push(created);

    expandedCollections[collectionId] = true;
    manuallyExpanded[collectionId] = true;

    eventBus.emit("request-selected", created);
    selectedRequestId.value = created.id;

    showSnackbar(`Empty request created`, "success");
  } catch (error) {
    console.error("Error creating request:", error);
    showSnackbar("Error creating request", "error");
  }
}

function toggleCollection(collectionId: number) {
  expandedCollections[collectionId] = !expandedCollections[collectionId];
  manuallyExpanded[collectionId] = expandedCollections[collectionId];
}

function toggleDropdown(collectionId: number) {
  dropdownOpen[collectionId] = !dropdownOpen[collectionId];
}

function closeDropdown(collectionId: number) {
  dropdownOpen[collectionId] = false;
}

function emitRequestClicked(request: Request) {
  eventBus.emit("request-selected", request);
  selectedRequestId.value = request.id;
}

function importCollection() {
  fileInput.value?.click();
}

function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result as string;
      const json = JSON.parse(text);
      if (!json.name || !Array.isArray(json.items)) {
        showSnackbar("Invalid JSON structure", "error");
        return;
      }
      
      const newRequests: Request[] = json.items.map((r: any) => ({
        id: r.id,
        name: r.name,
        uri: r.uri,
        method: r.method,
        headers: r.headers,
        body: r.body,
      }));
      
      if (json.id !== undefined && json.id !== null) {
        const existingCollection = collections.value.find((c) => c.id === json.id);
        if (existingCollection) {
          requestsMap[existingCollection.id] = newRequests;
          expandedCollections[existingCollection.id] = true;
          manuallyExpanded[existingCollection.id] = true;
          showSnackbar(`Collection "${existingCollection.name}" updated with new requests`, "success");
          return;
        }
      }
      const existingIds = collections.value.map((c) => c.id);
      let newId = 1;
      while (existingIds.includes(newId)) newId++;
      const newCollection: Collection = {
        id: newId,
        name: json.name,
      };
      collections.value.push(newCollection);
      requestsMap[newCollection.id] = newRequests;
      expandedCollections[newCollection.id] = true;
      manuallyExpanded[newCollection.id] = true;
      showSnackbar(`Collection "${newCollection.name}" imported successfully`, "success");
    } catch {
      showSnackbar("Error parsing JSON file", "error");
    } finally {
      input.value = "";
    }
  };
  reader.readAsText(file);
}

function handleAction(collectionId: number, action: string) {
  if (action === "add_request") {
    createNewRequest(collectionId);
  } else if (action === "export") {
    const collection = collections.value.find((c) => c.id === collectionId);
    const requests = requestsMap[collectionId] || [];
    if (!collection) return;
    const exportData = {
      name: collection.name,
      id: collection.id,
      items: requests,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collection_${collection.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showSnackbar("JSON file exported successfully", "success");
  }
  dropdownOpen[collectionId] = false;
}

function handleRequestDeleted(payload: { collectionId: number; requestId: string }) {
  const { collectionId, requestId } = payload;
  requestsMap[collectionId] = requestsMap[collectionId].filter(r => r.id !== requestId);
  console.log(`Request ${requestId} removed from collection ${collectionId} in Sidebar`);
  if (selectedRequestId.value === requestId) {
    selectedRequestId.value = null;
  }
  showSnackbar("Request deleted successfully", "success");
}

function updateSearchQuery(query: string) {
  searchQuery.value = query;
}

function handleRequestSelected(request: Request) {
  selectedRequestId.value = request.id;
}

onMounted(() => {
  loadCollections();
  eventBus.on("request-deleted", handleRequestDeleted);
  eventBus.on("request-saved", handleRequestSaved);
  eventBus.on("request-selected", handleRequestSelected);
});

onUnmounted(() => {
  eventBus.off("request-deleted", handleRequestDeleted);
  eventBus.off("request-saved", handleRequestSaved);
  eventBus.off("request-selected", handleRequestSelected);
});

const filteredCollections = computed(() => {
  if (!searchQuery.value.trim() || !props.showSearch) {
    return collections.value.map((collection) => ({
      ...collection,
      requests: requestsMap[collection.id] || [],
    }));
  }

  return collections.value
    .map((collection) => {
      const matches = collection.name.toLowerCase().includes(searchQuery.value.toLowerCase());
      const matchingRequests =
        requestsMap[collection.id]?.filter((r) =>
          r.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        ) || [];

      if (matches || matchingRequests.length > 0) {
        expandedCollections[collection.id] = true;
        return {
          ...collection,
          requests: matches ? requestsMap[collection.id] || [] : matchingRequests,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<Collection & { requests: Request[] }>;
});

const noResults = computed(() => searchQuery.value.trim() !== "" && filteredCollections.value.length === 0 && props.showSearch);
</script>

<template>
  <div class="sidebar-container">
    <SearchBar v-if="showSearch" :initial-query="searchQuery" @update:query="updateSearchQuery" />

    <div class="px-4 py-3 bg-base-300 flex justify-between items-center border-b border-base-300">
      <h2 class="text-base font-semibold">Collections</h2>
      <div class="flex gap-x-1">
        <button @click="importCollection"
          class="btn btn-secondary btn-sm w-6 h-6 min-h-0 p-0 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 20h14v-2H5v2zM19 8h-4V4h-6v4H5l7 7 7-7z" />
          </svg>
        </button>
        <input type="file" ref="fileInput" accept=".json" class="hidden" @change="handleFileImport" />
      </div>
    </div>
    <div v-if="noResults" class="flex flex-col items-center text-center p-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-gray-400" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
      <p class="text-lg font-semibold text-gray-700 mt-4">No results found for "{{ searchQuery }}"</p>
      <p class="text-gray-500 text-sm mt-2">Please try again using different keywords, and don't forget to check for
        typos.</p>
    </div>
    <ul v-else class="p-2 m-0 list-none overflow-visible">
      <li v-for="collection in filteredCollections" :key="collection.id" class="collection-container mb-2 group"
        @mouseenter="hoveredCollection = collection.id" @mouseleave="hoveredCollection = null">
        <div class="flex justify-between items-center px-3 py-2">
          <span class="font-medium text-sm flex-grow cursor-pointer" @click="toggleCollection(collection.id)">
            {{ collection.name }}
          </span>
          <div class="relative w-6">
            <button
              v-if="hoveredCollection === collection.id || dropdownOpen[collection.id] || expandedCollections[collection.id]"
              @click="toggleDropdown(collection.id)"
              class="w-6 h-6 flex items-center justify-center rounded-full bg-base-100 hover:bg-gray-300 active:bg-gray-400 transition-colors">
              <span class="text-xs">•••</span>
            </button>
            <ul v-if="dropdownOpen[collection.id]"
              class="absolute right-0 top-full mt-1 bg-white shadow-lg border rounded-md w-24 text-sm z-50"
              @mouseleave="closeDropdown(collection.id)">
              <li @click="handleAction(collection.id, 'add_request')"
                class="px-4 py-2 hover:bg-gray-100 cursor-pointer">Add Request</li>
              <li @click="handleAction(collection.id, 'export')" class="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                Export</li>
            </ul>
          </div>
        </div>
        <div v-if="expandedCollections[collection.id]" class="transition-all duration-300">
          <div class="py-1">
            <div v-for="(request, index) in collection.requests" :key="request.id" :class="[
              'py-1 grid grid-cols-[4rem_1fr] items-center group px-2 transition-colors duration-150 cursor-pointer',
              selectedRequestId === request.id ? 'bg-white' : 'bg-gray-100',
              hoveredRequest === request.id ? 'bg-gray-200' : 'hover:bg-gray-100',
              index > 0 ? 'border-t border-gray-200' : ''
            ]" @mouseenter="hoveredRequest = request.id" @mouseleave="hoveredRequest = null"
              @click="emitRequestClicked(request)">
              <span class="text-xs font-semibold px-1.5 py-0.5 rounded text-left"
                :class="'method-' + request.method.toLowerCase()">
                {{ request.method }}
              </span>
              <span class="text-sm text-base-content truncate">
                {{ request.name }}
              </span>
            </div>
          </div>
        </div>
      </li>
    </ul>
    <div v-if="snackbar" :class="[
      'snackbar',
      {
        'snackbar-success': snackbarType === 'success',
        'snackbar-error': snackbarType === 'error',
        'snackbar-info': snackbarType === 'info'
      }
    ]">
      {{ snackbarMessage }}
    </div>
  </div>
</template>