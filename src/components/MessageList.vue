<template>
    <div
        ref="containerRef"
        :class="containerClasses"
        :style="containerStyles"
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
    >
        <!-- Empty state -->
        <div
            v-if="!hasMessages"
            class="empty-state text-center p-4"
            role="status"
            aria-label="No messages yet"
        >
            <div class="empty-state__icon">💬</div>
            <div class="empty-state__title">開始對話吧</div>
            <div class="empty-state__subtitle">隨時詢問客戶資訊，全面掌握決策依據</div>
        </div>

        <!-- Message list -->
        <div
            v-else
            ref="messagesRef"
            class="messages h-100 overflow-auto p-3"
            @scroll="handleScroll"
        >
            <!-- Messages -->
            <MessageItem
                v-for="message in messages"
                :key="message.id"
                :message="message"
                :is-streaming="isStreaming && message.id === currentStreamingMessageId"
                @retry="handleMessageRetry"
            />

            <!-- Scroll to bottom button -->
            <Transition name="scroll-button">
                <button
                    v-if="showScrollButton"
                    class="scroll-to-bottom btn btn-primary btn-sm rounded-circle position-fixed"
                    @click="() => scrollToBottom()"
                    type="button"
                    aria-label="Scroll to bottom of conversation"
                >
                    ↓
                </button>
            </Transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import type { MessageListProps } from '@/types'
import MessageItem from './MessageItem.vue'

// Props
const props = withDefaults(defineProps<MessageListProps>(), {
    isStreaming: false,
    autoScroll: true,
    maxHeight: '400px',
})

// Emits
const emit = defineEmits<{
    messageRetry: [messageId: string]
}>()

// Refs
const containerRef = ref<HTMLElement>()
const messagesRef = ref<HTMLElement>()

// State
const isAtBottom = ref(true)
const showScrollButton = ref(false)
const currentStreamingMessageId = ref<string | null>(null)

// Computed properties
const hasMessages = computed(() => props.messages.length > 0)

const containerClasses = computed(() => [
    'message-list',
    {
        'message-list--empty': !hasMessages.value,
        'message-list--streaming': props.isStreaming,
    },
])

const containerStyles = computed(() => ({
    maxHeight: props.maxHeight,
}))

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

const handleMessageRetry = (messageId: string) => {
    emit('messageRetry', messageId)
}

// Auto-scroll when new messages arrive
watch(
    () => props.messages.length,
    async (newLength, oldLength) => {
        if (newLength > oldLength && props.autoScroll && isAtBottom.value) {
            await nextTick()
            scrollToBottom(true)
        }
    },
)

// Auto-scroll when streaming starts/updates
watch(
    () => props.isStreaming,
    async (isStreaming) => {
        if (isStreaming && props.autoScroll && isAtBottom.value) {
            await nextTick()
            scrollToBottom(false) // Don't animate during streaming for better performance
        }
    },
)

// Track current streaming message
watch(
    () => props.messages,
    (messages) => {
        const streamingMessage = messages.find((m) => m.isStreaming)
        currentStreamingMessageId.value = streamingMessage?.id || null
    },
    { deep: true },
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
    if (hasMessages.value && props.autoScroll) {
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

<style scoped>
.message-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--cui-gray-50);
    border: 1px solid var(--cui-gray-200);
    border-radius: 0.5rem;
    overflow: hidden;
    position: relative;
}

.message-list--empty {
    justify-content: center;
    align-items: center;
}

.message-list--streaming {
    border-color: var(--cui-info);
}

.empty-state {
    color: var(--cui-gray-600);
}

.empty-state__icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.empty-state__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--cui-gray-700);
}

.empty-state__subtitle {
    font-size: 0.875rem;
    color: var(--cui-gray-500);
}

.messages {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
    scroll-behavior: smooth;
}

.messages::-webkit-scrollbar {
    width: 6px;
}

.messages::-webkit-scrollbar-track {
    background: var(--cui-gray-100);
}

.messages::-webkit-scrollbar-thumb {
    background: var(--cui-gray-300);
    border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
    background: var(--cui-gray-400);
}

.load-more-button {
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.load-more-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.scroll-to-bottom {
    bottom: 1rem;
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    font-size: 1rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.scroll-to-bottom:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Transitions */
.scroll-button-enter-active,
.scroll-button-leave-active {
    transition: all 0.3s ease;
}

.scroll-button-enter-from,
.scroll-button-leave-to {
    opacity: 0;
    transform: translateY(1rem) scale(0.8);
}

/* Responsive design */
@media (max-width: 768px) {
    .messages {
        padding: 1rem;
    }

    .scroll-to-bottom {
        bottom: 0.5rem;
        right: 0.5rem;
        width: 2rem;
        height: 2rem;
        font-size: 0.875rem;
    }

    .empty-state__icon {
        font-size: 2rem;
    }

    .empty-state__title {
        font-size: 1rem;
    }

    .empty-state__subtitle {
        font-size: 0.75rem;
    }
}

/* High contrast mode */
@media (prefers-contrast: high) {
    .message-list {
        border-width: 2px;
    }

    .scroll-to-bottom {
        border: 2px solid var(--cui-primary-dark);
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .messages {
        scroll-behavior: auto;
    }

    .scroll-button-enter-active,
    .scroll-button-leave-active {
        transition: none;
    }

    .load-more-button:hover:not(:disabled) {
        transform: none;
    }

    .scroll-to-bottom:hover {
        transform: none;
    }
}

/* Focus styles for accessibility */
.scroll-to-bottom:focus-visible {
    outline: 2px solid var(--cui-primary);
    outline-offset: 2px;
}

.load-more-button:focus-visible {
    outline: 2px solid var(--cui-primary);
    outline-offset: 2px;
}
</style>
