<template>
    <div
        v-if="error"
        class="errorBanner alert alert-danger d-flex justify-content-between align-items-center"
        role="alert"
        aria-live="assertive"
    >
        <div class="errorBannerContent">
            <span class="errorBannerIcon"><i class="bi bi-exclamation-triangle-fill"></i></span>
            <div class="errorBannerText">
                <div class="errorBannerTitle">Connection Error</div>
                <div class="errorBannerMessage">{{ error.message }}</div>
            </div>
        </div>
        <div class="errorBannerActions">
            <button
                v-if="error.retryable"
                class="btn btn-sm btn-outline-danger me-2"
                @click="chatStore.clearError"
                type="button"
            >
                Retry
            </button>
            <button
                class="btn btn-sm btn-outline-danger"
                @click="chatStore.clearError"
                type="button"
                aria-label="Dismiss error"
            >
                ✕
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chat'
import { computed } from 'vue'

const chatStore = useChatStore()
const error = computed(() => chatStore.error)
</script>
