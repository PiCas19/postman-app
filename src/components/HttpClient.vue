<script setup lang="ts">
import { onMounted, provide, reactive, onUnmounted } from "vue";
import Sidebar from "./mainComponents/SideBar.vue";
import Board from "./mainComponents/Board.vue";
import eventBus from "../bus/eventBus";
import { setConfig } from "../services/config";

const props = withDefaults(defineProps<{
    url?: string;
    search?: boolean;
    collections?: boolean;
    onResponseMessageClick?: (response: any) => void;
}>(), {
    url: 'https://supsi-ticket.cloudns.org/supsi-http-client/bff/',
    search: true,
    collections: true
});

const configObject = reactive({
    baseUrl: props.url,
    showSearch: props.search,
    showCollections: props.collections,
    onResponseMessageClick: props.onResponseMessageClick
});

onMounted(() => {
    setConfig({
        baseUrl: props.url,
        showSearch: props.search,
        showCollections: props.collections,
        onResponseMessageClick: props.onResponseMessageClick
    });
    if (props.onResponseMessageClick) {
        eventBus.on("response-click", props.onResponseMessageClick);
    }
});

onUnmounted(() => {
    if (props.onResponseMessageClick) {
        eventBus.off("response-click", props.onResponseMessageClick);
    }
});

provide('httpClientConfig', configObject);
</script>
<template>
    <div class="app-container">
        <div class="main-content">
            <Sidebar v-if="collections" :show-search="search" />
            <div class="board">
                <Board />
            </div>
        </div>
    </div>
</template>