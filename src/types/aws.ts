/**
 * AWS Bedrock Agent Runtime types and interfaces
 */

export interface AWSConfig {
    region: string
    agentArn: string
    sessionId: string
}

export interface Message {
    id: string
    content: string
    sender: 'user' | 'agent'
    timestamp: Date
    isStreaming?: boolean
    isComplete?: boolean
}

export interface ChatState {
    messages: Message[]
    isStreaming: boolean
    currentStreamingMessageId: string | null
    error: string | null
    isConnected: boolean
}

export interface AWSError {
    code: string
    message: string
    statusCode?: number
}

export type MessageSender = 'user' | 'agent'

// Streaming event types
export interface StreamEvent {
    event?: {
        contentBlockDelta?: {
            delta?: {
                text?: string
            }
        }
        chunk?: {
            bytes?: Uint8Array
        }
        messageStart?: boolean
        messageStop?: boolean
        contentBlockStart?: boolean
        contentBlockStop?: boolean
    }
    contentBlockDelta?: {
        delta?: {
            text?: string
        }
    }
    chunk?: {
        bytes?: Uint8Array
    }
    messageStart?: boolean
    messageStop?: boolean
    contentBlockStart?: boolean
    contentBlockStop?: boolean
    text?: string
    content?: string | unknown
}

// Streaming state types
export type StreamingState = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error'

export interface StreamingStatus {
    state: StreamingState
    messageId: string | null
    progress: number // 0-100 percentage
    error: AWSError | null
}

// Error handling utility types
export type ErrorType =
    | 'network'
    | 'authentication'
    | 'api'
    | 'streaming'
    | 'validation'
    | 'unknown'

export interface ErrorContext {
    type: ErrorType
    code: string
    message: string
    details?: Record<string, unknown>
    timestamp: Date
    retryable: boolean
}

export interface UserMessage extends Message {
    sender: 'user'
    isStreaming: false
    isComplete: true
}

export interface AgentMessage extends Message {
    sender: 'agent'
    isStreaming?: boolean
    isComplete?: boolean
    streamingProgress?: number
}

// Chat session types
export interface ChatSession {
    id: string
    startTime: Date
    lastActivity: Date
    messageCount: number
    isActive: boolean
}

// API response types
export interface SendMessageResponse {
    success: boolean
    messageId: string
    error?: ErrorContext
    response?: string
    sessionId?: string
    duration?: number
    streamingResponse?: ReadableStream | unknown
}

// Connection status
export interface ConnectionStatus {
    isConnected: boolean
    lastConnected: Date | null
    connectionAttempts: number
    latency: number | null
}
