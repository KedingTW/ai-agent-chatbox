<template>
    <div class="flex-grow-1" :class="getContainerClass()">
        <!-- Main chat area -->
        <div class="chatMain flex-grow-1 d-flex flex-column overflow-hidden">
            <!-- Message list -->
            <MessageList />
        </div>

        <!-- Input area -->
        <MessageInput @send-message="handleSendMessage" />

        <!-- Loading overlay -->
        <LoadingOverlay role="status" aria-label="Initializing chat" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useStateStore } from '@/stores/state'
import type { ErrorContext } from '@/types'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'
import LoadingOverlay from './LoadingOverlay.vue'
import { useConfigStore } from '@/stores/config'

// Store
const chatStore = useChatStore()
const configStore = useConfigStore()
const stateStore = useStateStore()

// CSS Class functions
const getContainerClass = () => {
    let classes = 'chatContainer'
    if (stateStore.isStreaming) classes += ' chatContainerStreaming'
    if (stateStore.error) classes += ' chatContainerError'
    if (stateStore.isInitializing) classes += ' chatContainerInitializing'
    return classes
}

// Methods
const initializeService = async () => {
    try {
        stateStore.isInitializing = true

        // 使用 configStore 的初始化方法
        const result = await configStore.initializeService()

        if (!result.success && result.error) {
            chatStore.setError(result.error)
            return
        }

        // 初始化成功，清除錯誤
        chatStore.clearError()
    } finally {
        stateStore.isInitializing = false
    }
}

const handleSendMessage = async (message: string) => {
    await chatStore.sendMessage(message)
}

// Lifecycle
onMounted(() => {
    initializeService()
})

onUnmounted(() => {
    chatStore.endSession()
})

// Error boundary
const handleError = (error: Error) => {
    console.error('Chat container error:', error)
    const errorContext: ErrorContext = {
        type: 'unknown',
        code: 'COMPONENT_ERROR',
        message: 'An unexpected error occurred in the chat interface',
        timestamp: new Date(),
    }
    chatStore.setError(errorContext)
}

// Global error handler
const handleWindowError = (event: ErrorEvent) => {
    handleError(new Error(event.message))
}

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    handleError(new Error(event.reason))
}

window.addEventListener('error', handleWindowError)
window.addEventListener('unhandledrejection', handleUnhandledRejection)

onUnmounted(() => {
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
})
</script>
