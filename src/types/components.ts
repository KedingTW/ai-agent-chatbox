/**
 * Component-specific types and interfaces
 */

import type { Message } from './aws'
import type { BaseComponentProps, EventHandler } from '@/types'

// Message component props
export interface MessageItemProps extends BaseComponentProps {
    message: Message
    isStreaming?: boolean
    showTimestamp?: boolean
    showAvatar?: boolean
    onRetry?: EventHandler<string>
}

// Message list component props
export interface MessageListProps extends BaseComponentProps {
    messages: Message[]
    isStreaming?: boolean
}

// Message input component props
export interface MessageInputProps extends BaseComponentProps {
    disabled?: boolean
    placeholder?: string
    maxLength?: number
    multiline?: boolean
}

// Loading overlay component props
export interface LoadingOverlayProps extends BaseComponentProps {
    isVisible: boolean
    ariaLabel?: string
}
