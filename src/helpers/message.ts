import type { Message, UserMessage, AgentMessage } from '@/types'

// Message type guards
export function isUserMessage(message: Message): message is UserMessage {
    return message.sender === 'user'
}

export function isAgentMessage(message: Message): message is AgentMessage {
    return message.sender === 'agent'
}

// Validation functions
export function validateMessage(message: Partial<Message>): message is Message {
    return !!(
        message.id &&
        message.content !== undefined &&
        message.sender &&
        message.timestamp &&
        typeof message.id === 'string' &&
        typeof message.content === 'string' &&
        (message.sender === 'user' || message.sender === 'agent') &&
        message.timestamp instanceof Date &&
        // Allow empty content for streaming messages
        (message.content.length > 0 || message.isStreaming === true)
    )
}

export function validateMessageContent(content: string): boolean {
    return typeof content === 'string' && content.trim().length > 0 && content.length <= 4000
}

// Content validation
export function sanitizeMessageContent(content: string): string {
    return content
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .slice(0, 4000) // Limit length
}
