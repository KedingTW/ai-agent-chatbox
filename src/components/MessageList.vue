<template>
    <div
        ref="containerRef"
        :class="containerClasses"
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
    >
        <!-- Empty state -->
        <div
            v-if="!hasMessages"
            class="emptyState text-center p-4"
            role="status"
            aria-label="No messages yet"
        >
            <div class="emptyStateIcon"><i class="bi bi-chat-dots-fill"></i></div>
            <div class="emptyStateTitle">開始對話吧</div>
            <div class="emptyStateSubtitle">{{ displayDesc }}</div>
        </div>

        <!-- Message list -->
        <div
            v-else
            ref="messagesRef"
            class="messages h-100 overflow-auto p-3"
            @scroll="handleScroll"
        >
            <!-- Scroll to bottom button -->
            <Transition name="scroll-button">
                <button
                    v-if="showScrollButton"
                    class="scrollToBottom btn btn-primary btn-sm rounded-circle position-fixed"
                    @click="() => scrollToBottom()"
                    type="button"
                    aria-label="Scroll to bottom of conversation"
                >
                    ↓
                </button>
            </Transition>

            <!-- Messages -->
            <MessageItem
                v-for="message in chatStore.messages"
                :key="message.id"
                :message="message"
                :is-streaming="chatStore.messages && message.id === currentStreamingMessageId"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import MessageItem from './MessageItem.vue'
import { useChatStore } from '@/stores/chat'
import { useConfigStore } from '@/stores/config'
import { useStateStore } from '@/stores/state'

const chatStore = useChatStore()
const configStore = useConfigStore()
const stateStore = useStateStore()
const activeProfile = computed(() => configStore.activeProfile)
const displayDesc = computed(() => {
    // 目前設定檔description，若無設定檔則顯示預設標題
    return activeProfile.value?.description || 'AI Assistant'
})
// Props

// Refs
const containerRef = ref<HTMLElement>()
const messagesRef = ref<HTMLElement>()

// State
const isAtBottom = ref(true)
const showScrollButton = ref(false)
const currentStreamingMessageId = ref<string | null>(null)

// Computed properties
const hasMessages = computed(() => chatStore.messages.length > 0)

const containerClasses = computed(() => [
    'messageList',
    {
        messageListEmpty: !hasMessages.value,
        messageListStreaming: stateStore.isStreaming,
    },
])

// Methods
const scrollToBottom = async (smooth: boolean = true) => {
    if (!messagesRef.value) return

    await nextTick()

    const scrollOptions: ScrollToOptions = {
        top: messagesRef.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
    }

    messagesRef.value.scrollTo(scrollOptions)
    isAtBottom.value = true
    showScrollButton.value = false
}

const handleScroll = () => {
    if (!messagesRef.value) return

    const { scrollTop, scrollHeight, clientHeight } = messagesRef.value

    // Check if user is at the bottom (with small tolerance)
    const tolerance = 50
    isAtBottom.value = scrollTop + clientHeight >= scrollHeight - tolerance

    // Show/hide scroll to bottom button
    showScrollButton.value = !isAtBottom.value && hasMessages.value
}

// Auto-scroll when new messages arrive
watch(
    () => chatStore.messages.length,
    async (newLength, oldLength) => {
        if (newLength > oldLength) {
            await nextTick()
            scrollToBottom(true)
        }
    },
)

// Auto-scroll when streaming starts/updates
watch(
    () => stateStore.isStreaming,
    async (isStreaming) => {
        if (isStreaming) {
            await nextTick()
            scrollToBottom(false) // Don't animate during streaming for better performance
        }
    },
)

// Track current streaming message
watch(
    () => chatStore.messages,
    (messages) => {
        const streamingMessage = messages.find((m) => m.isStreaming)
        currentStreamingMessageId.value = streamingMessage?.id || null
    },
    { deep: true },
)

watch(
    // 當AI回復完成後，要滾至最下方
    () => {
        const lastMessage = chatStore.messages[chatStore.messages.length - 1]
        // 我們只需要追蹤 AI agent 的訊息完成狀態
        if (lastMessage && lastMessage.sender === 'agent') {
            return lastMessage.isComplete
        }
        return null // 非 AI 訊息或無訊息時不追蹤
    },
    async (isCompletedNow, wasCompletedBefore) => {
        // 條件判斷：
        // 1. 新狀態是已完成 (isCompletedNow === true)
        // 2. 舊狀態是未完成或不存在 (wasCompletedBefore !== true)
        if (isCompletedNow === true && wasCompletedBefore !== true) {
            // AI 回覆完成，強制滾動到底部 (可以使用動畫)
            await nextTick()
            scrollToBottom(true)
        }
    },
)

// Intersection Observer for auto-scroll optimization
let intersectionObserver: IntersectionObserver | null = null

onMounted(() => {
    // Set up intersection observer to detect when bottom is visible
    if (messagesRef.value) {
        intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        isAtBottom.value = true
                        showScrollButton.value = false
                    }
                })
            },
            { threshold: 0.1 },
        )

        // Create a sentinel element at the bottom
        const sentinel = document.createElement('div')
        sentinel.style.height = '1px'
        messagesRef.value.appendChild(sentinel)
        intersectionObserver.observe(sentinel)
    }

    // Initial scroll to bottom
    if (hasMessages.value) {
        nextTick(() => scrollToBottom(false))
    }
})

onUnmounted(() => {
    if (intersectionObserver) {
        intersectionObserver.disconnect()
    }
})

// Expose methods for parent components
defineExpose({
    scrollToBottom,
    isAtBottom: () => isAtBottom.value,
})
</script>
