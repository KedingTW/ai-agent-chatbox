/**
 * Component-specific types and interfaces
 */

import type { Message } from './aws'
import type { EventHandler } from '@/types'

// Message component props
export interface MessageItemProps {
    message: Message
    isStreaming?: boolean
    showTimestamp?: boolean
    showAvatar?: boolean
    onRetry?: EventHandler<string>
}

// Message list component props
export interface MessageListProps {
    messages: Message[]
    isStreaming?: boolean
}

// Message input component props
export interface MessageInputProps {
    disabled?: boolean
    placeholder?: string
    maxLength?: number
    multiline?: boolean
}

// Loading overlay component props
export interface LoadingOverlayProps {
    isVisible: boolean
    ariaLabel?: string
}
