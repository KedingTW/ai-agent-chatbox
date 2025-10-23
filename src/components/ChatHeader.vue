<template>
    <div class="chat-header border-bottom">
        <template v-if="!isMoblie">
            <div class="chat-header__logo">
                <img
                    src="/images/096bca4d-b3d4-4087-9e74-6d534396cf97.png"
                    alt="Logo"
                    class="chat-header__logo-img"
                />
            </div>
            <div class="chat-header__content">
                <h2 class="chat-header__title">{{ title }}</h2>
            </div>
            <div class="d-flex align-items-center justify-content-end gap-3">
                <button
                    type="button"
                    class="btn btn-sm btn-outline-light"
                    @click="startNewChat"
                    title="開始新聊天"
                >
                    <span class="me-1">➕</span>
                    新聊天
                </button>
                <div class="chat-status d-flex align-items-center small">
                    <span :class="getStatusIndicatorClass()"></span>
                    {{ connectionStatusText }}
                </div>
            </div>
        </template>
        <template v-else>
            <div class="w-100 chat-header__logo">
                <img
                    src="/images/096bca4d-b3d4-4087-9e74-6d534396cf97.png"
                    alt="Logo"
                    class="chat-header__logo-img"
                />
            </div>
            <div class="w-100 d-flex justify-content-between align-items-center">
                <h2 class="chat-header__title">{{ title }}</h2>
                <div class="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-light"
                        @click="startNewChat"
                        title="開始新聊天"
                    >
                        <span class="me-1">➕</span>
                        新聊天
                    </button>
                    <div class="chat-status d-flex align-items-center small">
                        <span :class="getStatusIndicatorClass()"></span>
                        {{ connectionStatusText }}
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import type { ChatHeaderProps } from '@/types'
import Swal from 'sweetalert2'

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

const chatStore = useChatStore()
const isMoblie = ref(false)
const MOBILE_BREAKPOINT = 768 // 與您的 CSS @media (max-width: 768px) 保持一致

const checkMobile = () => {
    isMoblie.value = window.innerWidth <= MOBILE_BREAKPOINT
}

// 1. 在元件掛載時啟動監聽
onMounted(() => {
    checkMobile() // 初始化檢查
    window.addEventListener('resize', checkMobile)
})

// 2. 在元件銷毀時移除監聽，避免記憶體洩漏
onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
})

const connectionStatusText = computed(() => {
    if (props.isInitializing) return '連線中...'
    if (!props.isConnected) return '已斷線'
    if (props.isStreaming) return '正在回應中...'
    return '已上線'
})

const getStatusIndicatorClass = () => {
    const baseClass = 'status-indicator'
    if (props.isInitializing) return `${baseClass} status-indicator--connecting`
    if (!props.isConnected) return `${baseClass} status-indicator--disconnected`
    if (props.isStreaming) return `${baseClass} status-indicator--streaming`
    return `${baseClass} status-indicator--connected`
}

const startNewChat = async () => {
    if (chatStore.messages.length === 0) {
        return // 如果沒有訊息，不需要確認
    }

    const result = await Swal.fire({
        title: '開始新聊天',
        text: '確定要開始新聊天嗎？這將清除所有聊天記錄。',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        reverseButtons: true,
    })

    if (result.isConfirmed) {
        chatStore.clearAllData()
    }
}
</script>

<style scoped>
.chat-header {
    background-color: #3d4a5d;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 5px;
    align-items: center;
    gap: 1rem;
}
@media (max-width: 768px) {
    .chat-header {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
}

.chat-header__logo {
    display: flex;
    align-items: center;
    justify-content: flex-start;
}

.chat-header__logo-img {
    height: 40px;
    width: auto;
    object-fit: contain;
}

.chat-header__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-width: 0;
    overflow: hidden;
}

.chat-header__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
}

.chat-status {
    color: white;
    gap: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    justify-content: flex-end;
}

.status-indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    display: inline-block;
}

.status-indicator--connected {
    background-color: var(--cui-success);
}

.status-indicator--disconnected {
    background-color: var(--cui-danger);
}

.status-indicator--connecting {
    background-color: var(--cui-warning);
    animation: pulse 1.5s infinite;
}

.status-indicator--streaming {
    background-color: var(--cui-info);
    animation: pulse 1s infinite;
}

/* Animations */
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

/* Responsive design */
@media (max-width: 768px) {
    .chat-header {
        padding: 0.75rem;
    }

    .chat-header__logo-img {
        height: 32px;
    }

    .chat-header__title {
        font-size: 1rem;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .status-indicator--connecting,
    .status-indicator--streaming {
        animation: none;
    }
}
</style>
