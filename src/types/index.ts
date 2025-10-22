/**
 * Central export for all type definitions
 */

// AWS and core types
export type {
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
export type { Result, EventHandler, BaseComponentProps } from './utils'

// Component types
export type {
    MessageItemProps,
    MessageListProps,
    MessageInputProps,
} from './components'

// Type guards and validation utilities
export {
    isUserMessage,
    isAgentMessage,
    isAWSError,
    classifyError,
    sanitizeMessageContent,
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
