<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import eventBus from "../../bus/eventBus";
import type { Request } from "../../types/request";
import HeaderOptions from "../requestComponents/HeaderOptions.vue";
import RequestBody from "../requestComponents/RequestBody.vue";
import ResponsePreview from "../requestComponents/ResponsePreview.vue";
import NavBar from "../requestComponents/Request.vue";
import { updateRequest, deleteRequest, addRequest, fetchRequest } from "../../api/client";

const selectedRequest = ref<Request | null>(null);
const originalRequest = ref<Request | null>(null);
const currentHeaders = ref<Record<string, string[]>>({});
const currentBody = ref<string>("");
const isEmittingUpdate = ref(false);
const isEditingName = ref(false);
const editedName = ref("");
const showSaveModal = ref(false);
const isRequestChanged = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref("");
const snackbarType = ref<"success" | "error" | "info">("success");
const showActionsMenu = ref(false);

const currentRequest = computed<Request>(() => {
  return selectedRequest.value || {
    id: "",
    name: "",
    uri: "",
    method: "GET",
    body: currentBody.value,
    headers: currentHeaders.value,
    collectionId: 0
  };
});

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

function showSnackbar(message: string, type: "success" | "error" | "info" = "success") {
  snackbarMessage.value = message;
  snackbarType.value = type;
  snackbar.value = true;
  setTimeout(() => (snackbar.value = false), 3000);
}

function emitLiveUpdate() {
  if (selectedRequest.value) {
    eventBus.emit("live-request-update", cloneRequest(selectedRequest.value));
  }
}

function checkForChanges() {
  if (!selectedRequest.value || !originalRequest.value) {
    isRequestChanged.value = false;
    return;
  }

  const current = selectedRequest.value;
  const original = originalRequest.value;

  if (current.uri !== original.uri || 
      current.method !== original.method) {
    isRequestChanged.value = true;
    return;
  }

  if (current.body !== original.body) {
    try {
      const currentJson = JSON.parse(current.body || '{}');
      const originalJson = JSON.parse(original.body || '{}');
      const areJsonEqual = JSON.stringify(currentJson) === JSON.stringify(originalJson);

      if (!areJsonEqual) {
        isRequestChanged.value = true;
        return;
      }
    } catch (e) {
      isRequestChanged.value = true;
      return;
    }
  }

  const currentHeaderKeys = Object.keys(current.headers || {});
  const originalHeaderKeys = Object.keys(original.headers || {});

  if (currentHeaderKeys.length !== originalHeaderKeys.length) {
    isRequestChanged.value = true;
    return;
  }

  for (const key of currentHeaderKeys) {
    const currentValues = current.headers[key];
    const originalValues = original.headers[key];

    if (!originalValues) {
      isRequestChanged.value = true;
      return;
    }

    if (currentValues.length !== originalValues.length) {
      isRequestChanged.value = true;
      return;
    }

    for (let i = 0; i < currentValues.length; i++) {
      if (currentValues[i] !== originalValues[i]) {
        isRequestChanged.value = true;
        return;
      }
    }
  }

  isRequestChanged.value = false;
}

function handleRequestSelected(request: Request) {
  const clonedRequest = cloneRequest(request);
  const originalClone = cloneRequest(request);

  if (clonedRequest.body) {
    try {
      const parsedJson = JSON.parse(clonedRequest.body);
      const formattedBody = JSON.stringify(parsedJson, null, 2);

      clonedRequest.body = formattedBody;
      originalClone.body = formattedBody;
    } catch (e) {
    }
  }

  selectedRequest.value = clonedRequest;
  originalRequest.value = originalClone;
  currentHeaders.value = clonedRequest.headers || {};
  currentBody.value = clonedRequest.body || "";
  isRequestChanged.value = false;

  emitLiveUpdate();
}

function handleRequestModified(modifiedRequest: Request) {
  if (!selectedRequest.value) return;
  if (selectedRequest.value.id !== modifiedRequest.id) return;
  const current = selectedRequest.value;
  
  if (current.uri !== modifiedRequest.uri || current.method !== modifiedRequest.method) {
    selectedRequest.value = {
      ...current,
      uri: modifiedRequest.uri,
      method: modifiedRequest.method
    };
    checkForChanges();
    emitLiveUpdate();
  }
}

function updateBody(value: string) {
  currentBody.value = value;
  if (selectedRequest.value && !isEmittingUpdate.value) {
    selectedRequest.value.body = value;
    isEmittingUpdate.value = true;
    checkForChanges();
    emitLiveUpdate();
    setTimeout(() => (isEmittingUpdate.value = false), 0);
  }
}

function updateHeaders(value: Record<string, string[]>) {
  currentHeaders.value = value;
  if (selectedRequest.value && !isEmittingUpdate.value) {
    selectedRequest.value.headers = value;
    isEmittingUpdate.value = true;
    checkForChanges();
    emitLiveUpdate();
    setTimeout(() => (isEmittingUpdate.value = false), 0);
  }
}

function startEditingName() {
  if (!selectedRequest.value) return;
  editedName.value = selectedRequest.value.name;
  isEditingName.value = true;
}

async function saveEditedName() {
  if (!selectedRequest.value || !editedName.value.trim()) {
    isEditingName.value = false;
    return;
  }
  const oldName = selectedRequest.value.name;
  const newName = editedName.value.trim();
  selectedRequest.value.name = newName;
  isEditingName.value = false;

  if (oldName !== newName) {
    await saveRequestOverride();
  }

  emitLiveUpdate();
}

function saveRequest() {
  if (!selectedRequest.value) return;

  saveRequestOverride();
}

function toggleActionsMenu() {
  showActionsMenu.value = !showActionsMenu.value;
}

function closeActionsMenu() {
  showActionsMenu.value = false;
}

async function saveRequestOverride() {
  const req = selectedRequest.value;
  if (!req || typeof req.collectionId !== 'number') {
    console.error("selectedRequest or collectionId is invalid");
    showSaveModal.value = false;
    return;
  }

  try {
    const formattedHeaders: Record<string, string[]> = {};
    Object.entries(req.headers || {}).forEach(([key, values]) => {
      if (key.trim() !== "" && values && values.length > 0) {
        formattedHeaders[key] = values;
      }
    });

    const requestToSave: Request & { collectionId: number } = {
      ...req,
      collectionId: req.collectionId,
      headers: formattedHeaders,
    };

    const updated = await updateRequest(req.id, requestToSave);
    console.log("Request saved successfully", updated);
    originalRequest.value = cloneRequest(requestToSave);
    isRequestChanged.value = false;
    eventBus.emit("request-saved", cloneRequest(requestToSave));
    showSnackbar("Request updated successfully", "success");
  } catch (error) {
    console.error("Error saving request:", error);
    showSnackbar("Error updating request", "error");
  }
  showSaveModal.value = false;
}

async function saveRequestAsNew() {
  const req = selectedRequest.value;
  if (!req || typeof req.collectionId !== 'number') {
    console.error("selectedRequest or collectionId is invalid");
    closeActionsMenu();
    return;
  }

  try {
    const formattedHeaders: Record<string, string[]> = {};
    Object.entries(req.headers || {}).forEach(([key, values]) => {
      if (key.trim() !== "" && values && values.length > 0) {
        formattedHeaders[key] = values;
      }
    });

    const requestToCreate = {
      name: req.name + " (Copy)",
      uri: req.uri,
      method: req.method,
      headers: formattedHeaders,
      body: req.body,
    };

    const created = await addRequest(req.collectionId, requestToCreate);
    console.log("New request created successfully", created);
    selectedRequest.value = cloneRequest(created);
    originalRequest.value = cloneRequest(created);
    isRequestChanged.value = false;
    eventBus.emit("request-saved", created);
    eventBus.emit("request-selected", cloneRequest(created));
    showSnackbar("New request created successfully", "success");
  } catch (error) {
    console.error("Error creating new request:", error);
    showSnackbar("Error creating new request", "error");
  }

  closeActionsMenu();
}

async function removeRequest() {
  if (!selectedRequest.value || selectedRequest.value.collectionId === undefined) {
    console.error("selectedRequest or collectionId is undefined");
    closeActionsMenu();
    return;
  }

  try {
    await deleteRequest(selectedRequest.value.id);
    console.log("Request deleted successfully");
    eventBus.emit("request-deleted", {
      collectionId: selectedRequest.value.collectionId,
      requestId: selectedRequest.value.id
    });
    selectedRequest.value = null;
    originalRequest.value = null;
    isRequestChanged.value = false;
    showSnackbar("Request deleted successfully", "success");
  } catch (error) {
    console.error("Error deleting request:", error);
    showSnackbar("Error deleting request", "error");
  }

  closeActionsMenu();
}

async function handleRequestSubmitted(request?: Request) {
  console.log("Current state before assembling request:");
  console.log("From NavBar (request parameter):", request);
  console.log("Current headers:", currentHeaders.value);
  console.log("Current body:", currentBody.value);
  console.log("Selected request:", selectedRequest.value);
  console.log("Current request computed:", currentRequest.value);

  const requestToSend = request ? {
    ...request,
    headers: currentHeaders.value,
    body: currentBody.value
  } : (selectedRequest.value ? {
    ...selectedRequest.value,
    method: selectedRequest.value.method || "GET",
    uri: selectedRequest.value.uri || "",
    headers: selectedRequest.value.headers || {},
    body: selectedRequest.value.body || "",
  } : {
    id: "temp-" + Date.now(),
    name: "Ad-hoc Request",
    method: "GET",
    uri: "",
    headers: currentHeaders.value,
    body: currentBody.value,
    collectionId: 0
  });

  if (!requestToSend.uri.trim()) {
    showSnackbar("Please enter a valid URL", "error");
    return;
  }

  console.log("Final request being sent to server:", {
    method: requestToSend.method,
    url: requestToSend.uri,
    headers: requestToSend.headers,
    body: requestToSend.body
  });

  try {
    const startTime = performance.now();
    eventBus.emit("request-start", startTime);

    const res = await fetchRequest(requestToSend);

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    eventBus.emit("new-response", { response: res, executionTime });
    showSnackbar("Request sent successfully", "success");
  } catch (error) {
    console.error("Handle request error:", error);
    eventBus.emit("request-error", error);
    showSnackbar("Error sending request", "error");
  }
}

function handleLiveUpdate(request: Request) {
  if (!selectedRequest.value) {
    currentHeaders.value = request.headers || {};
    currentBody.value = request.body || "";
  }
}

watch(
  () => selectedRequest.value,
  () => {
    checkForChanges();
  },
  { deep: true }
);

onMounted(() => {
  eventBus.on("request-selected", handleRequestSelected);
  eventBus.on("request-modified", handleRequestModified);
  eventBus.on("request-submitted", handleRequestSubmitted);
  eventBus.on("live-request-update", handleLiveUpdate);

  document.addEventListener('click', (e) => {
    if (showActionsMenu.value && !(e.target as Element).closest('.actions-menu-container')) {
      closeActionsMenu();
    }
  });
});

onUnmounted(() => {
  eventBus.off("request-selected", handleRequestSelected);
  eventBus.off("request-modified", handleRequestModified);
  eventBus.off("request-submitted", handleRequestSubmitted);
  eventBus.off("live-request-update", handleLiveUpdate);
  document.removeEventListener('click', () => { });
});
</script>

<template>
  <div class="flex flex-col h-full">
    <NavBar />
    <div class="p-6 w-full h-full overflow-auto">
      <div v-if="selectedRequest" class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-800" @dblclick="startEditingName" v-if="!isEditingName">
          {{ currentRequest.name || '' }}
          <span class="text-xs text-gray-500 ml-2">(double click to rename)</span>
        </h2>
        <div v-else class="flex items-center">
          <input v-model="editedName" class="form-input text-lg" @keydown.enter="saveEditedName" @blur="saveEditedName"
            ref="nameInput" autofocus />
        </div>
        <div class="flex gap-2">
          <button v-if="isRequestChanged" @click="saveRequest" class="btn-primary">
            <span>Save</span>
          </button>
          <div class="relative actions-menu-container">
            <button @click.stop="toggleActionsMenu"
              class="px-3 py-2 bg-gray-200 text-gray-700 border border-gray-300 rounded hover:bg-gray-300 transition-colors">
              <span>Actions</span>
              <span class="ml-1">▼</span>
            </button>
            <div v-if="showActionsMenu"
              class="absolute right-0 top-full mt-1 bg-white shadow-lg border rounded-md w-32 z-40">
              <ul>
                <li @click="saveRequestAsNew" class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-blue-600">
                  Save Copy
                </li>
                <li @click="removeRequest" class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-600">
                  Delete
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="flex gap-4 mb-8">
        <div class="w-1/2">
          <HeaderOptions :headers="currentRequest.headers" @update:headers="updateHeaders" />
        </div>
        <div class="w-1/2">
          <RequestBody :body="currentRequest.body" @update:body="updateBody" />
        </div>
      </div>
      <div class="mb-4">
        <ResponsePreview />
      </div>
    </div>
  </div>

  <div v-if="snackbar" :class="[
    'snackbar',
    {
      'snackbar-success': snackbarType === 'success',
      'snackbar-error': snackbarType === 'error',
      'snackbar-info': snackbarType === 'info',
    },
  ]">
    {{ snackbarMessage }}
  </div>
</template>