<template>
    <div
        v-if="chatStore.isInitializing"
        class="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-90"
        role="status"
        :aria-label="ariaLabel"
    >
        <div class="loading-overlay__content">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="loading-overlay__text">Connecting to AI assistant...</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useChatStore } from '@/stores/chat'

interface LoadingOverlayProps {
    ariaLabel?: string
}

withDefaults(defineProps<LoadingOverlayProps>(), {
    ariaLabel: 'Loading content',
})

const chatStore = useChatStore()
</script>

<style scoped>
.loading-overlay {
    z-index: 1000;
}

.loading-overlay__content {
    text-align: center;
}

.loading-overlay__text {
    margin-top: 1rem;
    color: var(--cui-gray-600);
    font-size: 0.875rem;
}
</style>
