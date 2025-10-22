<template>
    <div class="flex-grow-1" :class="getContainerClass()">
        <!-- Main chat area -->
        <div class="chatMain flex-grow-1 d-flex flex-column overflow-hidden">
            <!-- Message list -->
            <MessageList
                :messages="messages"
                :is-streaming="isStreaming"
                :auto-scroll="true"
                @message-retry="handleMessageRetry"
            />
        </div>

        <!-- Input area -->
        <div class="chatInputArea px-3 pt-3">
            <!-- Streaming indicator -->
            <div
                v-if="isStreaming"
                class="streamingIndicator d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded"
                role="status"
                aria-live="polite"
            >
                <div class="streamingIndicatorContent">
                    <span class="streamingIndicator__icon">
                        <span class="spinner-border spinner-border-sm"></span>
                    </span>
                    <span class="streamingIndicatorText">AI is thinking...</span>
                </div>
                <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="handleCancelStreaming"
                    type="button"
                    aria-label="Cancel current response"
                >
                    Cancel
                </button>
            </div>

            <!-- Message input -->
            <MessageInput @send-message="handleSendMessage" />
        </div>
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
const isStreaming = computed(() => chatStore.isStreaming)
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

const handleCancelStreaming = () => {
    chatStore.stopStreaming()
}

// Lifecycle
onMounted(async () => {
    await initializeService()
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

<style scoped>
.chatContainer {
    display: flex;
    flex-direction: column;
    background-color: white;
    overflow: hidden;
    position: relative;
    height: 100%;
    min-height: 0;
}

.chatContainerError {
    border-color: var(--cui-danger);
}

.chatContainerInitializing {
    pointer-events: none;
}

.chatMain {
    min-height: 0;
}

.errorBanner {
    margin-bottom: 0;
}

.errorBannerContent {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.chatInputArea {
    background-color: var(--cui-primary-50);
}

.streamingIndicator {
    background-color: rgba(var(--cui-info-rgb), 0.1);
    border: 1px solid rgba(var(--cui-info-rgb), 0.2);
}

.streamingIndicatorContent {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.streamingIndicatorText {
    font-size: 0.875rem;
    color: var(--cui-info);
    font-style: italic;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

@media (max-width: 768px) {
    .chatInputArea {
        padding: 0.75rem;
    }

    .errorBanner {
        margin: 0.75rem;
        margin-bottom: 0;
    }

    .streamingIndicator {
        margin-bottom: 0.75rem;
        padding: 0.75rem;
    }
}

@media (prefers-contrast: high) {
    .chatContainer {
        border-width: 2px;
    }

    .chatInputArea {
        border-top-width: 2px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .statusIndicatorConnecting,
    .statusIndicatorStreaming {
        animation: none;
    }
}
</style>
