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
    ConnectionStatus,
} from '@/types'
import { isUserMessage, isAgentMessage, validateMessage, sanitizeMessageContent } from '@/types'
import { getNormalizedIframeConfig, isValidProfileId } from '@/utils/iframe'

export const useChatStore = defineStore('chat', () => {
    // Core state
    const messages = ref<Message[]>([])
    const isStreaming = ref(false)
    const currentStreamingMessageId = ref<string | null>(null)
    const error = ref<ErrorContext | null>(null)
    const isConnected = ref(false)
    const isInitializing = ref(true)

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
        () => isConnected.value && !isWaitingForResponse.value && !error.value && !isInitializing.value,
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
            isStreaming.value = false
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

    // Initialization management
    const setInitializing = (initializing: boolean): void => {
        isInitializing.value = initializing
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
        isInitializing.value = true
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
        isInitializing,
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

        // Initialization actions
        setInitializing,

        // Session actions
        startNewSession,
        endSession,

        // Utility actions
        resetState,
    }
})

export interface AWSProfile {
    id: string
    name: string
    title: string
    accessKeyId: string
    secretAccessKey: string
    bedrockAgentArn: string
    sessionId: string
}

export const useConfigStore = defineStore('config', () => {
    // iframe 配置
    const iframeConfig = getNormalizedIframeConfig()

    // 根據 iframe 配置決定初始設定檔
    const getInitialProfileId = (): string => {
        // 如果是 iframe 模式
        if (iframeConfig.isIframe) {
            // 如果有指定有效的設定檔，使用指定的設定檔
            if (iframeConfig.profileId && isValidProfileId(iframeConfig.profileId)) {
                return iframeConfig.profileId
            }
            // iframe 模式下沒有參數時，統一使用設定檔1
            return 'profile1'
        }

        // 非 iframe 模式，使用預設設定檔1
        return 'profile1'
    }

    // 目前啟用的設定檔
    const activeProfileId = ref<string>(getInitialProfileId())

    // iframe 相關狀態
    const isIframeMode = ref<boolean>(iframeConfig.isIframe)
    const hideProfileMenu = ref<boolean>(iframeConfig.hideMenu)

    // 可用的設定檔配置
    const profiles = computed<AWSProfile[]>(() => [
        {
            id: 'profile1',
            name: '客戶助理',
            title: 'Customer Assistant Agent 客戶助理',
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
            bedrockAgentArn: import.meta.env.VITE_AWS_BEDROCK_AGENT_ARN || '',
            sessionId: import.meta.env.VITE_AWS_BEDROCK_SESSION_ID || '',
        },
        {
            id: 'profile2',
            name: '科定人助理',
            title: 'Employee Assistant Agent 科定人助理',
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID_B || '',
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY_B || '',
            bedrockAgentArn: import.meta.env.VITE_AWS_BEDROCK_AGENT_ARN_B || '',
            sessionId: import.meta.env.VITE_AWS_BEDROCK_SESSION_ID_B || '',
        },
        // 若新增設定檔，請在此處新增
    ])

    // 目前啟用的設定檔
    const activeProfile = computed(
        () =>
            profiles.value.find((profile) => profile.id === activeProfileId.value) ||
            profiles.value[0],
    )

    // 操作方法
    const switchProfile = (profileId: string): boolean => {
        // 在 iframe 模式下，如果隱藏選單，則不允許切換設定檔
        if (isIframeMode.value && hideProfileMenu.value) {
            console.warn('Profile switching is disabled in iframe mode')
            return false
        }

        const profile = profiles.value.find((p) => p.id === profileId)
        if (profile) {
            activeProfileId.value = profileId
            return true
        }
        return false
    }

    const getProfileById = (profileId: string): AWSProfile | undefined => {
        return profiles.value.find((profile) => profile.id === profileId)
    }

    // iframe 相關方法
    const setIframeMode = (enabled: boolean): void => {
        isIframeMode.value = enabled
    }

    const setHideProfileMenu = (hide: boolean): void => {
        hideProfileMenu.value = hide
    }

    return {
        // 狀態
        activeProfileId,
        profiles,
        activeProfile,
        isIframeMode,
        hideProfileMenu,

        // 操作方法
        switchProfile,
        getProfileById,
        setIframeMode,
        setHideProfileMenu,
    }
})