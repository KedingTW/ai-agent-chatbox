/**
 * Application State Store
 * 管理整體應用程式狀態，例如初始化、連線、串流等應用層級的狀態
 * 不管理太小的狀態，例如 isFocused, isHovered, isExpanded 等 UI 狀態
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ErrorContext } from '@/types'

export const useStateStore = defineStore('state', () => {
    // 只包含實際使用到的核心狀態
    const isInitializing = ref(true)
    const isStreaming = ref(false)
    const error = ref<ErrorContext | null>(null)

    return {
        // State
        isInitializing,
        isStreaming,
        error,
    }
})
