<script setup lang="ts">
import { ref } from 'vue';
import HttpClient from './components/HttpClient.vue';
const selectedClient = ref<number>(1);
const responseMessage = ref<any>(null);
function handleResponse(response: any) {
  if (selectedClient.value !== 3) {
    responseMessage.value = response;
  } else {
    alert(`Status code: ${response.statusCode}\nContent-Type: ${response.contentType}`);
  }
  console.log(`Client ${selectedClient.value} response:`, response);
}
const clientConfigs = [
  {
    id: 1,
    name: "Complete",
    description: "Client with all toggles active, shows response details on this page",
    search: true,
    collections: true
  },
  {
    id: 2,
    name: "No Search Bar",
    description: "Client without the search bar, shows response details on this page",
    search: false,
    collections: true
  },
  {
    id: 3,
    name: "Minimal",
    description: "Bare bones client, uses an alert to display status code and content type",
    search: true,
    collections: false
  }
];
</script>
<template>
  <div class="app-wrapper">
    <header class="header">
      <h1 class="text-xl font-bold">HTTP Client Demo</h1>
      <div class="flex items-center space-x-4">
        <div class="flex items-center">
          <span class="text-sm font-medium mr-2">Layout:</span>
          <div class="relative">
            <select v-model="selectedClient" class="form-select"
              @change="responseMessage = null">
              <option v-for="config in clientConfigs" :key="config.id" :value="config.id"
                :title="config.description">
                {{ config.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div class="w-40"></div>
    </header>
    <div class="main-container">
      <div class="client-container">
        <HttpClient :key="selectedClient" url='https://supsi-ticket.cloudns.org/supsi-http-client/bff/'
          :search="clientConfigs[selectedClient - 1].search"
          :collections="clientConfigs[selectedClient - 1].collections"
          :onResponseMessageClick="handleResponse" />
      </div>
      <div v-if="responseMessage" class="response-container">
        <button @click="responseMessage = null" class="close-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3 class="font-semibold mb-2">Response details:</h3>
        <pre class="response-preview">{{ JSON.stringify(responseMessage, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
