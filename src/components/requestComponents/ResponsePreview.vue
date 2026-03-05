<script setup lang="ts">
import { onMounted, onUnmounted, ref, inject } from "vue";
import eventBus from "../../bus/eventBus";

inject('httpClientConfig', {
  baseUrl: 'https://supsi-ticket.cloudns.org/supsi-http-client/bff/',
  showSearch: true,
  showCollections: true,
  onResponseMessageClick: undefined
});

const response = ref<Response | undefined>();
const responseRawText = ref<string>("");
const responseJson = ref<any | null>(null);
const responseHeaders = ref<Record<string, string>>({});
const contentType = ref<string>("");
const contentSize = ref<number | undefined>();
const processingTime = ref<number | undefined>();
const isLoading = ref<boolean>(false);
const isImage = ref<boolean>(false);
const isPdf = ref<boolean>(false);
const mediaUrl = ref<string>("");
const activeTab = ref<string>("preview");
const responseBlob = ref<Blob | null>(null);

function fixEncoding(text: string): string {
  try {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (e) {
    console.error('Error fixing encoding:', e);
    return text;
  }
}

function fixJsonEncoding(jsonString: string): any {
  try {
    const fixedString = fixEncoding(jsonString);
    return JSON.parse(fixedString);
  } catch (e) {
    console.error('Error fixing JSON encoding:', e);
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return null;
    }
  }
}

function resetResponseState() {
  if (mediaUrl.value) {
    URL.revokeObjectURL(mediaUrl.value);
    mediaUrl.value = "";
  }
  response.value = undefined;
  responseRawText.value = "";
  responseJson.value = null;
  responseHeaders.value = {};
  contentType.value = "";
  contentSize.value = undefined;
  processingTime.value = undefined;
  isImage.value = false;
  isPdf.value = false;
  responseBlob.value = null;
  activeTab.value = "preview";
}

function resetDisplayState() {
  if (mediaUrl.value) {
    URL.revokeObjectURL(mediaUrl.value);
    mediaUrl.value = "";
  }
  isImage.value = false;
  isPdf.value = false;
}

async function handleNewResponse(data: { response: Response; executionTime: number }) {
  resetDisplayState();
  
  isLoading.value = false;
  const { response: res, executionTime } = data;

  processingTime.value = Math.round(executionTime);
  response.value = res;

  const headerClone = res.clone();
  const contentClone = res.clone();
  const bodyClone = res.clone();

  const headers: Record<string, string> = {};
  headerClone.headers.forEach((value, key) => {
    headers[key] = value;
  });
  responseHeaders.value = headers;

  contentType.value = res.headers.get("Content-Type") || "";

  const sizeFromHeader = res.headers.get("Content-Length");
  if (sizeFromHeader) {
    contentSize.value = parseInt(sizeFromHeader, 10);
  } else {
    try {
      const text = await contentClone.text();
      contentSize.value = new TextEncoder().encode(text).length;
    } catch (err) {
      console.error("Error getting content size:", err);
      contentSize.value = 0;
    }
  }

  try {
    let isProxyResponse = false;
    let responseText = await bodyClone.clone().text();
    let proxyData: any = null;

    try {
      proxyData = fixJsonEncoding(responseText);
      isProxyResponse = proxyData &&
        proxyData.headers &&
        proxyData.body !== undefined &&
        proxyData.status;
    } catch (e) {
      isProxyResponse = false;
    }

    if (isProxyResponse) {
      responseHeaders.value = {};

      if (proxyData.headers) {
        for (const [key, value] of Object.entries(proxyData.headers)) {
          if (Array.isArray(value)) {
            responseHeaders.value[key] = value.join(', ');
          } else {
            responseHeaders.value[key] = String(value);
          }
        }
      }

      const proxyContentType = proxyData.headers["Content-Type"] || proxyData.headers["content-type"];
      if (proxyContentType) {
        contentType.value = Array.isArray(proxyContentType) ? proxyContentType[0] : proxyContentType;
      }

      const base64Body = proxyData.body;
      responseRawText.value = responseText;

      if (isBase64Encoded(base64Body)) {
        try {
          if (contentType.value.includes("image/")) {
            const byteCharacters = atob(base64Body);
            const byteArrays = [];

            for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
              const slice = byteCharacters.slice(offset, offset + 1024);
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }

            responseBlob.value = new Blob(byteArrays, { type: contentType.value });
            isImage.value = true;
            isPdf.value = false;
            mediaUrl.value = URL.createObjectURL(responseBlob.value);
          }
          else if (contentType.value.includes("application/pdf")) {
            const byteCharacters = atob(base64Body);
            const byteArrays = [];

            for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
              const slice = byteCharacters.slice(offset, offset + 1024);
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }

            responseBlob.value = new Blob(byteArrays, { type: "application/pdf" });
            isPdf.value = true;
            isImage.value = false;
            mediaUrl.value = URL.createObjectURL(responseBlob.value);
          }
          else {
            const decodedContent = atob(base64Body);

            if (contentType.value.includes("application/json")) {
              responseJson.value = fixJsonEncoding(decodedContent);
            }

            responseRawText.value = fixEncoding(decodedContent);
            responseBlob.value = new Blob([decodedContent], { type: contentType.value });
          }
        } catch (e) {
          console.error("Errore nella decodifica base64:", e);
          responseRawText.value = `Errore nella decodifica base64: ${e}`;
        }
      } else {
        if (contentType.value.includes("application/json")) {
          responseJson.value = fixJsonEncoding(base64Body);
        }
        responseRawText.value = fixEncoding(base64Body);
      }

      contentSize.value = new TextEncoder().encode(responseRawText.value).length;
    } else {
      responseBlob.value = await bodyClone.clone().blob();
      responseRawText.value = fixEncoding(responseText);
      handleContentType();
    }
  } catch (err) {
    console.error("Error parsing response:", err);
    responseRawText.value = `Error parsing response: ${err}`;
    resetDisplayState();
  }

  console.log("Request execution time:", processingTime.value, "ms");
  console.log("Content size:", contentSize.value, "bytes");
}

function isBase64Encoded(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  const isValidLength = str.length % 4 === 0;
  const hasValidChars = base64Regex.test(str);
  return isValidLength && hasValidChars && str.length >= 4 && !str.includes(' ');
}

function handleContentType() {
  resetDisplayState();

  if (contentType.value.includes("application/json")) {
    responseJson.value = fixJsonEncoding(responseRawText.value);
  }
  else if (contentType.value.includes("image/")) {
    isImage.value = true;
    isPdf.value = false;
    if (responseBlob.value) {
      mediaUrl.value = URL.createObjectURL(responseBlob.value);
    }
  }
  else if (contentType.value.includes("application/pdf")) {
    isPdf.value = true;
    isImage.value = false;
    if (responseBlob.value) {
      mediaUrl.value = URL.createObjectURL(responseBlob.value);
    }
  }

  activeTab.value = "preview";
}

function handleRequestStart() {
  isLoading.value = true;
}

function handleRequestSelected() {
  resetResponseState();
}

function handleRequestError(error: Error) {
  isLoading.value = false;
  responseRawText.value = `Error: ${error.message}`;
  resetDisplayState();
  activeTab.value = "preview";
}

function prettifyJson(json: any): string {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return String(json);
  }
}

function formatXml(xml: string): string {
  try {
    let formatted = '';
    let indent = '';
    const tab = '  ';

    xml.split(/>\s*</).forEach(function (node) {
      if (node.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }
      formatted += indent + '<' + node + '>\r\n';
      if (node.match(/^<?\w[^>]*[^\/]$/)) {
        indent += tab;
      }
    });

    return formatted.substring(1, formatted.length - 3);
  } catch (e) {
    console.error("Error formatting XML:", e);
    return xml;
  }
}

function handleTabChange(tabId: string) {
  activeTab.value = tabId;
}

function emitResponseClick() {
  if (response.value) {
    const responseData = {
      statusCode: response.value.status,
      statusText: response.value.statusText,
      headers: responseHeaders.value,
      body: responseRawText.value,
      contentType: contentType.value,
      size: contentSize.value,
      time: processingTime.value
    };
    eventBus.emit("response-click", responseData);
  }
}

onMounted(() => {
  eventBus.on("new-response", handleNewResponse);
  eventBus.on("request-start", handleRequestStart);
  eventBus.on("request-selected", handleRequestSelected);
  eventBus.on("request-error", handleRequestError);
});

onUnmounted(() => {
  eventBus.off("request-selected", handleRequestSelected);
  eventBus.off("new-response", handleNewResponse);
  eventBus.off("request-start", handleRequestStart);
  eventBus.off("request-error", handleRequestError);
  resetDisplayState();
});
</script>
<template>
  <div class="p-4 border rounded-md bg-white">
    <div v-if="isLoading" class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2">Loading...</span>
    </div>

    <div v-else>
      <div v-if="response" class="mb-4">
        <div class="flex items-center gap-4 text-sm">
          <span :class="[
            response?.ok ? 'bg-green-500' : 'bg-red-500',
            'text-white px-3 py-1 rounded cursor-pointer'
          ]" @click="emitResponseClick" title="Click for detailed response information">
            {{ response?.ok ? 'OK' : 'Error' }} {{ response?.status }} {{ response?.statusText }}
          </span>

          <span v-if="contentType" class="text-gray-600 text-xs">
            {{ contentType }}
          </span>

          <span v-if="contentSize !== undefined">
            Size: {{ contentSize > 0 ? (contentSize / 1024).toFixed(2) : 0 }} KB
          </span>

          <span v-if="processingTime !== undefined">
            Time: {{ processingTime }} ms
          </span>
        </div>
      </div>

      <div v-if="response" class="border-b mb-4">
        <div class="flex">
          <button @click="handleTabChange('preview')" :class="[
            'px-4 py-2 text-sm focus:outline-none',
            activeTab === 'preview' ?
              'border-b-2 border-blue-500 font-medium text-blue-600' :
              'text-gray-500 hover:text-gray-700'
          ]">
            Preview
          </button>
          <button @click="handleTabChange('raw')" :class="[
            'px-4 py-2 text-sm focus:outline-none',
            activeTab === 'raw' ?
              'border-b-2 border-blue-500 font-medium text-blue-600' :
              'text-gray-500 hover:text-gray-700'
          ]">
            Raw
          </button>
          <button @click="handleTabChange('headers')" :class="[
            'px-4 py-2 text-sm focus:outline-none',
            activeTab === 'headers' ?
              'border-b-2 border-blue-500 font-medium text-blue-600' :
              'text-gray-500 hover:text-gray-700'
          ]">
            Headers
          </button>
        </div>
      </div>

      <div v-if="response" class="border rounded overflow-visible">
        <div v-if="activeTab === 'preview'" class="w-full">
          <div v-if="isImage" class="flex justify-center items-center">
            <img :src="mediaUrl" alt="Response Image" class="max-w-full object-contain" />
          </div>

          <div v-else-if="isPdf" class="w-full" style="min-height: 600px;">
            <object :data="mediaUrl" type="application/pdf" class="w-full h-full" style="min-height: 600px;">
              <div class="flex flex-col items-center justify-center p-4 text-center">
                <p class="text-sm">Il browser non supporta la visualizzazione diretta dei PDF.</p>
                <a :href="mediaUrl" target="_blank" class="text-blue-500 underline mt-2">Apri il PDF in una nuova
                  scheda</a>
              </div>
            </object>
          </div>

          <pre v-else-if="responseJson" class="text-xs p-2 word-break-all">{{ prettifyJson(responseJson) }}</pre>

          <div v-else-if="contentType.includes('text/html')" class="w-full">
            <iframe sandbox="allow-same-origin" :srcdoc="responseRawText" class="w-full" style="min-height: 600px;"
              title="HTML Preview"></iframe>
          </div>

          <pre v-else-if="contentType.includes('xml')"
            class="text-xs p-2 word-break-all">{{ formatXml(responseRawText) }}</pre>

          <pre v-else class="text-xs font-mono word-break-all p-2">{{ responseRawText }}</pre>
        </div>

        <pre v-else-if="activeTab === 'raw'" class="p-2 text-xs word-break-all">{{ responseRawText }}</pre>

        <div v-else-if="activeTab === 'headers'" class="p-2">
          <div v-for="(value, key) in responseHeaders" :key="key" class="mb-1 text-xs">
            <span class="font-semibold">{{ key }}:</span> {{ value }}
          </div>
        </div>
      </div>

      <div v-else class="min-h-32 flex items-center justify-center border rounded bg-gray-50">
        <p class="text-gray-400">No response data available</p>
      </div>
    </div>
  </div>
</template>