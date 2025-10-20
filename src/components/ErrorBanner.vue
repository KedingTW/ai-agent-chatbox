<template>
    <div
        v-if="error"
        class="error-banner alert alert-danger d-flex justify-content-between align-items-center"
        role="alert"
        aria-live="assertive"
    >
        <div class="error-banner__content">
            <span class="error-banner__icon">⚠️</span>
            <div class="error-banner__text">
                <div class="error-banner__title">Connection Error</div>
                <div class="error-banner__message">{{ error.message }}</div>
            </div>
        </div>
        <div class="error-banner__actions">
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
.error-banner {
    margin-bottom: 0;
}

.error-banner__content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.error-banner__icon {
    font-size: 1.25rem;
}

.error-banner__title {
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.error-banner__message {
    font-size: 0.875rem;
}

.error-banner__actions {
    display: flex;
    gap: 0.5rem;
}

/* Responsive design */
@media (max-width: 768px) {
    .error-banner {
        margin: 0.75rem;
        margin-bottom: 0;
    }
}
</style>
