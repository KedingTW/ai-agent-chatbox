/**
 * AWS Bedrock Helper Functions
 * Utility functions for processing AWS Bedrock responses and error handling
 */

/**
 * Get error code from AWS error
 */
export function getErrorCode(error: unknown): string {
    if (error && typeof error === 'object' && 'name' in error) {
        return (error as { name: string }).name
    }
    if (error && typeof error === 'object' && 'code' in error) {
        return (error as { code: string }).code
    }
    return 'UNKNOWN_ERROR'
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        // Map common AWS errors to user-friendly messages
        if (
            error.message.includes('UnauthorizedOperation') ||
            error.message.includes('AccessDenied')
        ) {
            return 'Authentication failed. Please check your AWS credentials.'
        }
        if (
            error.message.includes('ThrottlingException') ||
            error.message.includes('TooManyRequests')
        ) {
            return 'Too many requests. Please wait a moment and try again.'
        }
        if (
            error.message.includes('ServiceUnavailable') ||
            error.message.includes('InternalError')
        ) {
            return 'AWS service is temporarily unavailable. Please try again later.'
        }
        if (error.message.includes('ValidationException')) {
            return 'Invalid request format. Please check your message and try again.'
        }
        if (error.message.includes('ResourceNotFound')) {
            return 'AWS Bedrock agent not found. Please check your configuration.'
        }
        if (error.message.includes('NetworkingError') || error.message.includes('TimeoutError')) {
            return 'Network connection failed. Please check your internet connection.'
        }

        return error.message
    }

    return 'An unknown error occurred while sending the message.'
}
