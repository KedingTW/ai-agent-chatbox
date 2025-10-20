<template>
    <div id="app">
        <div class="app-container">
            <ChatHeader
                title="客戶洞察助理"
                :is-connected="isConnected"
                :is-initializing="isInitializing"
                :is-streaming="isStreaming"
            />
            <div class="chat-wrapper">
                <ChatContainer :show-header="false" height="calc(100dvh - 90px)" width="100dvw" />
            </div>
            <footer class="app-footer">
                <div class="copyright">
                    KEDING © 2025 Keding Enterprises Co., Ltd. All rights reserved.
                </div>
            </footer>
        </div>

        <GlobalError
            :error="globalError"
            @reload="handleReload"
            @dismiss="handleDismissGlobalError"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onErrorCaptured } from 'vue'
import { useChatStore } from '@/stores/chat'
import ChatContainer from '@/components/ChatContainer.vue'
import ChatHeader from '@/components/ChatHeader.vue'
import GlobalError from '@/components/GlobalError.vue'
import type { ErrorContext } from '@/types'

// Store
const chatStore = useChatStore()

// Global error state
const globalError = ref<ErrorContext | null>(null)

// Chat state for header
const isConnected = computed(() => chatStore.isConnected)
const isStreaming = computed(() => chatStore.isStreaming)
const isInitializing = ref(true)

// Copyright year
const currentYear = new Date().getFullYear()

// Update initializing state when chat store is ready
const updateInitializingState = () => {
    isInitializing.value = false
}

// Listen for chat store initialization
onMounted(() => {
    // Set a timeout to update initializing state after a brief moment
    setTimeout(updateInitializingState, 1000)
})

// Error handling
const handleGlobalError = (error: Error, info?: string) => {
    console.error('Global application error:', error, info)

    globalError.value = {
        type: 'unknown',
        code: 'GLOBAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: { info },
        timestamp: new Date(),
        retryable: true,
    }
}

const handleDismissGlobalError = () => {
    globalError.value = null
}

const handleReload = () => {
    window.location.reload()
}

// Vue error boundary
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
<style>
#app {
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0 !important;
    padding: 0 !important;
    height: 100vh !important;
    width: 100vw !important;
    background-color: var(--cui-gray-50);
    max-width: none !important;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0 !important;
    padding: 0 !important;
    height: 100vh !important;
    width: 100vw !important;
    display: block !important;
    place-items: unset !important;
}

.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
}

.chat-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.app-footer {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--cui-gray-100);
    border-top: 1px solid var(--cui-gray-200);
}

.copyright {
    font-size: 0.75rem;
    color: var(--cui-gray-600);
    text-align: center;
}

/* Responsive design */
@media (max-width: 768px) {
    .chat-wrapper {
        padding: 0 0.5rem;
    }

    .copyright {
        font-size: 0.7rem;
    }
}
</style>
