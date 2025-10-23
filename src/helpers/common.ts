import { ref, onMounted, onUnmounted, computed, type ComputedRef, type Ref } from 'vue'
import Swal from 'sweetalert2'

// 定義斷點
const MOBILE_BREAKPOINT = 768

interface MobileHelperReturn {
    isMobile: ComputedRef<boolean>
    windowWidth: Ref<number>
}

/**
 * 響應式地檢查當前視窗寬度是否屬於行動裝置尺寸
 * @author Sherry
 */
export function useMobileHelper(): MobileHelperReturn {
    const windowWidth = ref(window.innerWidth)

    const handleResize = (): void => {
        windowWidth.value = window.innerWidth
    }

    onMounted(() => {
        window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', handleResize)
    })

    // 透過計算屬性判斷是否為行動裝置
    const isMobile = computed(() => windowWidth.value <= MOBILE_BREAKPOINT)

    return {
        isMobile,
        windowWidth,
    }
}

// popMsgHelper 使用 SweetAlert2
type SweetAlertIcon = 'warning' | 'error' | 'info' | 'success' | 'confirm' | 'question'
type SweetAlertResult = Promise<any>

interface PopMsgBtnInfo {
    confirmBtnText?: string
    discardBtnText?: string
}

interface PopMsgHelperOptions {
    status: SweetAlertIcon
    msg: string
    statusCode?: number | string
    title?: string
    btnInfo?: PopMsgBtnInfo
}

/**
 * SweetAlert 彈跳視窗輔助函數
 * @param options - 彈窗配置選項
 * @param options.status - icon圖示/行為模式 (warning/error/info/success/confirm/question)
 * @param options.msg - 內容
 * @param options.statusCode - 狀態碼 (可選)
 * @param options.title - 大標題 (可選)
 * @param options.btnInfo - 確認/取消按鈕文字資訊 (可選)
 * @returns 根據 status 模式回傳 SweetAlert2 的 Promise 或 void
 * @author Sherry
 */
export const popMsgHelper = ({
    status,
    msg,
    statusCode = '',
    title = '',
    btnInfo,
}: PopMsgHelperOptions): SweetAlertResult | void => {
    const statusCodeText = statusCode ? `statusCode:${statusCode}` : ''

    // 確認與取消按鈕顏色統一控制
    const swalWithCustomButtons = Swal.mixin({
        customClass: {
            confirmButton: 'btn-primary',
            cancelButton: 'btn-secondary',
        },
    })

    const formatMessage = (message: string, code: string, separator = ''): string => {
        if (!code) return message
        return separator ? `${code}${separator}${message}` : `${code}${message}`
    }

    switch (status) {
        case 'warning':
            return swalWithCustomButtons.fire({
                title,
                text: formatMessage(msg, statusCodeText),
                icon: 'warning',
            })

        case 'error':
            return swalWithCustomButtons.fire({
                title,
                text: formatMessage(msg, statusCodeText, ','),
                icon: 'error',
            })

        case 'info':
            return swalWithCustomButtons.fire({
                title,
                text: formatMessage(msg, statusCodeText, ','),
                icon: 'info',
            })

        case 'success':
            return swalWithCustomButtons.fire({
                title,
                text: formatMessage(msg, statusCodeText),
                icon: 'success',
                showConfirmButton: false,
                timer: 1000,
            })

        case 'confirm':
            return swalWithCustomButtons.fire({
                title,
                text: msg,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: btnInfo?.confirmBtnText || '是',
                cancelButtonText: btnInfo?.discardBtnText || '否',
            })

        case 'question':
            return swalWithCustomButtons.fire({
                title,
                text: msg,
                icon: 'question',
            })

        default:
            return swalWithCustomButtons.fire({
                title,
                text: msg,
                icon: undefined,
            })
    }
}

// 向後兼容的重載函數
export const popMsg = (
    status: SweetAlertIcon,
    msg: string,
    statusCode: number | string = '',
    title: string = '',
    btnInfo?: PopMsgBtnInfo,
): SweetAlertResult | void => {
    return popMsgHelper({ status, msg, statusCode, title, btnInfo })
}