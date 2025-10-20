<template>
    <div v-if="error" class="global-error-overlay" role="alert" aria-live="assertive">
        <div class="global-error-content">
            <div class="global-error-icon">⚠️</div>
            <h2 class="global-error-title">Application Error</h2>
            <p class="global-error-message">{{ error.message }}</p>
            <div class="global-error-actions">
                <button class="btn btn-primary" @click="$emit('reload')" type="button">
                    Reload Application
                </button>
                <button
                    class="btn btn-outline-secondary ms-2"
                    @click="$emit('dismiss')"
                    type="button"
                >
                    Dismiss
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ErrorContext } from '@/types'

interface Props {
    error: ErrorContext | null
}

defineProps<Props>()

defineEmits<{
    reload: []
    dismiss: []
}>()
</script>

<style scoped>
.global-error-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
}

.global-error-content {
    background-color: white;
    border-radius: 0.5rem;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.global-error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.global-error-title {
    color: var(--cui-danger);
    margin-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
}

.global-error-message {
    color: var(--cui-gray-700);
    margin-bottom: 1.5rem;
    line-height: 1.5;
}

.global-error-actions {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

/* Responsive design */
@media (max-width: 768px) {
    .global-error-content {
        padding: 1.5rem;
        margin: 1rem;
    }

    .global-error-actions {
        flex-direction: column;
    }

    .global-error-actions .btn {
        width: 100%;
        margin: 0 !important;
        margin-bottom: 0.5rem !important;
    }

    .global-error-actions .btn:last-child {
        margin-bottom: 0 !important;
    }
}

/* High contrast mode */
@media (prefers-contrast: high) {
    .global-error-content {
        border: 2px solid var(--cui-gray-800);
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .global-error-overlay {
        backdrop-filter: none;
    }
}

/* Print styles */
@media print {
    .global-error-overlay {
        display: none;
    }
}
</style>
