/**
 * Chat store for AWS Bedrock chatbot
 * Manages chat state, message history, streaming, and error handling
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
    Message,
    ErrorContext,
    StreamingStatus,
    UserMessage,
    AgentMessage,
    ChatSession,
    ConnectionStatus,
} from '@/types'
import { isUserMessage, isAgentMessage, validateMessage, sanitizeMessageContent } from '@/types'

export const useChatStore = defineStore('chat', () => {
    // Core state
    const messages = ref<Message[]>([])
    const isStreaming = ref(false)
    const currentStreamingMessageId = ref<string | null>(null)
    const error = ref<ErrorContext | null>(null)
    const isConnected = ref(false)

    // Enhanced state
    const streamingStatus = ref<StreamingStatus>({
        state: 'idle',
        messageId: null,
        progress: 0,
        error: null,
    })

    const connectionStatus = ref<ConnectionStatus>({
        isConnected: false,
        lastConnected: null,
        connectionAttempts: 0,
        latency: null,
    })

    const currentSession = ref<ChatSession>({
        id: `session_${Date.now()}`,
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        isActive: true,
    })

    // Computed properties
    const userMessages = computed(() => messages.value.filter(isUserMessage))

    const agentMessages = computed(() => messages.value.filter(isAgentMessage))

    const lastMessage = computed(() => messages.value[messages.value.length - 1] || null)

    const hasMessages = computed(() => messages.value.length > 0)

    const isWaitingForResponse = computed(
        () => isStreaming.value || streamingStatus.value.state === 'connecting',
    )

    const canSendMessage = computed(
        () => isConnected.value && !isWaitingForResponse.value && !error.value,
    )

    // Message management actions
    const addMessage = (message: Message): boolean => {
        if (!validateMessage(message)) {
            console.error('Invalid message format:', message)
            return false
        }

        messages.value.push(message)
        currentSession.value.messageCount++
        currentSession.value.lastActivity = new Date()

        return true
    }

    const addUserMessage = (content: string): Message | null => {
        const sanitizedContent = sanitizeMessageContent(content)
        if (!sanitizedContent) {
            return null
        }

        const userMessage: UserMessage = {
            id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            content: sanitizedContent,
            sender: 'user',
            timestamp: new Date(),
            isStreaming: false,
            isComplete: true,
        }

        if (addMessage(userMessage)) {
            return userMessage
        }
        return null
    }

    const addAgentMessage = (content: string = '', streaming: boolean = false): Message | null => {
        const agentMessage: AgentMessage = {
            id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            content,
            sender: 'agent',
            timestamp: new Date(),
            isStreaming: streaming,
            isComplete: !streaming,
            streamingProgress: streaming ? 0 : 100,
        }

        if (addMessage(agentMessage)) {
            if (streaming) {
                currentStreamingMessageId.value = agentMessage.id
                isStreaming.value = true
            }
            return agentMessage
        }
        return null
    }

    const updateMessage = (messageId: string, updates: Partial<Message>): boolean => {
        const messageIndex = messages.value.findIndex((m) => m.id === messageId)
        if (messageIndex === -1) {
            return false
        }

        messages.value[messageIndex] = {
            ...messages.value[messageIndex],
            ...updates,
        }

        currentSession.value.lastActivity = new Date()
        return true
    }

    const appendToMessage = (messageId: string, content: string): boolean => {
        const message = messages.value.find((m) => m.id === messageId)
        if (!message) {
            return false
        }

        message.content += content
        currentSession.value.lastActivity = new Date()

        return true
    }

    const completeMessage = (messageId: string): boolean => {
        const message = messages.value.find((m) => m.id === messageId)
        if (!message) {
            return false
        }

        message.isStreaming = false
        message.isComplete = true

        if (currentStreamingMessageId.value === messageId) {
            currentStreamingMessageId.value = null
            isStreaming.value = false
            updateStreamingStatus({
                state: 'complete',
                messageId: null,
                progress: 100,
            })
        }

        return true
    }

    const removeMessage = (messageId: string): boolean => {
        const messageIndex = messages.value.findIndex((m) => m.id === messageId)
        if (messageIndex === -1) {
            return false
        }

        messages.value.splice(messageIndex, 1)
        currentSession.value.messageCount = Math.max(0, currentSession.value.messageCount - 1)

        return true
    }

    const clearMessages = (): void => {
        messages.value = []
        currentStreamingMessageId.value = null
        isStreaming.value = false
        currentSession.value.messageCount = 0
        updateStreamingStatus({
            state: 'idle',
            messageId: null,
            progress: 0,
        })
    }

    // Streaming state management
    const startStreaming = (messageId: string): void => {
        currentStreamingMessageId.value = messageId
        isStreaming.value = true
        updateStreamingStatus({
            state: 'streaming',
            messageId,
            progress: 0,
            error: null,
        })
    }

    const stopStreaming = (messageId?: string): void => {
        if (!messageId || currentStreamingMessageId.value === messageId) {
            if (currentStreamingMessageId.value) {
                completeMessage(currentStreamingMessageId.value)
            }
            currentStreamingMessageId.value = null
            isStreaming.value = false
            updateStreamingStatus({
                state: 'complete',
                messageId: null,
                progress: 100,
            })
        }
    }

    const updateStreamingStatus = (status: Partial<StreamingStatus>): void => {
        streamingStatus.value = { ...streamingStatus.value, ...status }
    }

    // Error handling
    const setError = (errorContext: ErrorContext | null): void => {
        error.value = errorContext
        if (errorContext) {
            updateStreamingStatus({
                state: 'error',
                error: errorContext,
            })
        }
    }

    const clearError = (): void => {
        error.value = null
        if (streamingStatus.value.state === 'error') {
            updateStreamingStatus({
                state: 'idle',
                error: null,
            })
        }
    }

    const retryLastMessage = (): Message | null => {
        const lastUserMessage = [...messages.value].reverse().find(isUserMessage)

        if (lastUserMessage) {
            clearError()
            return lastUserMessage
        }
        return null
    }

    // Connection management
    const setConnectionStatus = (status: Partial<ConnectionStatus>): void => {
        connectionStatus.value = { ...connectionStatus.value, ...status }
        isConnected.value = status.isConnected ?? connectionStatus.value.isConnected

        if (status.isConnected) {
            connectionStatus.value.lastConnected = new Date()
            connectionStatus.value.connectionAttempts = 0
        } else {
            connectionStatus.value.connectionAttempts++
        }
    }

    const connect = (): void => {
        setConnectionStatus({ isConnected: true })
        clearError()
    }

    const disconnect = (): void => {
        setConnectionStatus({ isConnected: false })
        stopStreaming()
    }

    // Session management
    const startNewSession = (): void => {
        currentSession.value = {
            id: `session_${Date.now()}`,
            startTime: new Date(),
            lastActivity: new Date(),
            messageCount: 0,
            isActive: true,
        }
        clearMessages()
        clearError()
    }

    const endSession = (): void => {
        currentSession.value.isActive = false
        disconnect()
    }

    // Recovery actions
    const recoverFromError = (): void => {
        clearError()
        if (streamingStatus.value.state === 'error') {
            updateStreamingStatus({ state: 'idle' })
        }
    }

    const resetState = (): void => {
        clearMessages()
        clearError()
        disconnect()
        updateStreamingStatus({
            state: 'idle',
            messageId: null,
            progress: 0,
            error: null,
        })
        connectionStatus.value = {
            isConnected: false,
            lastConnected: null,
            connectionAttempts: 0,
            latency: null,
        }
    }

    return {
        // State
        messages,
        isStreaming,
        currentStreamingMessageId,
        error,
        isConnected,
        streamingStatus,
        connectionStatus,
        currentSession,

        // Computed
        userMessages,
        agentMessages,
        lastMessage,
        hasMessages,
        isWaitingForResponse,
        canSendMessage,

        // Message actions
        addMessage,
        addUserMessage,
        addAgentMessage,
        updateMessage,
        appendToMessage,
        completeMessage,
        removeMessage,
        clearMessages,

        // Streaming actions
        startStreaming,
        stopStreaming,
        updateStreamingStatus,

        // Error actions
        setError,
        clearError,
        retryLastMessage,
        recoverFromError,

        // Connection actions
        setConnectionStatus,
        connect,
        disconnect,

        // Session actions
        startNewSession,
        endSession,

        // Utility actions
        resetState,
    }
})
