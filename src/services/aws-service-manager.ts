/**
 * AWS 服務管理器
 * 單例服務，管理 AWS 服務實例並處理設定檔切換
 */

import { AWSBedrockService } from './aws-bedrock'
import { useConfigStore } from '@/stores/config'
import type { ErrorContext, Result } from '@/types'
import type { AWSProfile } from '@/types/aws'

export class AWSServiceManager {
    private static instance: AWSServiceManager | null = null
    private bedrockService: AWSBedrockService | null = null
    private currentProfileId: string | null = null

    private constructor() {
        // 單例模式的私有建構函數
    }

    /**
     * 取得單例實例
     */
    static getInstance(): AWSServiceManager {
        if (!AWSServiceManager.instance) {
            AWSServiceManager.instance = new AWSServiceManager()
        }
        return AWSServiceManager.instance
    }

    /**
     * 使用目前啟用的設定檔初始化服務
     */
    async initialize(): Promise<Result<boolean, ErrorContext>> {
        try {
            const configStore = useConfigStore()
            const activeProfile = configStore.activeProfile

            if (!activeProfile) {
                throw new Error('No active profile found')
            }

            return await this.switchProfile(activeProfile.id)
        } catch (error) {
            const errorContext: ErrorContext = {
                type: 'api',
                code: 'SERVICE_MANAGER_INIT_FAILED',
                message: error instanceof Error ? error.message : 'Service manager initialization failed',
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
     * 切換到不同的設定檔並重新初始化服務
     */
    async switchProfile(profileId: string): Promise<Result<boolean, ErrorContext>> {
        try {
            const configStore = useConfigStore()
            const profile = configStore.getProfileById(profileId)

            if (!profile) {
                throw new Error(`Profile with ID '${profileId}' not found`)
            }

            // 驗證設定檔配置
            if (!this.validateProfile(profile)) {
                throw new Error(`Profile '${profile.name}' has invalid configuration`)
            }

            // 釋放現有服務
            this.dispose()

            // 使用設定檔特定配置和憑證初始化新的 Bedrock 服務
            this.bedrockService = new AWSBedrockService(profile)

            // 等待服務準備就緒
            const isReady = await this.bedrockService.isReady()
            if (!isReady) {
                throw new Error('AWS Bedrock service failed to initialize')
            }

            this.currentProfileId = profileId

            return {
                success: true,
                data: true,
            }
        } catch (error) {
            const errorContext: ErrorContext = {
                type: 'validation',
                code: 'PROFILE_SWITCH_FAILED',
                message: error instanceof Error ? error.message : 'Profile switching failed',
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
     * 取得目前的 Bedrock 服務實例
     */
    getBedrockService(): AWSBedrockService | null {
        return this.bedrockService
    }

    /**
     * 取得目前的設定檔 ID
     */
    getCurrentProfileId(): string | null {
        return this.currentProfileId
    }

    /**
     * 檢查服務是否準備就緒
     */
    async isReady(): Promise<boolean> {
        if (!this.bedrockService) {
            return false
        }

        return await this.bedrockService.isReady()
    }

    /**
     * 重新連接目前的服務
     */
    async reconnect(): Promise<Result<boolean, ErrorContext>> {
        if (!this.bedrockService) {
            return await this.initialize()
        }

        return await this.bedrockService.reconnect()
    }

    /**
     * 驗證設定檔配置
     */
    private validateProfile(profile: AWSProfile): boolean {
        return !!(
            profile.accessKeyId &&
            profile.secretAccessKey &&
            profile.bedrockAgentArn &&
            profile.sessionId
        )
    }

    /**
     * 釋放所有服務並清理資源
     */
    dispose(): void {
        if (this.bedrockService) {
            this.bedrockService.dispose()
            this.bedrockService = null
        }
        this.currentProfileId = null
    }
}

export const awsServiceManager = AWSServiceManager.getInstance()
