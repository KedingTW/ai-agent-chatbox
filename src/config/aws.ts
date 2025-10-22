/**
 * AWS Configuration utilities
 */

import type { AWSProfile } from '@/types/aws'

/**
 * 取得特定設定檔的 AWS 憑證配置
 */
export function getAWSCredentialsConfigFromProfile(profile: AWSProfile) {
    const sessionToken = import.meta.env.VITE_AWS_SESSION_TOKEN

    if (!profile.accessKeyId || !profile.secretAccessKey) {
        throw new Error(`Profile '${profile.name}' is missing AWS credentials`)
    }

    const credentials: {
        accessKeyId: string
        secretAccessKey: string
        sessionToken?: string
    } = {
        accessKeyId: profile.accessKeyId,
        secretAccessKey: profile.secretAccessKey,
    }

    // 如果有會話令牌，加入它（用於臨時憑證）
    if (sessionToken) {
        credentials.sessionToken = sessionToken
    }

    return { credentials }
}
