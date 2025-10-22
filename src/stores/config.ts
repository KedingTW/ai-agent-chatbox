import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { safeGetIframeConfig, isValidProfileId } from '@/utils/iframe'
import type { AWSProfile } from '@/types/aws'

export const useConfigStore = defineStore('config', () => {
    // iframe 配置 - 使用安全的方式獲取
    const iframeConfigResult = safeGetIframeConfig()
    const iframeConfig = iframeConfigResult.success
        ? iframeConfigResult.config!
        : {
              isIframe: false,
              profileId: null,
              hideMenu: false,
          }

    // 根據 iframe 配置決定初始設定檔
    const getInitialProfileId = (): string | null => {
        // 如果 iframe 配置失敗或是 iframe 模式但沒有有效設定檔，不提供設定檔
        if (
            !iframeConfigResult.success ||
            (iframeConfig.isIframe &&
                (!iframeConfig.profileId || !isValidProfileId(iframeConfig.profileId)))
        ) {
            return null
        }

        // 如果是 iframe 模式且有有效設定檔
        if (
            iframeConfig.isIframe &&
            iframeConfig.profileId &&
            isValidProfileId(iframeConfig.profileId)
        ) {
            return iframeConfig.profileId
        }

        // 非 iframe 模式，使用預設設定檔1
        return 'profile1'
    }

    // 目前啟用的設定檔
    const activeProfileId = ref<string | null>(getInitialProfileId())

    // iframe 相關狀態
    const isIframeMode = ref<boolean>(iframeConfig.isIframe)
    const hideProfileMenu = ref<boolean>(iframeConfig.hideMenu)

    // 可用的設定檔配置
    const profiles = computed<AWSProfile[]>(() => [
        {
            id: 'profile1',
            name: '客戶助理',
            title: 'Customer Assistant Agent 客戶助理',
            description: '隨時詢問客戶資訊，全面掌握決策依據',
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
            region: import.meta.env.VITE_AWS_REGION || '',
            bedrockAgentArn: import.meta.env.VITE_AWS_BEDROCK_AGENT_ARN || '',
            sessionId: import.meta.env.VITE_AWS_BEDROCK_SESSION_ID || '',
        },
        {
            id: 'profile2',
            name: '科定人助理',
            title: 'Employee Assistant Agent 科定人助理',
            description: '隨時詢問科定人資訊',
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID_B || '',
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY_B || '',
            region: import.meta.env.VITE_AWS_REGION || '',
            bedrockAgentArn: import.meta.env.VITE_AWS_BEDROCK_AGENT_ARN_B || '',
            sessionId: import.meta.env.VITE_AWS_BEDROCK_SESSION_ID_B || '',
        },
        // 若新增設定檔，請在此處新增
    ])

    // 目前啟用的設定檔
    const activeProfile = computed(() => {
        if (!activeProfileId.value) {
            return null
        }
        return profiles.value.find((profile) => profile.id === activeProfileId.value) || null
    })

    // 操作方法
    const switchProfile = (profileId: string): boolean => {
        // 如果 iframe 配置失敗，不允許切換設定檔
        if (!iframeConfigResult.success) {
            console.warn('Profile switching is disabled due to iframe configuration error')
            return false
        }

        // 在 iframe 模式下，如果隱藏選單，則不允許切換設定檔
        if (isIframeMode.value && hideProfileMenu.value) {
            console.warn('Profile switching is disabled in iframe mode')
            return false
        }

        const profile = profiles.value.find((p) => p.id === profileId)
        if (profile) {
            activeProfileId.value = profileId
            return true
        }
        return false
    }

    const getProfileById = (profileId: string): AWSProfile | undefined => {
        return profiles.value.find((profile) => profile.id === profileId)
    }

    // iframe 相關方法
    const setIframeMode = (enabled: boolean): void => {
        isIframeMode.value = enabled
    }

    const setHideProfileMenu = (hide: boolean): void => {
        hideProfileMenu.value = hide
    }

    return {
        // 狀態
        activeProfileId,
        profiles,
        activeProfile,
        isIframeMode,
        hideProfileMenu,

        // 操作方法
        switchProfile,
        getProfileById,
        setIframeMode,
        setHideProfileMenu,
    }
})
