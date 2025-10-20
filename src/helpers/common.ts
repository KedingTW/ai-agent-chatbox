import { ref, onMounted, onUnmounted, computed } from 'vue'
// 定義斷點
const MOBILE_BREAKPOINT = 768

/**
 * 響應式地檢查當前視窗寬度是否屬於行動裝置尺寸
 * @returns {ComputedRef<boolean>} isMobile
 * @author Sherry
 */
export function useMobileHelper() {
    const windowWidth = ref(window.innerWidth)

    const checkWindowWidth = () => {
        windowWidth.value = window.innerWidth
    }

    onMounted(() => {
        window.addEventListener('resize', checkWindowWidth)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', checkWindowWidth)
    })

    // 透過計算屬性判斷是否為行動裝置
    const isMoblie = computed(() => {
        return windowWidth.value <= MOBILE_BREAKPOINT
    })

    // 將響應式狀態返回
    return {
        isMoblie,
        windowWidth, // 可選：如果未來需要更精確的寬度，也可以回傳
    }
}
