/**
 * AWS Configuration utilities
 */

import type { AWSConfig } from '@/types/aws'

/**
 * Load AWS configuration from environment variables
 */
export function loadAWSConfig(): AWSConfig {
    const region = import.meta.env.VITE_AWS_REGION || 'us-east-1'
    const agentArn = import.meta.env.VITE_AWS_BEDROCK_AGENT_ARN
    const sessionId = Date.now().toString(8) + Date.now().toString(8) + Date.now().toString(8)

    if (!agentArn) {
        throw new Error('VITE_AWS_BEDROCK_AGENT_ARN environment variable is required')
    }

    return {
        region,
        agentArn,
        sessionId,
    }
}

/**
 * Validate AWS configuration
 */
export function validateAWSConfig(config: AWSConfig): boolean {
    return !!(config.region && config.agentArn && config.sessionId)
}

/**
 * Get AWS credentials configuration for SDK
 * Supports multiple credential sources:
 * 1. Environment variables (for development)
 * 2. AWS Cognito Identity Pools (recommended for production)
 * 3. Temporary credentials from backend service
 */
export function getAWSCredentialsConfig() {
    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
    const sessionToken = import.meta.env.VITE_AWS_SESSION_TOKEN

    // If we have explicit credentials, use them
    if (accessKeyId && secretAccessKey) {
        const credentials: {
            accessKeyId: string
            secretAccessKey: string
            sessionToken?: string
        } = {
            accessKeyId,
            secretAccessKey,
        }

        // Add session token if available (for temporary credentials)
        if (sessionToken) {
            credentials.sessionToken = sessionToken
        }

        return { credentials }
    }

    return {}
}

/**
 * Validate AWS credentials availability
 */
export function validateAWSCredentials(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
} {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if we have any credential-related environment variables
    const hasAccessKey = !!(
        import.meta.env.VITE_AWS_ACCESS_KEY_ID || import.meta.env.AWS_ACCESS_KEY_ID
    )
    const hasSecretKey = !!(
        import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || import.meta.env.AWS_SECRET_ACCESS_KEY
    )
    const hasSessionToken = !!(
        import.meta.env.VITE_AWS_SESSION_TOKEN || import.meta.env.AWS_SESSION_TOKEN
    )

    if (hasAccessKey && !hasSecretKey) {
        errors.push('AWS_ACCESS_KEY_ID provided but AWS_SECRET_ACCESS_KEY is missing')
    } else if (!hasAccessKey && hasSecretKey) {
        errors.push('AWS_SECRET_ACCESS_KEY provided but AWS_ACCESS_KEY_ID is missing')
    } else if (hasAccessKey && hasSecretKey) {
        // We have explicit credentials
        if (hasSessionToken) {
            warnings.push('Using temporary AWS credentials (with session token)')
        } else {
            warnings.push('Using permanent AWS credentials (access key + secret)')
        }
    } else {
        warnings.push(
            'No explicit AWS credentials found - relying on default credential chain (Cognito, etc.)',
        )
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    }
}
