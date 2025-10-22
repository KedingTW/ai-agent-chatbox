<template>
    <div :class="containerClasses">
        <form @submit.prevent="handleSubmit" class="messageInputForm">
            <!-- Input field -->
            <div class="messageInputGroup">
                <textarea
                    ref="textareaRef"
                    v-model="inputValue"
                    :class="textareaClasses"
                    :placeholder="placeholder"
                    :disabled="chatStore.isStreaming || disabled || !chatStore.canSendMessage"
                    rows="3"
                    @keydown="handleKeyDown"
                    @focus="handleFocus"
                    @blur="handleBlur"
                    @compositionstart="handleCompositionStart"
                    @compositionend="handleCompositionEnd"
                    aria-label="Type your message"
                />
                <button
                    v-if="!chatStore.isStreaming"
                    :class="sendButtonClasses"
                    :disabled="!chatStore.canSendMessage"
                    type="submit"
                    :aria-label="sendButtonLabel"
                >
                    <span v-if="disabled" class="spinner-border spinner-border-sm"></span>
                    <span v-else>
                        <i v-if="chatStore.canSendMessage" class="bi bi-send-fill"></i>
                    </span>
                </button>
                <button
                    v-else
                    class="messageInputSendBtn"
                    @click="handleCancelStreaming"
                    type="button"
                    aria-label="Cancel current response"
                >
                    <i class="bi bi-square-fill"></i>
                </button>
            </div>

            <!-- Error message -->
            <div
                v-if="errorMessage"
                class="errorMessage text-danger mt-2"
                role="alert"
                aria-live="assertive"
            >
                {{ errorMessage }}
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MessageInputProps } from '@/types'
import { useChatStore } from '@/stores/chat'

// Props
const props = withDefaults(defineProps<MessageInputProps>(), {
    maxLength: 4000,
    multiline: true,
})

// Emits
const emit = defineEmits<{
    'send-message': [message: string]
    typing: [isTyping: boolean]
    focus: []
    blur: []
}>()

const chatStore = useChatStore()

// Refs
const textareaRef = ref<HTMLTextAreaElement>()

// State
const inputValue = ref('')
const isFocused = ref(false)
const isTyping = ref(false)
const errorMessage = ref('')
const showKeyboardHelp = ref(false)
const isComposing = ref(false)

// Computed properties
const characterCount = computed(() => inputValue.value.length)

const trimmedValue = computed(() => inputValue.value.trim())
const canSend = computed(() => {
    const result =
        chatStore.canSendMessage &&
        trimmedValue.value.length > 0 &&
        characterCount.value <= (props.maxLength || 4000) &&
        !errorMessage.value

    return result
})

const placeholder = computed(() => {
    if (chatStore.isInitializing) return '連線中...'
    if (!chatStore.isConnected) return '已斷線'
    if (chatStore.isStreaming) return '回應中'
    return '請說明你的問題...'
})

const sendButtonLabel = computed(() => {
    if (!chatStore.canSendMessage) return 'Sending message...'
    if (!canSend.value) return 'Cannot send message'
    return 'Send message'
})

// CSS Classes
const containerClasses = computed(() => [
    'messageInput',
    {
        messageInputDisabled: !chatStore.canSendMessage,
        messageInputFocused: isFocused.value,
        messageInputError: !!errorMessage.value,
    },
])

const textareaClasses = computed(() => [
    'form-control',
    'messageInputTextarea',
    {
        'is-invalid': !!errorMessage.value,
        messageInputTextareaMultiline: props.multiline,
        messageInputTextareaSingle: !props.multiline,
    },
])

const sendButtonClasses = computed(() => [
    'messageInputSendBtn',
    {
        canSend: canSend.value,
        noSend: !canSend.value,
    },
])

// Methods
const handleSubmit = () => {
    if (!canSend.value) {
        console.log('Cannot send - canSend is false')
        return
    }

    const message = trimmedValue.value
    if (message) {
        emit('send-message', message)
        clearInput()
    } else {
        console.log('No message to send')
    }
}

const handleKeyDown = (event: KeyboardEvent) => {
    // console.log('Key pressed:', event.key, 'Shift:', event.shiftKey, 'Composing:', isComposing.value)

    // Handle Enter key - but not during IME composition (Chinese input)
    if (event.key === 'Enter' && !event.shiftKey && !isComposing.value) {
        event.preventDefault()
        handleSubmit()
        return
    }

    // Shift+Enter: new line (default behavior)
    if (event.key === 'Enter' && event.shiftKey) {
        console.log('Shift+Enter pressed, allowing new line')
        return
    }

    // Handle Escape key
    if (event.key === 'Escape') {
        textareaRef.value?.blur()
        return
    }
}

const handleFocus = () => {
    isFocused.value = true
    showKeyboardHelp.value = true
    emit('focus')
}

const handleBlur = () => {
    isFocused.value = false
    showKeyboardHelp.value = false
    setTyping(false)
    emit('blur')
}

const handleCompositionStart = () => {
    isComposing.value = true
}

const handleCompositionEnd = () => {
    isComposing.value = false
}
const handleCancelStreaming = () => {
    chatStore.stopStreaming()
}

const setTyping = (typing: boolean) => {
    if (isTyping.value !== typing) {
        isTyping.value = typing
        emit('typing', typing)
    }
}

const validateInput = () => {
    errorMessage.value = ''

    if (characterCount.value > props.maxLength) {
        errorMessage.value = `Message is too long (${characterCount.value}/${props.maxLength} characters)`
    }
}

const clearInput = () => {
    inputValue.value = ''
    errorMessage.value = ''
    setTyping(false)

    if (textareaRef.value) {
        textareaRef.value.innerText = ''
        textareaRef.value.style.height = 'auto'
    }
}

const focusInput = () => {
    textareaRef.value?.focus()
}

// Watch for external disabled state changes
watch(
    () => chatStore.canSendMessage,
    (disabled) => {
        if (disabled) {
            setTyping(false)
        }
    },
)

// Expose methods for parent components
defineExpose({
    focus: focusInput,
    clear: clearInput,
    getValue: () => inputValue.value,
    setValue: (value: string) => {
        inputValue.value = value
        validateInput()
    },
})
</script>
