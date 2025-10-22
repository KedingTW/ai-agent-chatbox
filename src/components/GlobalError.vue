<template>
    <div v-if="error" class="globalErrorOverlay" role="alert" aria-live="assertive">
        <div class="globalErrorContent">
            <div class="globalErrorIcon">⚠️</div>
            <h2 class="globalErrorTitle">Application Error</h2>
            <p class="globalErrorMessage">{{ error.message }}</p>
            <div class="globalErrorActions">
                <button class="btn btn-primary" @click="handleReload" type="button">
                    Reload Application
                </button>
                <button
                    class="btn btn-outline-secondary ms-2"
                    @click="$emit('dismiss')"
                    type="button"
                >
                    Dismiss
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ErrorContext } from '@/types'

interface Props {
    error: ErrorContext | null
}

defineProps<Props>()

defineEmits<{
    dismiss: []
}>()

const handleReload = () => {
    window.location.reload()
}
</script>
