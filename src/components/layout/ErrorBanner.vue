<template>
    <div
        v-if="error"
        class="errorBanner alert alert-danger d-flex justify-content-between align-items-center"
        role="alert"
        aria-live="assertive"
    >
        <div class="errorBannerContent">
            <span class="errorBannerIcon"><i class="bi bi-exclamation-triangle-fill"></i></span>
            <div class="errorBannerText">
                <div class="errorBannerTitle">Connection Error</div>
                <div class="errorBannerMessage">{{ error.message }}</div>
            </div>
        </div>
        <div class="errorBannerActions">
            <button
                class="btn btn-sm btn-outline-danger"
                @click="handleReload"
                type="button"
                aria-label="Dismiss error"
            >
                ✕
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useStateStore } from '@/stores/state'
import { computed } from 'vue'

const stateStore = useStateStore()
const error = computed(() => stateStore.error)
const handleReload = () => {
    window.location.reload()
}
</script>
