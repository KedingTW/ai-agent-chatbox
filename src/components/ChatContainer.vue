<template>
    <div :class="getContainerClass()" :style="containerStyles">
        <!-- Main chat area -->
        <div class="chat-main flex-grow-1 d-flex flex-column overflow-hidden">
            <!-- Error banner -->
            <div
                v-if="error"
                class="error-banner alert alert-danger d-flex justify-content-between align-items-center m-2 mb-0"
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
                        @click="handleRetryError"
                        type="button"
                    >
                        Retry
                    </button>
                    <button
                        class="btn btn-sm btn-outline-danger"
                        @click="handleDismissError"
                        type="button"
                        aria-label="Dismiss error"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <!-- Message list -->
            <MessageList
                :messages="messages"
                :is-streaming="isStreaming"
                :auto-scroll="true"
                :max-height="messageListHeight"
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
            <MessageInput
                :disabled="!canSendMessage"
                :placeholder="inputPlaceholder"
                @send-message="handleSendMessage"
                @focus="handleInputFocus"
                @blur="handleInputBlur"
            />
        </div>

        <!-- Loading overlay -->
        <div
            v-if="isInitializing"
            class="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-90"
            role="status"
            aria-label="Initializing chat"
        >
            <div class="loading-overlay__content">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="loading-overlay__text">Connecting to AI assistant...</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { AWSBedrockService } from '@/services/aws-bedrock'
import type { ChatContainerProps, ErrorContext } from '@/types'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

// Props
const props = withDefaults(defineProps<ChatContainerProps>(), {
    title: 'AI Assistant',
    showHeader: true,
    height: '600px',
    width: '100%',
})

// Store
const chatStore = useChatStore()

// Services
let awsService: AWSBedrockService | null = null

// State
const isInitializing = ref(true)
const inputFocused = ref(false)

// Computed properties from store
const messages = computed(() => chatStore.messages)
const isStreaming = computed(() => chatStore.isStreaming)
const error = computed(() => chatStore.error)
const isConnected = computed(() => chatStore.isConnected)
const canSendMessage = computed(() => chatStore.canSendMessage && !isInitializing.value)

// UI computed properties
const inputPlaceholder = computed(() => {
    if (isInitializing.value) return '連線中...'
    if (!isConnected.value) return '已斷線'
    if (isStreaming.value) return '正在回應中...'
    return '請說明你的問題...'
})

const messageListHeight = computed(() => {
    const totalHeight = parseInt(props.height.replace('px', ''))
    const inputHeight = 120
    const streamingIndicatorHeight = isStreaming.value ? 40 : 0
    const errorBannerHeight = error.value ? 60 : 0

    return `${totalHeight - inputHeight - streamingIndicatorHeight - errorBannerHeight}px`
})

// Container styles
const containerStyles = computed(() => ({
    height: props.height,
    width: props.width,
}))

// CSS Class functions
const getContainerClass = () => {
    let classes = 'chat-container'
    if (isStreaming.value) classes += ' chat-container--streaming'
    if (error.value) classes += ' chat-container--error'
    if (isInitializing.value) classes += ' chat-container--initializing'
    if (inputFocused.value) classes += ' chat-container--input-focused'
    return classes
}

// Methods
const initializeService = async () => {
    try {
        isInitializing.value = true

        // Initialize AWS service
        awsService = new AWSBedrockService()

        // Initialize connection
        chatStore.connect()
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
        isInitializing.value = false
    }
}

const handleSendMessage = async (message: string) => {
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

const handleRetryError = async () => {
    chatStore.clearError()

    if (!isConnected.value) {
        await initializeService()
    } else {
        // Retry last message if available
        const lastMessage = chatStore.retryLastMessage()
        if (lastMessage) {
            await handleSendMessage(lastMessage.content)
        }
    }
}

const handleDismissError = () => {
    chatStore.clearError()
}

const handleCancelStreaming = () => {
    chatStore.stopStreaming()
}

const handleInputFocus = () => {
    inputFocused.value = true
}

const handleInputBlur = () => {
    inputFocused.value = false
}

// Lifecycle
onMounted(async () => {
    await initializeService()
})

onUnmounted(() => {
    if (awsService) {
        awsService.dispose()
    }
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
