<template>
    <div
        :class="messageClasses"
        :aria-label="`Message from ${message.sender} at ${formattedTimestamp}`"
        role="article"
    >
        <div :class="avatarClasses">
            <div :class="avatarIconClasses">
                {{ message.sender === 'user' ? '👤' : '🤖' }}
            </div>
        </div>

        <div :class="contentClasses">
            <div :class="bubbleClasses">
                <!-- User messages: plain text -->
                <div v-if="isUserMessage" :class="textClasses">
                    {{ message.content }}
                </div>

                <!-- Agent messages: markdown rendering -->
                <div v-else :class="textClasses">
                    <VMarkdownView
                        :content="message.content"
                        :mode="markdownMode"
                        class="markdown-content"
                    />
                </div>

                <!-- Streaming indicator -->
                <div
                    v-if="isStreaming && message.isStreaming"
                    :class="streamingIndicatorClasses"
                    aria-label="Message is being generated"
                >
                    <span class="streaming-dot"></span>
                    <span class="streaming-dot"></span>
                    <span class="streaming-dot"></span>
                </div>
            </div>

            <!-- Timestamp -->
            <div :class="timestampClasses" :title="fullTimestamp">
                {{ formattedTimestamp }}
            </div>

            <!-- Retry button for failed messages -->
            <button
                v-if="showRetryButton"
                class="message-retry-button btn btn-sm btn-outline-secondary"
                @click="handleRetry"
                :aria-label="`Retry sending message: ${message.content}`"
                type="button"
            >
                🔄 Retry
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VMarkdownView } from 'vue3-markdown'
import 'vue3-markdown/dist/vue3-markdown.css'
import type { MessageItemProps } from '@/types'

// Props
const props = withDefaults(defineProps<MessageItemProps>(), {
    isStreaming: false,
})

// Emits
const emit = defineEmits<{
    retry: [messageId: string]
}>()

// Computed properties
const isUserMessage = computed(() => props.message.sender === 'user')
const isAgentMessage = computed(() => props.message.sender === 'agent')
const isMessageFailed = computed(() => !props.message.isComplete && !props.message.isStreaming)

const formattedTimestamp = computed(() => {
    const date = new Date(props.message.timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const fullTimestamp = computed(() => {
    const date = new Date(props.message.timestamp)
    return date.toLocaleString()
})

const showRetryButton = computed(() => isMessageFailed.value && isUserMessage.value)

// Markdown configuration for AI responses
const markdownMode = computed(() => 'light' as const)

// CSS Classes
const messageClasses = computed(() => [
    'message-item',
    {
        'message-item--user': isUserMessage.value,
        'message-item--agent': isAgentMessage.value,
        'message-item--streaming': props.isStreaming && props.message.isStreaming,
        'message-item--failed': isMessageFailed.value,
    },
])

const avatarClasses = computed(() => [
    'message-avatar',
    {
        'message-avatar--user': isUserMessage.value,
        'message-avatar--agent': isAgentMessage.value,
    },
])

const avatarIconClasses = computed(() => [
    'message-avatar__icon',
    {
        'message-avatar__icon--user': isUserMessage.value,
        'message-avatar__icon--agent': isAgentMessage.value,
    },
])

const contentClasses = computed(() => [
    'message-content',
    {
        'message-content--user': isUserMessage.value,
        'message-content--agent': isAgentMessage.value,
    },
])

const bubbleClasses = computed(() => [
    'message-bubble',
    {
        'message-bubble--user': isUserMessage.value,
        'message-bubble--agent': isAgentMessage.value,
        'message-bubble--streaming': props.isStreaming && props.message.isStreaming,
        'message-bubble--failed': isMessageFailed.value,
    },
])

const textClasses = computed(() => [
    'message-text',
    {
        'message-text--user': isUserMessage.value,
        'message-text--agent': isAgentMessage.value,
    },
])

const timestampClasses = computed(() => [
    'message-timestamp',
    {
        'message-timestamp--user': isUserMessage.value,
        'message-timestamp--agent': isAgentMessage.value,
    },
])

const streamingIndicatorClasses = computed(() => [
    'streaming-indicator',
    {
        'streaming-indicator--visible': props.isStreaming && props.message.isStreaming,
    },
])

// Event handlers
const handleRetry = () => {
    if (props.onRetry) {
        props.onRetry(props.message.id)
    }
    emit('retry', props.message.id)
}
</script>

<style scoped>
.message-item {
    display: flex;
    margin-bottom: 1rem;
    max-width: 100%;
    animation: messageAppear 0.3s ease-out;
}

.message-item--user {
    justify-content: flex-end;
}

.message-item--agent {
    justify-content: flex-start;
}

.message-item--streaming {
    animation: none;
}

.message-item--failed {
    opacity: 0.7;
}

.message-avatar {
    flex-shrink: 0;
    margin: 0 0.5rem;
    order: 1;
}

.message-item--user .message-avatar {
    order: 2;
}

.message-avatar__icon {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    background-color: var(--cui-gray-200);
    color: var(--cui-gray-700);
}

.message-avatar__icon--user {
    background-color: var(--cui-primary);
    color: white;
}

.message-avatar__icon--agent {
    background-color: var(--cui-secondary);
    color: white;
}

.message-content {
    flex: 1;
    max-width: 70%;
    order: 2;
}

.message-item--user .message-content {
    order: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.message-bubble {
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    word-wrap: break-word;
    position: relative;
    transition: all 0.2s ease;
}

.message-bubble--user {
    background-color: var(--cui-primary);
    color: white;
    border-bottom-right-radius: 0.25rem;
}

.message-bubble--agent {
    background-color: #fff;
    color: var(--cui-gray-800);
    border-bottom-left-radius: 0.25rem;
    border: 1px solid var(--cui-gray-200);
}

.message-bubble--streaming {
    border-color: var(--cui-info);
    box-shadow: 0 0 0 2px rgba(var(--cui-info-rgb), 0.1);
}

.message-bubble--failed {
    border-color: var(--cui-danger);
    background-color: rgba(var(--cui-danger-rgb), 0.1);
}

.message-text--user {
    color: white;
}

.message-text--agent {
    color: var(--cui-gray-800);
}

.message-timestamp {
    font-size: 0.75rem;
    color: var(--cui-gray-500);
    margin-top: 0.25rem;
    cursor: help;
}

.message-timestamp--user {
    text-align: right;
}

.message-timestamp--agent {
    text-align: left;
}

.streaming-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: 0.5rem;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.streaming-indicator--visible {
    opacity: 1;
}

.streaming-dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.4;
    animation: streamingPulse 1.4s infinite ease-in-out;
}

.streaming-dot:nth-child(1) {
    animation-delay: -0.32s;
}

.streaming-dot:nth-child(2) {
    animation-delay: -0.16s;
}

.message-retry-button {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    align-self: flex-start;
}

.message-item--user .message-retry-button {
    align-self: flex-end;
}

/* Animations */
@keyframes messageAppear {
    from {
        opacity: 0;
        transform: translateY(1rem);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes streamingPulse {
    0%,
    80%,
    100% {
        opacity: 0.4;
        transform: scale(1);
    }

    40% {
        opacity: 1;
        transform: scale(1.2);
    }
}

/* Responsive design */
@media (max-width: 768px) {
    .message-content {
        max-width: 85%;
    }

    .message-avatar {
        margin: 0 0.25rem;
    }

    .message-avatar__icon {
        width: 1.5rem;
        height: 1.5rem;
        font-size: 0.875rem;
    }

    .message-bubble {
        padding: 0.5rem 0.75rem;
    }
}

/* High contrast mode */
@media (prefers-contrast: high) {
    .message-bubble--agent {
        border-width: 2px;
    }

    .message-bubble--user {
        border: 2px solid var(--cui-primary-dark);
    }
}

/* Markdown content styling */
.markdown-content {
    line-height: 1.6;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
    margin: 0.5rem 0;
    font-weight: 600;
}

.markdown-content :deep(p) {
    margin: 0.5rem 0;
}

.markdown-content :deep(p:first-child) {
    margin-top: 0;
}

.markdown-content :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
}

.markdown-content :deep(li) {
    margin: 0.25rem 0;
}

.markdown-content :deep(code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875em;
}

.message-bubble--user .markdown-content :deep(code) {
    background-color: rgba(255, 255, 255, 0.2);
}

.markdown-content :deep(pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 0.5rem 0;
}

.message-bubble--user .markdown-content :deep(pre) {
    background-color: rgba(255, 255, 255, 0.1);
}

.markdown-content :deep(pre code) {
    background-color: transparent;
    padding: 0;
}

.markdown-content :deep(blockquote) {
    border-left: 3px solid var(--cui-gray-300);
    padding-left: 1rem;
    margin: 0.5rem 0;
    font-style: italic;
    color: var(--cui-gray-600);
}

.message-bubble--user .markdown-content :deep(blockquote) {
    border-left-color: rgba(255, 255, 255, 0.5);
    color: rgba(255, 255, 255, 0.9);
}

.markdown-content :deep(a) {
    color: var(--cui-primary);
    text-decoration: underline;
}

.message-bubble--user .markdown-content :deep(a) {
    color: rgba(255, 255, 255, 0.9);
}

.markdown-content :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
    font-size: 0.875em;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
    border: 1px solid var(--cui-gray-300);
    padding: 0.375rem 0.5rem;
    text-align: left;
}

.markdown-content :deep(th) {
    background-color: var(--cui-gray-100);
    font-weight: 600;
}

.message-bubble--user .markdown-content :deep(th),
.message-bubble--user .markdown-content :deep(td) {
    border-color: rgba(255, 255, 255, 0.3);
}

.message-bubble--user .markdown-content :deep(th) {
    background-color: rgba(255, 255, 255, 0.1);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .message-item {
        animation: none;
    }

    .streaming-dot {
        animation: none;
        opacity: 0.7;
    }

    .message-bubble {
        transition: none;
    }
}
</style>
