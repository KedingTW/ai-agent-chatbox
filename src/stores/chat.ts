/**
 * AWS Bedrock 聊天機器人的 Chat store
 * 管理聊天狀態、訊息歷史、串流和錯誤處理
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
} from '@/types'
import {
    isUserMessage,
    isAgentMessage,
    validateMessage,
    sanitizeMessageContent,
} from '@/helpers/message'
import { AWSBedrockService } from '@/services/aws-bedrock'
import { useConfigStore } from './config'
import { useStateStore } from './state'
import { clearPersistedState } from './plugins/persistence'

export const useChatStore = defineStore('chat', () => {
    // 使用 state store 的全域狀態
    const stateStore = useStateStore()

    // Chat 專用狀態
    const messages = ref<Message[]>([])
    const currentStreamingMessageId = ref<string | null>(null)

    // Enhanced state
    const streamingStatus = ref<StreamingStatus>({
        state: 'idle',
        messageId: null,
        progress: 0,
        error: null,
    })

    // Remove connection status as we'll create client on-demand

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
        () => stateStore.isStreaming || streamingStatus.value.state === 'connecting',
    )

    const canSendMessage = computed(
        () => !isWaitingForResponse.value && !stateStore.error && !stateStore.isInitializing,
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
                stateStore.isStreaming = true
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
            stateStore.isStreaming = false
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
        stateStore.isStreaming = false
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
        stateStore.isStreaming = true
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
            stateStore.isStreaming = false
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
        stateStore.error = errorContext
        if (errorContext) {
            stateStore.isStreaming = false
            updateStreamingStatus({
                state: 'error',
                error: errorContext,
            })
        }
    }

    const clearError = (): void => {
        stateStore.error = null
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
        stopStreaming()
    }

    // Recovery actions
    const recoverFromError = (): void => {
        clearError()
        if (streamingStatus.value.state === 'error') {
            updateStreamingStatus({ state: 'idle' })
        }
    }

    // Message sending actions
    const sendMessage = async (message: string): Promise<void> => {
        if (!canSendMessage.value) {
            console.log('Cannot send message - not allowed')
            return
        }

        // Get current active profile
        const configStore = useConfigStore()
        const activeProfile = configStore.activeProfile

        if (!activeProfile) {
            const errorContext: ErrorContext = {
                type: 'validation',
                code: 'NO_ACTIVE_PROFILE',
                message: 'No active profile found',
                timestamp: new Date(),
            }
            setError(errorContext)
            return
        }

        try {
            // Create AWS Bedrock service instance on-demand
            const awsService = new AWSBedrockService(activeProfile)

            // Add user message to store
            const userMessage = addUserMessage(message)
            if (!userMessage) return

            // Add placeholder agent message for streaming
            const agentMessage = addAgentMessage('', true)
            if (!agentMessage) return

            // Send message with streaming
            await awsService.sendMessageWithStreaming(
                message,
                currentSession.value.id,
                // onChunk
                (chunk: string) => {
                    appendToMessage(agentMessage.id, chunk)
                },
                // onComplete
                () => {
                    completeMessage(agentMessage.id)
                },
                // onError
                (error: ErrorContext) => {
                    setError(error)
                    removeMessage(agentMessage.id)
                },
            )
        } catch (error) {
            const errorContext: ErrorContext = {
                type: 'api',
                code: 'SEND_MESSAGE_FAILED',
                message: error instanceof Error ? error.message : 'Failed to send message',
                timestamp: new Date(),
            }
            setError(errorContext)
        }
    }

    const resetState = (): void => {
        clearMessages()
        clearError()
        stopStreaming()
        stateStore.isInitializing = true
        updateStreamingStatus({
            state: 'idle',
            messageId: null,
            progress: 0,
            error: null,
        })
    }

    // Enhanced clear messages that also clears persistence
    const clearAllData = (): void => {
        // Clear messages and errors
        clearMessages()
        clearError()

        // Reset streaming status but keep connection
        updateStreamingStatus({
            state: 'idle',
            messageId: null,
            progress: 0,
            error: null,
        })

        // Create new session (without clearing messages again)
        currentSession.value = {
            id: `session_${Date.now()}`,
            startTime: new Date(),
            lastActivity: new Date(),
            messageCount: 0,
            isActive: true,
        }

        // Clear persisted data
        clearPersistedState()
    }

    return {
        // State
        messages,
        currentStreamingMessageId,
        streamingStatus,
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

        // Session actions
        startNewSession,
        endSession,

        // Message sending actions
        sendMessage,

        // Utility actions
        resetState,
        clearAllData,
    }
})
