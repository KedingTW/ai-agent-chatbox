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
    ErrorContext,
    SendMessageResponse,
    // ConnectionStatus,
} from '@/types'
import { classifyError } from '@/types'
import { getAWSCredentialsConfigFromProfile } from '@/config/aws'
import type { AWSProfile } from '@/types/aws'
import { extractTextFromEvent, getErrorCode, getErrorMessage } from '@/helpers/aws-bedrock'

export class AWSBedrockService {
    private client: BedrockAgentCoreClient | null = null
    // private connectionStatus: ConnectionStatus
    private initializationPromise: Promise<void> | null = null
    private profile: AWSProfile

    constructor(profile: AWSProfile) {
        if (!profile) {
            throw new Error('Profile iss not found.')
        }
        // 確認是否有選擇設定檔
        this.profile = profile
    }

    /**
     * Get the initialized client (for internal use)
     */
    async getClient(): Promise<BedrockAgentCoreClient> {
        const credentialsConfig = getAWSCredentialsConfigFromProfile(this.profile)

        return new BedrockAgentCoreClient({
            region: this.profile.region,
            ...credentialsConfig,
            maxAttempts: 3,
            requestHandler: {
                requestTimeout: 30000, // 30 seconds
            },
        })
    }

    /**
     * Create InvokeAgentRuntimeCommand with proper configuration
     */
    private createInvokeAgentRuntimeCommand(message: string): InvokeAgentRuntimeCommandInput {
        const commandInput = {
            runtimeSessionId: this.profile.sessionId,
            agentRuntimeArn: this.profile.bedrockAgentArn,
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
            const client = await this.getClient()

            // Create command
            const commandInput = this.createInvokeAgentRuntimeCommand(message)
            const command = new InvokeAgentRuntimeCommand(commandInput)

            // Send the message and get streaming response
            const startTime = Date.now()
            const response: InvokeAgentRuntimeCommandOutput = await client.send(command)

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
            console.log('runtimeSessionId', response.runtimeSessionId)
            console.log('sessionId', sessionId)
            console.log('profile.sessionId', this.profile.sessionId)

            return {
                success: true,
                messageId,
                sessionId: response.runtimeSessionId || sessionId || this.profile.sessionId,
                duration,
                streamingResponse: response.response,
            }
        } catch (error) {
            const errorContext: ErrorContext = {
                type: classifyError(error),
                code: getErrorCode(error),
                message: getErrorMessage(error),
                details: {
                    originalError: error instanceof Error ? error.message : String(error),
                },
                timestamp: new Date(),
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
                                    const textContent = extractTextFromEvent(parsedData)
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
            }
            onError?.(errorContext)
        }
    }
}
