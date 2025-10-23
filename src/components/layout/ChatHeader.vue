<template>
    <div class="row chatHeader">
        <div class="col-12 col-md-4 chatHeaderLogo">
            <!-- Logo -->
            <img src="/images/KDlogo.png" alt="Logo" class="chatHeaderLogoImg" />
        </div>
        <div class="col-6 col-md-4 chatHeaderTitle">
            <!-- Title -->
            <h2 class="tt">{{ displayTitle }}</h2>
        </div>
        <div class="col-6 col-md-4 chatHeaderMenu">
            <!-- startNewChat、Menu -->
            <!-- Status、Menu -->
            <div class="chatStatus">
                <span :class="getStatusIndicatorClass" class="statusBox">
                    {{ connectionStatusText }}
                </span>
                <CButton color="primary" @click="startNewChat" title="開始新聊天">
                    <span class="me-1" v-if="!isMobile"
                        ><i class="bi bi-plus-circle-dotted"></i
                    ></span>
                    新聊天
                </CButton>
            </div>
            <!-- 只在非 iframe 模式或允許顯示選單時顯示設定檔切換選單 -->
            <CDropdown v-if="shouldShowMenu" variant="nav-item" dark>
                <CDropdownToggle :caret="false" class="changeMenu"
                    ><i class="bi bi-list"></i
                ></CDropdownToggle>
                <CDropdownMenu>
                    <div v-for="profile in profiles" :key="profile.id">
                        <a
                            class="dropdownItem"
                            :class="{ active: profile.id === activeProfileId }"
                            @click.prevent="handleProfileSwitch(profile.id)"
                            href="#"
                            style="cursor: pointer"
                        >
                            {{ profile.name }}
                            <i
                                v-if="profile.id === activeProfileId"
                                class="bi bi-check-lg ms-2 text-white"
                            ></i>
                        </a>
                    </div>
                </CDropdownMenu>
            </CDropdown>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useConfigStore } from '@/stores/config'
import { useStateStore } from '@/stores/state'
import { popMsgHelper, useMobileHelper } from '@/helpers/common'

const configStore = useConfigStore()
const chatStore = useChatStore()
const stateStore = useStateStore()
const { isMobile } = useMobileHelper()

// iframe 配置錯誤狀態
const iframeConfigError = ref<string | null>(null)
const hasValidIframeConfig = ref(true)

// 設定檔管理 - 保持響應性，不要解構
const profiles = computed(() => configStore.profiles)
const activeProfile = computed(() => configStore.activeProfile)
const activeProfileId = computed(() => configStore.activeProfileId)

// iframe 模式相關
const hideProfileMenu = computed(() => configStore.hideProfileMenu)
const shouldShowMenu = computed(() => !hideProfileMenu.value && hasValidIframeConfig.value)

const displayTitle = computed(() => {
    // 目前設定檔title，若無設定檔則顯示預設標題
    return activeProfile.value?.title || 'AI Assistant'
})

const connectionStatusText = computed(() => {
    if (iframeConfigError.value) return '配置錯誤'
    if (stateStore.isInitializing) return '連線中'
    if (stateStore.isStreaming) return '回應中'
    return '已上線'
})

const getStatusIndicatorClass = computed(() => {
    const baseClass = 'statusBox'
    if (iframeConfigError.value) return `${baseClass} statusBoxError`
    if (stateStore.isInitializing) return `${baseClass} statusBoxConnecting`
    if (stateStore.isStreaming) return `${baseClass} statusBoxStreaming`
    return `${baseClass} statusBoxConnected`
})

const startNewChat = async () => {
    if (chatStore.messages.length === 0) {
        return // 如果沒有訊息，不需要確認
    }

    const result = await popMsgHelper({
        status: 'confirm',
        title: '開始新聊天',
        msg: '確定要開始新聊天嗎？這將清除所有聊天記錄。',
        btnInfo: {
            confirmBtnText: '確定',
            discardBtnText: '取消',
        },
    })

    if (result.isConfirmed) {
        chatStore.clearAllData()
    }
}

// 切換設定檔
const handleProfileSwitch = async (profileId: string) => {
    // 點擊設定檔 profileId，目前設定檔 activeProfileId
    // 已是當前設定檔
    if (profileId === activeProfileId.value) return

    try {
        // 設置初始化狀態
        stateStore.isInitializing = true

        // 切換新的設定檔
        const success = configStore.switchProfile(profileId)

        if (success) {
            // 設定檔切換成功，清除聊天記錄
            chatStore.startNewSession()
            // No need to initialize AWS service - it will be created on-demand when sending messages
            chatStore.clearError()
        } else {
            console.error('設定檔切換失敗')
        }
    } catch (error) {
        console.error('切換設定檔時發生錯誤:', error)
        chatStore.setError({
            type: 'validation',
            code: 'PROFILE_SWITCH_ERROR',
            message: error instanceof Error ? error.message : '設定檔切換失敗',
            timestamp: new Date(),
        })
    } finally {
        // 結束初始化狀態
        stateStore.isInitializing = false
    }
}

// 檢查 iframe 配置
onMounted(() => {
    // 檢查 iframe 配置是否有效
    const iframeResult = configStore.getIframeConfiguration()
    if (!iframeResult.success) {
        // iframe 配置無效，設置錯誤狀態
        iframeConfigError.value = iframeResult.error || '配置錯誤'
        hasValidIframeConfig.value = false
        // 設置聊天狀態為錯誤
        chatStore.setError({
            type: 'validation',
            code: 'IFRAME_CONFIG_ERROR',
            message: iframeResult.error || '配置錯誤',
            timestamp: new Date(),
        })
        // 不初始化 AWS 服務
        console.error('iframe 配置錯誤:', iframeResult.error)
    } else {
        // 配置有效，正常初始化
        hasValidIframeConfig.value = true
        iframeConfigError.value = null
    }
})
</script>
