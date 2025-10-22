<template>
    <div
        :class="messageClasses"
        :aria-label="`Message from ${message.sender} at ${formattedTimestamp}`"
        role="article"
    >
        <div :class="avatarClasses">
            <div :class="avatarIconClasses">
                <span v-if="message.sender === 'user'">
                    <i class="bi bi-person-fill"></i>
                </span>
                <span v-else>
                    {{ '🤖' }}
                </span>
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
                        class="markdownContent"
                    />
                </div>

                <!-- Streaming indicator -->
                <div
                    v-if="isStreaming && message.isStreaming"
                    :class="streamingIndicatorClasses"
                    aria-label="Message is being generated"
                >
                    <span class="streamingDot"></span>
                    <span class="streamingDot"></span>
                    <span class="streamingDot"></span>
                </div>
            </div>

            <!-- Timestamp -->
            <div :class="timestampClasses" :title="fullTimestamp">
                {{ formattedTimestamp }}
            </div>

            <!-- Retry button for failed messages -->
            <button
                v-if="showRetryButton"
                class="messageRetryButton btn btn-sm btn-outline-secondary"
                @click="handleRetry"
                :aria-label="`Retry sending message: ${message.content}`"
                type="button"
            >
                <i class="bi bi-arrow-clockwise"></i>
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
    'messageItem',
    {
        'messageItemUser': isUserMessage.value,
        'messageItemAgent': isAgentMessage.value,
        'messageItemStreaming': props.isStreaming && props.message.isStreaming,
        'messageItemFailed': isMessageFailed.value,
    },
])

const avatarClasses = computed(() => [
    'messageAvatar',
    {
        'messageAvatarUser': isUserMessage.value,
        'messageAvatarAgent': isAgentMessage.value,
    },
])

const avatarIconClasses = computed(() => [
    'messageAvatarIcon',
    {
        'messageAvatarIconUser': isUserMessage.value,
        'messageAvatarIconAgent': isAgentMessage.value,
    },
])

const contentClasses = computed(() => [
    'messageContent',
    {
        'messageContent--user': isUserMessage.value,
        'messageContent--agent': isAgentMessage.value,
    },
])

const bubbleClasses = computed(() => [
    'messageBubble',
    {
        'messageBubbleUser': isUserMessage.value,
        'messageBubbleAgent': isAgentMessage.value,
        'messageBubbleStreaming': props.isStreaming && props.message.isStreaming,
        'messageBubbleFailed': isMessageFailed.value,
    },
])

const textClasses = computed(() => [
    'messageText',
    {
        'messageTextUser': isUserMessage.value,
        'messageTextAgent': isAgentMessage.value,
    },
])

const timestampClasses = computed(() => [
    'messageTimestamp',
    {
        'messageTimestampUser': isUserMessage.value,
        'messageTimestampAgent': isAgentMessage.value,
    },
])

const streamingIndicatorClasses = computed(() => [
    'streamingIndicator',
    {
        'streamingIndicatorVisible': props.isStreaming && props.message.isStreaming,
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
.messageItem {
    display: flex;
    margin-bottom: 1rem;
    max-width: 100%;
    animation: messageAppear 0.3s ease-out;
}

.messageItemUser {
    justify-content: flex-end;
}

.messageItemAgent {
    justify-content: flex-start;
}

.messageItemStreaming {
    animation: none;
}

.messageItemFailed {
    opacity: 0.7;
}

.messageAvatar {
    flex-shrink: 0;
    margin: 0 0.5rem;
    order: 1;
}

.messageItemUser .messageAvatar {
    order: 2;
}

.messageAvatarIcon {
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

.messageAvatarIconUser {
    background-color: var(--cui-primary);
    color: white;
}

.messageAvatarIconAgent {
    background-color: var(--cui-primary-100);
    color: white;
}

.messageContent {
    flex: 1;
    max-width: 70%;
    order: 2;
}

.messageItemUser .messageContent {
    order: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.messageBubble{
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    word-wrap: break-word;
    position: relative;
    transition: all 0.2s ease;
}

.messageBubbleUser {
    background-color: var(--cui-primary);
    color: white;
}

.messageBubbleAgent {
    background-color: #fff;
    color: var(--cui-gray-800);
}

.messageBubbleStreaming {
    border-color: var(--cui-info);
    box-shadow: 0 0 0 2px rgba(var(--cui-info-rgb), 0.1);
}

.messageBubbleFailed {
    border-color: var(--cui-danger);
    background-color: rgba(var(--cui-danger-rgb), 0.1);
}

.messageTextUser {
    color: white;
}

.messageTextAgent {
    color: var(--cui-gray-800);
}

.messageTimestamp {
    font-size: 0.75rem;
    color: var(--cui-gray-500);
    margin-top: 0.25rem;
    cursor: help;
}

.messageTimestampUser {
    text-align: right;
}

.messageTimestampAgent {
    text-align: left;
}

.streamingIndicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: 0.5rem;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.streamingIndicatorVisible {
    opacity: 1;
}

.streamingDot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.4;
    animation: streamingPulse 1.4s infinite ease-in-out;
}

.streamingDot:nth-child(1) {
    animation-delay: -0.32s;
}

.streamingDot:nth-child(2) {
    animation-delay: -0.16s;
}

.messageRetryButton {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    align-self: flex-start;
}

.messageItemUser .messageRetryButton {
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
    .messageContent {
        max-width: 85%;
    }

    .messageAvatar {
        margin: 0 0.25rem;
    }

    .messageAvatarIcon {
        width: 1.5rem;
        height: 1.5rem;
        font-size: 0.875rem;
    }

    .messageBubble {
        padding: 0.5rem 0.75rem;
    }
}

/* High contrast mode */
@media (prefers-contrast: high) {
    .messageBubbleAgent {
        border-width: 2px;
    }

    .messageBubbleUser {
        border: 2px solid var(--cui-primary-dark);
    }
}

/* Markdown content styling */
.markdownContent {
    line-height: 1.6;
}

.markdownContent :deep(h1),
.markdownContent :deep(h2),
.markdownContent :deep(h3),
.markdownContent :deep(h4),
.markdownContent :deep(h5),
.markdownContent :deep(h6) {
    margin: 0.5rem 0;
    font-weight: 600;
}

.markdownContent :deep(p) {
    margin: 0.5rem 0;
}

.markdownContent :deep(p:first-child) {
    margin-top: 0;
}

.markdownContent :deep(p:last-child) {
    margin-bottom: 0;
}

.markdownContent :deep(ul),
.markdownContent :deep(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
}

.markdownContent :deep(li) {
    margin: 0.25rem 0;
}

.markdownContent :deep(code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875em;
}

.messageBubbleUser .markdownContent :deep(code) {
    background-color: rgba(255, 255, 255, 0.2);
}

.markdownContent :deep(pre) {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 0.5rem 0;
}

.messageBubbleUser .markdownContent :deep(pre) {
    background-color: rgba(255, 255, 255, 0.1);
}

.markdownContent :deep(pre code) {
    background-color: transparent;
    padding: 0;
}

.markdownContent :deep(blockquote) {
    border-left: 3px solid var(--cui-gray-300);
    padding-left: 1rem;
    margin: 0.5rem 0;
    font-style: italic;
    color: var(--cui-gray-600);
}

.messageBubbleUser .markdownContent :deep(blockquote) {
    border-left-color: rgba(255, 255, 255, 0.5);
    color: rgba(255, 255, 255, 0.9);
}

.markdownContent :deep(a) {
    color: var(--cui-primary);
    text-decoration: underline;
}

.messageBubbleUser .markdownContent :deep(a) {
    color: rgba(255, 255, 255, 0.9);
}

.markdownContent :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
    font-size: 0.875em;
}

.markdownContent :deep(th),
.markdownContent :deep(td) {
    border: 1px solid var(--cui-gray-300);
    padding: 0.375rem 0.5rem;
    text-align: left;
}

.markdownContent :deep(th) {
    background-color: var(--cui-gray-100);
    font-weight: 600;
}

.messageBubbleUser .markdownContent :deep(th),
.messageBubbleUser .markdownContent :deep(td) {
    border-color: rgba(255, 255, 255, 0.3);
}

.messageBubbleUser .markdownContent :deep(th) {
    background-color: rgba(255, 255, 255, 0.1);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .messageItem {
        animation: none;
    }

    .streamingDot {
        animation: none;
        opacity: 0.7;
    }

    .messageBubble {
        transition: none;
    }
}
</style>
