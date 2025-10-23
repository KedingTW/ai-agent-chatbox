/**
 * Utility types for the chat application
 */

// Generic result type for operations that can fail
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E }

// Event handler type
export type EventHandler<T = void> = (event: T) => void | Promise<void>
