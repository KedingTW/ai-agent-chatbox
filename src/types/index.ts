/**
 * Central export for all type definitions
 */

// AWS and core types
export type {
    AWSConfig,
    Message,
    ChatState,
    AWSError,
    MessageSender,
    StreamEvent,
    StreamingState,
    StreamingStatus,
    ErrorType,
    ErrorContext,
    UserMessage,
    AgentMessage,
    ChatSession,
    SendMessageResponse,
    ConnectionStatus,
} from './aws'

// Utility types
export type { Result, EventHandler, ValidationResult, BaseComponentProps } from './utils'

// Component types
export type {
    MessageItemProps,
    MessageListProps,
    MessageInputProps,
    ChatContainerProps,
    ChatHeaderProps,
} from './components'

// Type guards and validation utilities
export {
    isUserMessage,
    isAgentMessage,
    isAWSError,
    isValidAWSConfig,
    classifyError,
    sanitizeMessageContent,
    assertIsAWSConfig,
    validateMessage,
    validateMessageContent,
} from './guards'

// Re-export commonly used types with aliases for convenience
export type {
    Message as ChatMessage,
    MessageSender as Sender,
    StreamingState as StreamState,
    ErrorContext as ChatError,
} from './aws'

export type { EventHandler as Handler } from './utils'
