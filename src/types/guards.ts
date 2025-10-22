/**
 * Type guards and validation utilities
 */

import type { Message, UserMessage, AgentMessage, AWSError, ErrorContext } from './aws'

// Message type guards
export function isUserMessage(message: Message): message is UserMessage {
    return message.sender === 'user'
}

export function isAgentMessage(message: Message): message is AgentMessage {
    return message.sender === 'agent'
}

// Error type guards
export function isAWSError(error: unknown): error is AWSError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error &&
        typeof (error as AWSError).code === 'string' &&
        typeof (error as AWSError).message === 'string'
    )
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

// Error classification
export function classifyError(error: unknown): ErrorContext['type'] {
    if (isAWSError(error)) {
        if (error.code.includes('Auth') || error.code.includes('Credential')) {
            return 'authentication'
        }
        if (error.code.includes('Network') || error.code.includes('Connection')) {
            return 'network'
        }
        if (error.code.includes('Stream')) {
            return 'streaming'
        }
        return 'api'
    }

    if (error instanceof TypeError || error instanceof SyntaxError) {
        return 'validation'
    }

    return 'unknown'
}

// Content validation
export function sanitizeMessageContent(content: string): string {
    return content
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .slice(0, 4000) // Limit length
}
