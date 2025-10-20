<template>
    <div :class="containerClasses">
        <form @submit.prevent="handleSubmit" class="message-input-form">
            <!-- Input field -->
            <div class="input-group message-input__group">
                <textarea
                    ref="textareaRef"
                    v-model="inputValue"
                    :class="textareaClasses"
                    :placeholder="placeholder"
                    :disabled="disabled"
                    rows="3"
                    @keydown="handleKeyDown"
                    @focus="handleFocus"
                    @blur="handleBlur"
                    @compositionstart="handleCompositionStart"
                    @compositionend="handleCompositionEnd"
                    aria-label="Type your message"
                />

                <!-- Send button -->
                <button
                    :class="sendButtonClasses"
                    type="submit"
                    :disabled="!canSend"
                    :aria-label="sendButtonLabel"
                >
                    <span v-if="disabled" class="spinner-border spinner-border-sm"></span>
                    <span v-else>{{ sendButtonText }}</span>
                </button>
            </div>

            <!-- Error message -->
            <div
                v-if="errorMessage"
                class="error-message text-danger mt-2"
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

// Props
const props = withDefaults(defineProps<MessageInputProps>(), {
    disabled: false,
    placeholder: 'Type your message...',
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
        !props.disabled &&
        trimmedValue.value.length > 0 &&
        characterCount.value <= (props.maxLength || 4000) &&
        !errorMessage.value

    return result
})

const sendButtonText = computed(() => {
    if (props.disabled) return ''
    return '📤'
})

const sendButtonLabel = computed(() => {
    if (props.disabled) return 'Sending message...'
    if (!canSend.value) return 'Cannot send message'
    return 'Send message'
})

// CSS Classes
const containerClasses = computed(() => [
    'message-input',
    {
        'message-input--disabled': props.disabled,
        'message-input--focused': isFocused.value,
        'message-input--error': !!errorMessage.value,
    },
])

const textareaClasses = computed(() => [
    'form-control',
    'message-input__textarea',
    {
        'is-invalid': !!errorMessage.value,
        'message-input__textarea--multiline': props.multiline,
        'message-input__textarea--single': !props.multiline,
    },
])

const sendButtonClasses = computed(() => [
    'btn',
    'message-input__send-button',
    {
        'btn-primary': canSend.value,
        'btn-outline-secondary': !canSend.value,
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
        textareaRef.value.style.height = 'auto'
    }
}

const focusInput = () => {
    textareaRef.value?.focus()
}

// Watch for external disabled state changes
watch(
    () => props.disabled,
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

<style scoped>
.message-input {
    background-color: white;
    border-radius: 0.5rem;
    padding: 1rem;
    border: 1px solid var(--cui-gray-200);
    transition: all 0.2s ease;
}

/* .message-input--focused styles removed */

.message-input--disabled {
    background-color: var(--cui-gray-50);
    opacity: 0.7;
}

.message-input--error {
    border-color: var(--cui-danger);
}

.message-input-form {
    width: 100%;
}

.message-input__group {
    margin-bottom: 0;
}

.message-input__textarea {
    border-right: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    resize: none;
    min-height: 2.5rem;
    line-height: 1.5;
    font-family: inherit;
    transition: height 0.2s ease;
}

.message-input__textarea--single {
    overflow: hidden;
}

.message-input__textarea--multiline {
    overflow-y: auto;
}

.message-input__textarea:focus {
    /* Border color change removed */
    box-shadow: none;
}

.message-input__textarea::placeholder {
    color: var(--cui-gray-500);
    font-style: italic;
}

.message-input__send-button {
    border-left: none;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    min-width: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    transition: all 0.2s ease;
}

.message-input__send-button:hover:not(:disabled) {
    transform: translateY(-1px);
}

.message-input__send-button:active {
    transform: translateY(0);
}

.message-input__status {
    min-height: 1.25rem;
}

.character-count {
    font-variant-numeric: tabular-nums;
}

.typing-indicator {
    font-size: 0.75rem;
    color: var(--cui-info);
    font-style: italic;
}

.error-message {
    font-size: 0.75rem;
    margin: 0;
}

.keyboard-help {
    opacity: 0;
    transform: translateY(-0.5rem);
    transition: all 0.3s ease;
}

.message-input--focused .keyboard-help {
    opacity: 1;
    transform: translateY(0);
}

kbd {
    background-color: var(--cui-gray-100);
    border: 1px solid var(--cui-gray-300);
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    font-size: 0.75rem;
    font-family: monospace;
}

/* Scrollbar styling for textarea */
.message-input__textarea::-webkit-scrollbar {
    width: 4px;
}

.message-input__textarea::-webkit-scrollbar-track {
    background: transparent;
}

.message-input__textarea::-webkit-scrollbar-thumb {
    background: var(--cui-gray-300);
    border-radius: 2px;
}

.message-input__textarea::-webkit-scrollbar-thumb:hover {
    background: var(--cui-gray-400);
}

/* Responsive design */
@media (max-width: 768px) {
    .message-input {
        padding: 0.75rem;
    }

    .message-input__send-button {
        min-width: 2.5rem;
        font-size: 0.875rem;
    }

    .keyboard-help {
        display: none;
    }
}

/* High contrast mode */
@media (prefers-contrast: high) {
    .message-input {
        border-width: 2px;
    }

    .message-input__textarea {
        border-width: 2px;
    }

    .message-input__send-button {
        border-width: 2px;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .message-input {
        transition: none;
    }

    .message-input__textarea {
        transition: none;
    }

    .message-input__send-button {
        transition: none;
    }

    .message-input__send-button:hover:not(:disabled) {
        transform: none;
    }

    .keyboard-help {
        transition: none;
    }
}

/* Focus styles for accessibility */
.message-input__send-button:focus-visible {
    outline: 2px solid var(--cui-primary);
    outline-offset: 2px;
}

.message-input__textarea:focus-visible {
    /* Outline color change removed */
    outline: none;
}
</style>
