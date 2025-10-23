<template>
    <div v-if="globalError" class="globalErrorOverlay" role="alert" aria-live="assertive">
        <div class="globalErrorContent">
            <div class="globalErrorIcon">⚠️</div>
            <h2 class="globalErrorTitle">Application Error</h2>
            <p class="globalErrorMessage">{{ globalError.message }}</p>
            <div class="globalErrorActions">
                <button class="btn btn-primary" @click="handleReload" type="button">
                    Reload Application
                </button>
                <button
                    class="btn btn-outline-secondary ms-2"
                    @click="handleDismissGlobalError"
                    type="button"
                >
                    Dismiss
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onErrorCaptured } from 'vue'
import type { ErrorContext } from '@/types'

// Global error state
const globalError = ref<ErrorContext | null>(null)

// Error handling
const handleGlobalError = (error: Error, info?: string) => {
    console.error('Global application error:', error, info)

    globalError.value = {
        type: 'unknown',
        code: 'GLOBAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: { info },
        timestamp: new Date(),
    }
}

const handleDismissGlobalError = () => {
    globalError.value = null
}

const handleReload = () => {
    window.location.reload()
}

// Vue error boundary - capture errors from child components
onErrorCaptured((error: Error, _instance, info: string) => {
    handleGlobalError(error, info)
    return false // Prevent error from propagating
})

// Global error handlers
onMounted(() => {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
        handleGlobalError(event.error || new Error(event.message))
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        handleGlobalError(new Error(event.reason))
        event.preventDefault()
    })
})
</script>
