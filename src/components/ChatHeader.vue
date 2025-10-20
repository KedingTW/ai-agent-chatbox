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
        <!-- <template v-if="!isMoblie">
            <div class="chatHeaderLogo">
                <img
                    src="/images/096bca4d-b3d4-4087-9e74-6d534396cf97.png"
                    alt="Logo"
                    class="chatHeaderLogoImg"
                />
            </div>
            <div class="chatHeaderContent">
                <h2 class="chatHeaderTitle">{{ title }}</h2>
            </div>
            <div class="d-flex justify-content-end">
                <div class="chatStatus d-flex align-items-center small">
                    <span :class="getStatusIndicatorClass()"></span>
                    {{ connectionStatusText }}
                </div>
                <CDropdown variant="nav-item" dark>
                    <CDropdownToggle :caret="false" class="changeMenu"><i class="bi bi-list"></i></CDropdownToggle>
                    <CDropdownMenu>
                        <CDropdownItem href="#">設定檔1</CDropdownItem>
                        <CDropdownItem href="#">設定檔2</CDropdownItem>
                    </CDropdownMenu>
                </CDropdown>
            </div>
        </template>
        <template v-else>
            <div class="w-100 chatHeaderLogo">
                <img
                    src="/images/096bca4d-b3d4-4087-9e74-6d534396cf97.png"
                    alt="Logo"
                    class="chatHeaderLogoImg"
                />
            </div>
            <div class="w-100 d-flex justify-content-between align-items-center">
                <h2 class="chatHeaderTitle">{{ title }}</h2>
                <div class="d-flex justify-content-end">
                    <div class="chatStatus d-flex align-items-center small">
                        <span :class="getStatusIndicatorClass()"></span>
                        {{ connectionStatusText }}
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
        </template> -->
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatHeaderProps } from '@/types'
import { useMobileHelper } from '@/helpers/common'

interface Props extends ChatHeaderProps {
    isConnected: boolean
    isInitializing: boolean
    isStreaming: boolean
}

const props = withDefaults(defineProps<Props>(), {
    title: 'AI Assistant',
    isConnected: false,
    isInitializing: false,
    isStreaming: false,
})

const { isMoblie } = useMobileHelper()

const connectionStatusText = computed(() => {
    if (props.isInitializing) return '連線中...'
    if (!props.isConnected) return '已斷線'
    if (props.isStreaming) return '正在回應中...'
    return '已上線'
})

const getStatusIndicatorClass = () => {
    const baseClass = 'statusBox'
    if (props.isInitializing) return `${baseClass} statusBoxConnecting`
    if (!props.isConnected) return `${baseClass} statusBoxDisconnected`
    if (props.isStreaming) return `${baseClass} statusBoxStreaming`
    return `${baseClass} statusBoxConnected`
}
</script>
