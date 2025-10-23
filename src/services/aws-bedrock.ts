/**
 * AWS Bedrock Agent Runtime Service
 * Handles AWS Bedrock client initialization, connection testing, and configuration management
 */

import {
    BedrockAgentCoreClient,
    InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore'
import type {
    ErrorContext,
    SendMessageResponse,
} from '@/types'
import { classifyError } from '@/types'
import { getAWSCredentialsConfigFromProfile } from '@/config/aws'
import type { AWSProfile } from '@/types/aws'
import { getErrorCode, getErrorMessage } from '@/helpers/aws-bedrock'

export class AWSBedrockService {
    private profile: AWSProfile

    constructor(profile: AWSProfile) {
        if (!profile) {
            throw new Error('Profile is not found.')
        }
        // 確認是否有選擇設定檔
        this.profile = profile
    }

    /**
     * Get the initialized client (for internal use)
     */
    getClient(): BedrockAgentCoreClient {
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
            const startTime = Date.now()
            const client = this.getClient()

            // Send the message and get streaming response
            const { response, runtimeSessionId } = await client.send(
                new InvokeAgentRuntimeCommand({
                    runtimeSessionId: this.profile.sessionId,
                    agentRuntimeArn: this.profile.bedrockAgentArn,
                    qualifier: 'DEFAULT',
                    payload: new TextEncoder().encode(JSON.stringify({ prompt: message })),
                })
            )

            // Handle streaming response
            if (!response) {
                throw new Error('No response stream received from AWS Bedrock')
            }
            // Check if it's a ReadableStream
            if (
                response instanceof ReadableStream ||
                (response && typeof response.getReader === 'function')
            ) {
                await this.processReadableStream(response, onChunk, onComplete, onError)
            } else {
                throw new Error('Unsupported response format')
            }

            return {
                success: true,
                messageId,
                sessionId: runtimeSessionId || sessionId || this.profile.sessionId,
                duration: Date.now() - startTime,
                streamingResponse: response,
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
}
