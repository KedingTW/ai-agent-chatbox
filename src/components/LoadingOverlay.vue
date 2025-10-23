<template>
    <div
        v-if="stateStore.isInitializing"
        class="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-90"
        role="status"
        :aria-label="ariaLabel"
    >
        <div class="loadingOverlayContent">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="loadingOverlayText">Connecting to AI assistant...</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useStateStore } from '@/stores/state'

interface LoadingOverlayProps {
    ariaLabel?: string
}

withDefaults(defineProps<LoadingOverlayProps>(), {
    ariaLabel: 'Loading content',
})

const stateStore = useStateStore()
</script>
