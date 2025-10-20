/**
 * Component-specific types and interfaces
 */

import type { Message, ErrorContext } from './aws'
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
}

// Message input component props
export interface MessageInputProps extends BaseComponentProps {
    disabled?: boolean
    placeholder?: string
    maxLength?: number
    multiline?: boolean
}

// Error banner component props
export interface ErrorBannerProps extends BaseComponentProps {
    error: ErrorContext | null
}

// Global error component props
export interface GlobalErrorProps extends BaseComponentProps {
    error: ErrorContext | null
}

// Loading overlay component props
export interface LoadingOverlayProps extends BaseComponentProps {
    isVisible: boolean
    ariaLabel?: string
}

// Component emit types
export interface MessageItemEmits {
    retry: [messageId: string]
}

export interface MessageListEmits {
    messageRetry: [messageId: string]
}

export interface MessageInputEmits {
    'send-message': [message: string]
    typing: [isTyping: boolean]
    focus: []
    blur: []
}

export interface ErrorBannerEmits {
    retry: []
    dismiss: []
}

export interface GlobalErrorEmits {
    reload: []
    dismiss: []
}

export interface ChatHeaderEmits {
    clear: []
    settings: []
}

// Component expose types for template refs
export interface MessageInputExpose {
    focus: () => void
    clear: () => void
    getValue: () => string
    setValue: (value: string) => void
}

export interface MessageListExpose {
    scrollToBottom: (smooth?: boolean) => Promise<void>
    isAtBottom: () => boolean
}

// UI state types
export interface StreamingIndicatorState {
    isVisible: boolean
    text?: string
    canCancel?: boolean
}

export interface ConnectionStatusState {
    isConnected: boolean
    isInitializing: boolean
    isStreaming: boolean
    statusText: string
    statusClass: string
}

// Component configuration types
export interface MarkdownConfig {
    mode: 'light' | 'dark'
    enableHtml?: boolean
    enableBreaks?: boolean
    enableLinkify?: boolean
}

export interface ScrollConfig {
    autoScroll: boolean
    smooth: boolean
    threshold: number
    tolerance: number
}

// Accessibility types
export interface AriaLabels {
    messageFrom: (sender: string, timestamp: string) => string
    sendMessage: string
    retryMessage: (content: string) => string
    scrollToBottom: string
    dismissError: string
    connectionStatus: (status: string) => string
}

// Animation and transition types
export interface AnimationConfig {
    enableAnimations: boolean
    streamingDuration: number
    scrollDuration: number
    fadeInDuration: number
}

// Responsive breakpoint types
export interface ResponsiveConfig {
    mobile: number
    tablet: number
    desktop: number
}

// Theme and styling types
export interface ComponentTheme {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    textColor: string
    borderColor: string
    borderRadius: string
}

// Component size variants
export type ComponentSize = 'sm' | 'md' | 'lg'
export type ComponentVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'

// Layout types
export interface LayoutConfig {
    showHeader: boolean
    showFooter: boolean
    showSidebar: boolean
    containerMaxWidth: string
    containerHeight: string
}

// Performance optimization types
export interface VirtualScrollConfig {
    enabled: boolean
    itemHeight: number
    bufferSize: number
    threshold: number
}

// Error handling types for components
export interface ComponentErrorBoundary {
    onError: (error: Error, errorInfo: string) => void
    fallbackComponent?: string
    resetOnPropsChange?: boolean
}
