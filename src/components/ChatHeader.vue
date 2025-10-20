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
        <div class="col-6 col-md-4 chatHeaderTitle">
            <!-- Title -->
            <h2 class="tt">{{ title }}</h2>
        </div>
        <div class="col-6 col-md-4 chatHeaderMenu">
            <!-- Status、Menu -->
            <div class="chatStatus">
                <span :class="getStatusIndicatorClass()" class="statusBox">
                    {{ connectionStatusText }}
                </span>
            </div>
            <CDropdown variant="nav-item" dark>
                <CDropdownToggle :caret="false" class="changeMenu"><i class="bi bi-list"></i></CDropdownToggle>
                <CDropdownMenu>
                    <CDropdownItem href="#">設定檔1</CDropdownItem>
                    <CDropdownItem href="#">設定檔2</CDropdownItem>
                </CDropdownMenu>
            </CDropdown>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMobileHelper } from '@/helpers/common'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

const { isMoblie } = useMobileHelper()

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
</script>
