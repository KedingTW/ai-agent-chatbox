<template>
    <div class="row chatHeader">
        <div class="col-12 col-md-4 chatHeaderLogo">
            <!-- Logo -->
            <img
                src="/images/096bca4d-b3d4-4087-9e74-6d534396cf97.png"
                alt="Logo"
                class="chatHeaderLogoImg"
            />
        </div>
        <div class="col-9 col-md-4 chatHeaderTitle">
            <!-- Title -->
            <h2 class="tt">{{ displayTitle }}</h2>
        </div>
        <div class="col-3 col-md-4 chatHeaderMenu">
            <!-- Status、Menu -->
            <div class="chatStatus">
                <span :class="getStatusIndicatorClass()" class="statusBox">
                    {{ connectionStatusText }}
                </span>
            </div>
            <!-- 因功能還沒好先註解 -->
            <!-- <CDropdown variant="nav-item" dark>
                <CDropdownToggle :caret="false" class="changeMenu"
                    ><i class="bi bi-list"></i
                ></CDropdownToggle>
                <CDropdownMenu>
                    <li v-for="profile in profiles" :key="profile.id">
                        <a
                            class="dropdown-item"
                            :class="{ active: profile.id === activeProfileId }"
                            @click.prevent="handleProfileSwitch(profile.id)"
                            href="#"
                            style="cursor: pointer"
                        >
                            {{ profile.name }}
                            <i v-if="profile.id === activeProfileId" class="bi bi-check-lg ms-2"></i>
                        </a>
                    </li>
                </CDropdownMenu>
            </CDropdown> -->
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore, useConfigStore } from '@/stores/chat'
// import { awsServiceManager } from '@/services/aws-service-manager'

const configStore = useConfigStore()
const chatStore = useChatStore()

// Profile management - 保持響應性，不要解構
const profiles = computed(() => configStore.profiles)
const activeProfile = computed(() => configStore.activeProfile)
const activeProfileId = computed(() => configStore.activeProfileId)

const displayTitle = computed(() => {
    // 目前設定檔title，若無設定檔則顯示預設標題
    return activeProfile.value?.title || 'AI Assistant'
})

const connectionStatusText = computed(() => {
    if (chatStore.isInitializing) return '連線中...'
    if (!chatStore.isConnected) return '已斷線'
    if (chatStore.isStreaming) return '正在回應中...'
    return '已上線'
})

const getStatusIndicatorClass = () => {
    const baseClass = 'statusBox'
    if (chatStore.isInitializing) return `${baseClass} statusBoxConnecting`
    if (!chatStore.isConnected) return `${baseClass} statusBoxDisconnected`
    if (chatStore.isStreaming) return `${baseClass} statusBoxStreaming`
    return `${baseClass} statusBoxConnected`
}

// 切換設定檔
const handleProfileSwitch = async (profileId: string) => {
    // 點擊設定檔 profileId，目前設定檔 activeProfileId
    // 已是當前設定檔
    if (profileId === activeProfileId.value) return
    try {
        // 切換新的設定檔
        const success = configStore.switchProfile(profileId)

        if (success) {
            // 設定檔切換成功，清除聊天記錄
            chatStore.startNewSession()

            // 重新初始化 AWS 服務
            // await awsServiceManager.switchProfile(profileId)
        } else {
            console.error('設定檔切換失敗')
        }
    } catch (error) {
        console.error('切換設定檔時發生錯誤:', error)
    }
}
</script>

<style scoped>
.dropdown-item.active {
    background-color: var(--cui-primary);
    color: white;
}

.dropdown-item.active:hover {
    background-color: var(--cui-primary-dark);
    color: white;
}

.bi-check-lg {
    color: white;
}
</style>
