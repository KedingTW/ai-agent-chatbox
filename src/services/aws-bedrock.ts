/**
 * AWS Bedrock Agent Runtime Service
 * Handles AWS Bedrock client initialization, connection testing, and configuration management
 */

import {
    BedrockAgentCoreClient,
    InvokeAgentRuntimeCommand,
    type InvokeAgentRuntimeCommandInput,
    type InvokeAgentRuntimeCommandOutput,
} from '@aws-sdk/client-bedrock-agentcore'
import type {
    AWSConfig,
    ErrorContext,
    SendMessageResponse,
    ConnectionStatus,
    Result,
    StreamEvent,
} from '@/types'
import { isValidAWSConfig, classifyError, assertIsAWSConfig } from '@/types'
import {
    loadAWSConfig,
    validateAWSConfig,
    getAWSCredentialsConfig,
    validateAWSCredentials,
} from '@/config/aws'

export class AWSBedrockService {
    private client: BedrockAgentCoreClient | null = null
    private config: AWSConfig
    private connectionStatus: ConnectionStatus
    private initializationPromise: Promise<void> | null = null

    constructor(customConfig?: Partial<AWSConfig>) {
        // Load and validate configuration
        this.config = customConfig ? { ...loadAWSConfig(), ...customConfig } : loadAWSConfig()

        // Initialize connection status
        this.connectionStatus = {
            isConnected: false,
            lastConnected: null,
            connectionAttempts: 0,
            latency: null,
        }

        // Validate configuration
        this.validateConfiguration()

        // Initialize client asynchronously
        this.initializationPromise = this.initializeClient()
    }

    /**
     * Validate AWS configuration and credentials
     */
    private validateConfiguration(): void {
        try {
            // Validate configuration structure
            assertIsAWSConfig(this.config)

            if (!validateAWSConfig(this.config)) {
                throw new Error('AWS configuration validation failed')
            }

            // Validate credentials
            const credentialsValidation = validateAWSCredentials()
            if (!credentialsValidation.isValid) {
                throw new Error(
                    `AWS credentials validation failed: ${credentialsValidation.errors.join(', ')}`,
                )
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Invalid AWS configuration'
            throw new Error(`AWS Bedrock Service initialization failed: ${errorMessage}`)
        }
    }

    /**
     * Initialize the AWS Bedrock client
     */
    private async initializeClient(): Promise<void> {
        try {
            this.client = new BedrockAgentCoreClient({
                region: this.config.region,
                ...getAWSCredentialsConfig(),
                maxAttempts: 3,
                requestHandler: {
                    requestTimeout: 30000, // 30 seconds
                },
            })

            // Mark as connected - actual connection will be tested on first API call
            this.updateConnectionStatus({ isConnected: true })
        } catch (error) {
            this.updateConnectionStatus({ isConnected: false })
            const errorMessage =
                error instanceof Error ? error.message : 'Client initialization failed'
            throw new Error(`AWS Bedrock client initialization failed: ${errorMessage}`)
        }
    }

    /**
     * Ensure the client is initialized before use
     */
    private async ensureInitialized(): Promise<void> {
        if (this.initializationPromise) {
            await this.initializationPromise
            this.initializationPromise = null
        }

        if (!this.client) {
            throw new Error('AWS Bedrock client is not initialized')
        }
    }

    /**
     * Update connection status
     */
    private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
        this.connectionStatus = { ...this.connectionStatus, ...updates }

        if (updates.isConnected === true) {
            this.connectionStatus.lastConnected = new Date()
            this.connectionStatus.connectionAttempts = 0
        } else if (updates.isConnected === false) {
            this.connectionStatus.connectionAttempts++
        }
    }

    /**
     * Get current AWS configuration
     */
    getConfig(): AWSConfig {
        return { ...this.config }
    }

    /**
     * Get current connection status
     */
    getConnectionStatus(): ConnectionStatus {
        return { ...this.connectionStatus }
    }

    /**
     * Check if the service is ready to use
     */
    async isReady(): Promise<boolean> {
        try {
            await this.ensureInitialized()
            return this.connectionStatus.isConnected && this.client !== null
        } catch {
            return false
        }
    }

    /**
     * Reconnect to AWS Bedrock
     */
    async reconnect(): Promise<Result<boolean, ErrorContext>> {
        try {
            this.client = null
            this.initializationPromise = this.initializeClient()
            await this.initializationPromise
            this.initializationPromise = null

            return {
                success: true,
                data: this.connectionStatus.isConnected,
            }
        } catch (error) {
            const errorContext: ErrorContext = {
                type: classifyError(error),
                code: 'RECONNECTION_FAILED',
                message: error instanceof Error ? error.message : 'Reconnection failed',
                timestamp: new Date(),
                retryable: true,
            }

            return {
                success: false,
                error: errorContext,
            }
        }
    }

    /**
     * Update configuration and reinitialize client
     */
    async updateConfig(newConfig: Partial<AWSConfig>): Promise<Result<boolean, ErrorContext>> {
        try {
            const updatedConfig = { ...this.config, ...newConfig }

            // Validate new configuration
            if (!isValidAWSConfig(updatedConfig)) {
                throw new Error('Invalid configuration provided')
            }

            this.config = updatedConfig
            return await this.reconnect()
        } catch (error) {
            const errorContext: ErrorContext = {
                type: 'validation',
                code: 'CONFIG_UPDATE_FAILED',
                message: error instanceof Error ? error.message : 'Configuration update failed',
                timestamp: new Date(),
                retryable: false,
            }

            return {
                success: false,
                error: errorContext,
            }
        }
    }

    /**
     * Get the initialized client (for internal use)
     */
    async getClient(): Promise<BedrockAgentCoreClient> {
        await this.ensureInitialized()
        if (!this.client) {
            throw new Error('AWS Bedrock client is not available')
        }
        return this.client
    }

    /**
     * Dispose of the service and clean up resources
     */
    dispose(): void {
        this.client = null
        this.initializationPromise = null
        this.updateConnectionStatus({ isConnected: false })
    }

    /**
     * Create InvokeAgentRuntimeCommand with proper configuration
     */
    private createInvokeAgentRuntimeCommand(message: string): InvokeAgentRuntimeCommandInput {
        const commandInput = {
            runtimeSessionId: this.config.sessionId,
            agentRuntimeArn: this.config.agentArn,
            qualifier: 'DEFAULT', // Optional
            payload: new TextEncoder().encode(JSON.stringify({ prompt: message })), // Convert string to Uint8Array
        }

        return commandInput
    }

    /**
     * Send a message and handle streaming response
     */
    async sendMessageWithStreaming(
        message: string,
        sessionId?: string,
        onChunk?: (chunk: string) => void,
        onComplete?: () => void,
        onError?: (error: ErrorContext) => void,
    ): Promise<SendMessageResponse> {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

        // Basic message validation
        if (!message || !message.trim()) {
            const errorContext: ErrorContext = {
                type: 'validation',
                code: 'INVALID_MESSAGE',
                message: 'Message cannot be empty',
                timestamp: new Date(),
                retryable: false,
            }
            onError?.(errorContext)
            return {
                success: false,
                messageId,
                error: errorContext,
            }
        }

        try {
            // Ensure client is ready
            await this.ensureInitialized()
            const client = await this.getClient()

            // Create command
            const commandInput = this.createInvokeAgentRuntimeCommand(message)
            const command = new InvokeAgentRuntimeCommand(commandInput)

            // Send the message and get streaming response
            const startTime = Date.now()
            const response: InvokeAgentRuntimeCommandOutput = await client.send(command)

            // Update connection status
            this.updateConnectionStatus({ isConnected: true })

            // Handle streaming response
            if (!response.response) {
                throw new Error('No response stream received from AWS Bedrock')
            }
            // Check if it's a ReadableStream
            if (
                response.response instanceof ReadableStream ||
                (response.response && typeof response.response.getReader === 'function')
            ) {
                await this.processReadableStream(response.response, onChunk, onComplete, onError)
            } else if (response.response.transformToString) {
                // Fallback to transformToString method
                const textResponse = await response.response.transformToString()
                await this.parseSSEResponse(textResponse, onChunk, onComplete, onError)
            } else {
                throw new Error('Unsupported response format')
            }

            const duration = Date.now() - startTime
            this.updateConnectionStatus({ latency: duration })

            return {
                success: true,
                messageId,
                sessionId: response.runtimeSessionId || sessionId || this.config.sessionId,
                duration,
                streamingResponse: response.response,
            }
        } catch (error) {
            this.updateConnectionStatus({ isConnected: false })

            const errorContext: ErrorContext = {
                type: classifyError(error),
                code: this.getErrorCode(error),
                message: this.getErrorMessage(error),
                details: {
                    originalError: error instanceof Error ? error.message : String(error),
                },
                timestamp: new Date(),
                retryable: ['network', 'api'].includes(classifyError(error)),
            }

            onError?.(errorContext)
            return {
                success: false,
                messageId,
                error: errorContext,
            }
        }
    }

    /**
     * Process ReadableStream response
     */
    private async processReadableStream(
        stream: ReadableStream,
        onChunk?: (chunk: string) => void,
        onComplete?: () => void,
        onError?: (error: ErrorContext) => void,
    ): Promise<void> {
        try {
            const reader = stream.getReader()
            const decoder = new TextDecoder('utf-8')
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()

                if (done) {
                    // Process any remaining data in buffer
                    if (buffer.trim()) {
                        this.processSSEBuffer(buffer, onChunk)
                    }
                    onComplete?.()
                    break
                }

                // Decode the chunk and add to buffer
                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk

                // Process complete SSE events (separated by double newlines)
                const events = buffer.split('\n\n')

                // Keep the last incomplete event in buffer
                buffer = events.pop() || ''

                // Process complete events
                for (const event of events) {
                    if (event.trim()) {
                        this.processSSEBuffer(event, onChunk)
                    }
                }
            }
        } catch (error) {
            const errorContext: ErrorContext = {
                type: 'streaming',
                code: 'READABLE_STREAM_ERROR',
                message:
                    error instanceof Error ? error.message : 'ReadableStream processing failed',
                timestamp: new Date(),
                retryable: false,
            }
            onError?.(errorContext)
        }
    }

    /**
     * Process SSE buffer content
     */
    private processSSEBuffer(eventData: string, onChunk?: (chunk: string) => void): void {
        try {
            // Parse each SSE event
            const lines = eventData.split('\n')
            let data = ''

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    data = line.substring(6) // Remove 'data: ' prefix
                    break
                }
            }

            if (data) {
                // Look for contentBlockDelta text pattern
                const textMatch = data.match(/'contentBlockDelta':\s*\{[^}]*'text':\s*'([^']*)'/)
                if (textMatch && textMatch[1]) {
                    // Decode escaped characters
                    const text = textMatch[1]
                        .replace(/\\\\n/g, '\n')
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t')
                        .replace(/\\'/g, "'")
                        .replace(/\\"/g, '"')
                    onChunk?.(text)
                }
                const toolUseMatch = data.match(/'stopReason':\s*'tool_use'/)
                if (toolUseMatch) {
                    // 如果是 'tool_use' 停止事件，輸出特定的 markdown 提示
                    const toolUseMessage = '\n> 資料查詢中...請稍候\n\n'
                    onChunk?.(toolUseMessage)
                }
            }
        } catch (error) {
            console.warn('Error processing SSE buffer:', error, eventData.substring(0, 100) + '...')
        }
    }

    /**
     * Parse Server-Sent Events response format
     */
    private async parseSSEResponse(
        sseText: string,
        onChunk?: (chunk: string) => void,
        onComplete?: () => void,
        onError?: (error: ErrorContext) => void,
    ): Promise<void> {
        try {
            // Split by double newlines to get individual events
            const events = sseText.split('\n\n').filter((event) => event.trim())

            for (const event of events) {
                try {
                    // Parse each SSE event
                    const lines = event.split('\n')
                    let eventData = ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            eventData = line.substring(6) // Remove 'data: ' prefix
                            break
                        }
                    }

                    if (eventData) {
                        // Try to extract text content directly using regex for Python dict format
                        try {
                            // Look for contentBlockDelta text pattern
                            const textMatch = eventData.match(
                                /'contentBlockDelta':\s*\{[^}]*'text':\s*'([^']*)'/,
                            )
                            if (textMatch && textMatch[1]) {
                                // Decode escaped characters
                                const text = textMatch[1]
                                    .replace(/\\n/g, '\n')
                                    .replace(/\\t/g, '\t')
                                    .replace(/\\'/g, "'")
                                    .replace(/\\"/g, '"')
                                onChunk?.(text)
                            } else {
                                // Try to parse as JSON for other formats
                                try {
                                    const parsedData = JSON.parse(eventData)
                                    const textContent = this.extractTextFromEvent(parsedData)
                                    if (textContent) {
                                        onChunk?.(textContent)
                                    }
                                } catch {
                                    // If all parsing fails, silently continue
                                }
                            }
                        } catch (parseError) {
                            console.warn('Error processing event:', parseError)
                        }
                    }
                } catch (eventError) {
                    console.warn('Error parsing SSE event:', eventError, event)
                }
            }

            onComplete?.()
        } catch (error) {
            const errorContext: ErrorContext = {
                type: 'streaming',
                code: 'SSE_PARSING_ERROR',
                message: error instanceof Error ? error.message : 'SSE parsing failed',
                timestamp: new Date(),
                retryable: false,
            }
            onError?.(errorContext)
        }
    }

    /**
     * Extract text content from parsed event data
     */
    private extractTextFromEvent(eventData: StreamEvent): string | null {
        // Handle different event types
        if (eventData.event) {
            const event = eventData.event

            // Handle contentBlockDelta events
            if (event.contentBlockDelta?.delta?.text) {
                return event.contentBlockDelta.delta.text
            }

            // Handle chunk events
            if (event.chunk?.bytes) {
                const decoder = new TextDecoder('utf-8')
                return decoder.decode(new Uint8Array(event.chunk.bytes))
            }

            // Handle messageStart, messageStop, etc.
            if (
                event.messageStart ||
                event.messageStop ||
                event.contentBlockStart ||
                event.contentBlockStop
            ) {
                return null // These are control events, no text content
            }
        }

        // If it's a simple text response
        if (typeof eventData === 'string') {
            return eventData
        }

        return null
    }

    /**
     * Get error code from AWS error
     */
    private getErrorCode(error: unknown): string {
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
    private getErrorMessage(error: unknown): string {
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
            if (
                error.message.includes('NetworkingError') ||
                error.message.includes('TimeoutError')
            ) {
                return 'Network connection failed. Please check your internet connection.'
            }

            return error.message
        }

        return 'An unknown error occurred while sending the message.'
    }

    /**
     * Cancel an ongoing request (placeholder for future implementation)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async cancelRequest(_messageId: string): Promise<boolean> {
        // This would be implemented to cancel ongoing requests
        // For now, it's a placeholder
        return false
    }
}
