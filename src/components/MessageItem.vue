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
