<template>
    <div class="flex-grow-1" :class="getContainerClass()">
        <!-- Main chat area -->
        <div class="chat-main flex-grow-1 d-flex flex-column overflow-hidden">
            <!-- Message list -->
            <MessageList
                :messages="messages"
                :is-streaming="isStreaming"
                :auto-scroll="true"
                @message-retry="handleMessageRetry"
            />
        </div>

        <!-- Input area -->
        <div class="chat-input-area p-3 border-top">
            <!-- Streaming indicator -->
            <div
                v-if="isStreaming"
                class="streaming-indicator d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded"
                role="status"
                aria-live="polite"
            >
                <div class="streaming-indicator__content">
                    <span class="streaming-indicator__icon">
                        <span class="spinner-border spinner-border-sm"></span>
                    </span>
                    <span class="streaming-indicator__text">AI is thinking...</span>
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
    let classes = 'chat-container'
    if (chatStore.isStreaming) classes += ' chat-container--streaming'
    if (chatStore.error) classes += ' chat-container--error'
    if (chatStore.isInitializing) classes += ' chat-container--initializing'
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
.chat-container {
    display: flex;
    flex-direction: column;
    background-color: white;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    height: 100%;
    min-height: 0;
}

.chat-container--error {
    border-color: var(--cui-danger);
}

.chat-container--initializing {
    pointer-events: none;
}

.chat-main {
    min-height: 0;
    /* Important for flex child to shrink */
}

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

.chat-input-area {
    background-color: var(--cui-gray-50);
    border-top-color: var(--cui-gray-200);
}

.streaming-indicator {
    background-color: rgba(var(--cui-info-rgb), 0.1);
    border: 1px solid rgba(var(--cui-info-rgb), 0.2);
}

.streaming-indicator__content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.streaming-indicator__text {
    font-size: 0.875rem;
    color: var(--cui-info);
    font-style: italic;
}

.loading-overlay {
    backdrop-filter: blur(2px);
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

/* Animations */
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

/* Responsive design */
@media (max-width: 768px) {
    .chat-input-area {
        padding: 0.75rem;
    }

    .error-banner {
        margin: 0.75rem;
        margin-bottom: 0;
    }

    .streaming-indicator {
        margin-bottom: 0.75rem;
        padding: 0.75rem;
    }
}

/* High contrast mode */
@media (prefers-contrast: high) {
    .chat-container {
        border-width: 2px;
    }

    .chat-input-area {
        border-top-width: 2px;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .status-indicator--connecting,
    .status-indicator--streaming {
        animation: none;
    }

    .loading-overlay {
        backdrop-filter: none;
    }
}
</style>
