import { ref, readonly } from 'vue';

interface HttpClientConfig {
  baseUrl: string;
  showSearch: boolean;
  showCollections: boolean;
  onResponseMessageClick?: (response: any) => void;
}

const defaultConfig: HttpClientConfig = {
  baseUrl: 'https://supsi-ticket.cloudns.org/supsi-http-client/bff/',
  showSearch: true,
  showCollections: true
};

const config = ref<HttpClientConfig>({ ...defaultConfig });

export function setConfig(newConfig: Partial<HttpClientConfig>) {
  config.value = { ...config.value, ...newConfig };
}

export function getConfig() {
  return readonly(config);
}

export default {
  setConfig,
  getConfig
};