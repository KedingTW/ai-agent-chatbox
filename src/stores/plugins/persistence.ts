/**
 * Pinia persistence plugin for chat store
 * Automatically saves and restores chat state from localStorage
 */

import type { PiniaPluginContext } from 'pinia'
import type { Message, ChatSession, ConnectionStatus } from '@/types'

interface PersistedChatState {
    messages: Message[]
    currentSession: ChatSession
    connectionStatus: ConnectionStatus
    lastSaved: string
}

const STORAGE_KEY = 'ai-chatbot-state'
const STORAGE_VERSION = '1.0.0'

/**
 * Save state to localStorage
 */
const saveState = (state: PersistedChatState): void => {
    try {
        const dataToSave = {
            version: STORAGE_VERSION,
            timestamp: new Date().toISOString(),
            data: state,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (error) {
        console.warn('Failed to save chat state to localStorage:', error)
    }
}

/**
 * Load state from localStorage
 */
const loadState = (): PersistedChatState | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return null

        const parsed = JSON.parse(stored)

        // Check version compatibility
        if (parsed.version !== STORAGE_VERSION) {
            console.warn('Stored state version mismatch, clearing storage')
            localStorage.removeItem(STORAGE_KEY)
            return null
        }

        // Validate data structure
        if (!parsed.data || !Array.isArray(parsed.data.messages)) {
            console.warn('Invalid stored state structure, clearing storage')
            localStorage.removeItem(STORAGE_KEY)
            return null
        }

        // Convert timestamp strings back to Date objects
        const data = parsed.data as PersistedChatState
        data.messages = data.messages.map((message) => ({
            ...message,
            timestamp: new Date(message.timestamp),
        }))

        if (data.currentSession) {
            data.currentSession.startTime = new Date(data.currentSession.startTime)
            data.currentSession.lastActivity = new Date(data.currentSession.lastActivity)
        }

        if (data.connectionStatus?.lastConnected) {
            data.connectionStatus.lastConnected = new Date(data.connectionStatus.lastConnected)
        }

        return data
    } catch (error) {
        console.warn('Failed to load chat state from localStorage:', error)
        localStorage.removeItem(STORAGE_KEY)
        return null
    }
}

/**
 * Clear persisted state
 */
const clearPersistedState = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
        console.warn('Failed to clear persisted state:', error)
    }
}

/**
 * Pinia plugin for chat persistence
 */
export const chatPersistencePlugin = ({ store }: PiniaPluginContext) => {
    // Only apply to chat store
    if (store.$id !== 'chat') return

    // Load persisted state on store creation
    const persistedState = loadState()
    if (persistedState) {
        // Restore messages
        store.messages = persistedState.messages

        // Restore session (but mark as inactive since it's a reload)
        if (persistedState.currentSession) {
            store.currentSession = {
                ...persistedState.currentSession,
                isActive: false, // Mark as inactive after reload
                lastActivity: new Date(), // Update last activity to now
            }
        }

        // Reset connection status (don't restore connection state)
        store.isConnected = false
        store.connectionStatus = {
            isConnected: false,
            lastConnected: persistedState.connectionStatus?.lastConnected || null,
            connectionAttempts: 0,
            latency: null,
        }

        // Reset streaming state (don't restore streaming)
        store.isStreaming = false
        store.currentStreamingMessageId = null
        store.streamingStatus = {
            state: 'idle',
            messageId: null,
            progress: 0,
            error: null,
        }

        // Clear any errors
        store.error = null

        console.log(`Restored ${persistedState.messages.length} messages from previous session`)
    }

    // Save state whenever it changes
    store.$subscribe(
        (mutation, state) => {
            // Only save if there are messages to persist
            if (state.messages.length > 0) {
                const stateToSave: PersistedChatState = {
                    messages: state.messages,
                    currentSession: state.currentSession,
                    connectionStatus: state.connectionStatus,
                    lastSaved: new Date().toISOString(),
                }
                saveState(stateToSave)
            }
        },
        { detached: true },
    )

    // Add method to manually clear persisted data
    store.clearPersistedData = clearPersistedState

    // Add method to check if data was restored
    store.hasPersistedData = () => persistedState !== null
}

export { clearPersistedState }
