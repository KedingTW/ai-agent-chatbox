<template>
    <div
        v-if="error"
        class="errorBanner alert alert-danger d-flex justify-content-between align-items-center"
        role="alert"
        aria-live="assertive"
    >
        <div class="errorBannerContent">
            <span class="errorBannerIcon">⚠️</span>
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

<style scoped>
.errorBanner {
    margin-bottom: 0;
}

.errorBannerContent {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.errorBannerIcon {
    font-size: 1.25rem;
}

.errorBannerTitle {
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.errorBannerMessage {
    font-size: 0.875rem;
}

.errorBannerActions {
    display: flex;
    gap: 0.5rem;
}

@media (max-width: 768px) {
    .errorBanner {
        margin: 0.75rem;
        margin-bottom: 0;
    }
}
</style>
