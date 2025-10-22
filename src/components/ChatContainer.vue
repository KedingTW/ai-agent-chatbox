<template>
    <div class="flex-grow-1" :class="getContainerClass()">
        <!-- Main chat area -->
        <div class="chatMain flex-grow-1 d-flex flex-column overflow-hidden">
            <!-- Message list -->
            <MessageList :messages="messages" @message-retry="handleMessageRetry" />
        </div>

        <!-- Input area -->
        <MessageInput @send-message="handleSendMessage" />

        <!-- Loading overlay -->
        <LoadingOverlay role="status" aria-label="Initializing chat" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { awsServiceManager } from '@/services/aws-service-manager'
import { safeGetIframeConfig } from '@/utils/iframe'
import type { ErrorContext } from '@/types'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'
import LoadingOverlay from './LoadingOverlay.vue'

// Store
const chatStore = useChatStore()

// Computed properties from store
const messages = computed(() => chatStore.messages)
const canSendMessage = computed(() => chatStore.canSendMessage)

// CSS Class functions
const getContainerClass = () => {
    let classes = 'chatContainer'
    if (chatStore.isStreaming) classes += ' chatContainerStreaming'
    if (chatStore.error) classes += ' chatContainerError'
    if (chatStore.isInitializing) classes += ' chatContainerInitializing'
    return classes
}

// Methods
const initializeService = async () => {
    try {
        chatStore.setInitializing(true)

        // 檢查 iframe 配置是否有效
        const iframeResult = safeGetIframeConfig()
        if (!iframeResult.success) {
            // iframe 配置無效，設置錯誤狀態但不初始化 AWS
            const errorContext: ErrorContext = {
                type: 'validation',
                code: 'IFRAME_CONFIG_ERROR',
                message: iframeResult.error || '配置錯誤',
                timestamp: new Date(),
                retryable: false,
            }
            chatStore.setError(errorContext)
            return
        }

        const result = await awsServiceManager.initialize()
        if (result.success) {
            chatStore.connect()
        } else {
            chatStore.setError(result.error || null)
        }
    } catch (error) {
        const errorContext: ErrorContext = {
            type: 'api',
            code: 'INITIALIZATION_FAILED',
            message: error instanceof Error ? error.message : 'Failed to initialize chat service',
            timestamp: new Date(),
            retryable: true,
        }
        chatStore.setError(errorContext)
    } finally {
        chatStore.setInitializing(false)
    }
}

const handleSendMessage = async (message: string) => {
    const awsService = awsServiceManager.getBedrockService()

    if (!awsService || !canSendMessage.value) {
        console.log('Cannot send message - service not ready or not allowed')
        return
    }

    try {
        // Add user message to store
        const userMessage = chatStore.addUserMessage(message)
        if (!userMessage) return

        // Add placeholder agent message for streaming
        const agentMessage = chatStore.addAgentMessage('', true)
        if (!agentMessage) return

        // Send message with streaming
        await awsService.sendMessageWithStreaming(
            message,
            chatStore.currentSession.id,
            // onChunk
            (chunk: string) => {
                chatStore.appendToMessage(agentMessage.id, chunk)
            },
            // onComplete
            () => {
                chatStore.completeMessage(agentMessage.id)
            },
            // onError
            (error: ErrorContext) => {
                chatStore.setError(error)
                chatStore.removeMessage(agentMessage.id)
            },
        )
    } catch (error) {
        const errorContext: ErrorContext = {
            type: 'api',
            code: 'SEND_MESSAGE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to send message',
            timestamp: new Date(),
            retryable: true,
        }
        chatStore.setError(errorContext)
    }
}

const handleMessageRetry = async (messageId: string) => {
    const message = messages.value.find((m) => m.id === messageId)
    if (message && message.sender === 'user') {
        await handleSendMessage(message.content)
    }
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
        retryable: false,
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
