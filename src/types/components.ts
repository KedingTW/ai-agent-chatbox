/**
 * Component-specific types and interfaces
 */

import type { Message } from './aws'
import type { BaseComponentProps, EventHandler } from './utils'

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
    autoScroll?: boolean
    maxHeight?: string
}

// Message input component props
export interface MessageInputProps extends BaseComponentProps {
    disabled?: boolean
    placeholder?: string
    maxLength?: number
    multiline?: boolean
}

// Chat container component props
export interface ChatContainerProps extends BaseComponentProps {
    title?: string
    showHeader?: boolean
    height?: string
    width?: string
}

// Chat header props
export interface ChatHeaderProps extends BaseComponentProps {
    title: string
    subtitle?: string
    isConnected: boolean
    onClear?: EventHandler<void>
    onSettings?: EventHandler<void>
}
