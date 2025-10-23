/**
 * iframe 嵌入相關工具函數
 */

/**
 * 檢測是否在 iframe 中運行
 */
export function isInIframe(): boolean {
    try {
        return window.self !== window.top
    } catch {
        // 如果無法訪問 window.top，通常表示在 iframe 中
        return true
    }
}

/**
 * 支援的設定檔參數名稱
 */
const PROFILE_PARAM_NAMES = ['profile', 'profileId', 'p'] as const

/**
 * 從 URLSearchParams 中獲取設定檔 ID
 */
function getProfileFromParams(params: URLSearchParams): string | null {
    for (const paramName of PROFILE_PARAM_NAMES) {
        const value = params.get(paramName)
        if (value) return value
    }
    return null
}

/**
 * 從 URL 參數中獲取設定檔 ID
 * 支援的參數名稱：profile, profileId, p
 */
export function getProfileIdFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search)
    return getProfileFromParams(urlParams)
}

/**
 * 從 URL hash 中獲取設定檔 ID
 * 例如：#profile=profile1 或 #profile1
 */
export function getProfileIdFromHash(): string | null {
    const hash = window.location.hash.substring(1) // 移除 #

    if (!hash) return null

    // 檢查是否是 key=value 格式
    if (hash.includes('=')) {
        const params = new URLSearchParams(hash)
        return getProfileFromParams(params)
    }

    // 直接使用 hash 作為 profile ID
    return hash
}

/**
 * iframe 配置錯誤類型
 */
export class IframeConfigError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'IframeConfigError'
    }
}

/**
 * 生成建議的 URL（添加 profile 參數）
 */
function generateSuggestedUrl(profileId: string = 'profile1'): string {
    const currentUrl = 'https://sample.com/'
    const separator = currentUrl.includes('?') ? '&' : '?'
    return `${currentUrl}${separator}profile=${profileId}`
}

/**
 * 獲取 iframe 配置
 * 從 URL 參數和 hash 中讀取設定檔資訊
 */
export function getIframeConfig(): {
    isIframe: boolean
    profileId: string | null
    hideMenu: boolean
} {
    const isIframe = isInIframe()
    const profileIdFromUrl = getProfileIdFromUrl()
    const profileIdFromHash = getProfileIdFromHash()

    // 優先使用 URL 參數，其次使用 hash
    const profileId = profileIdFromUrl || profileIdFromHash

    // 如果是 iframe 模式且沒有指定設定檔，拋出錯誤
    if (isIframe && !profileId) {
        throw new IframeConfigError(
            `iframe 模式下必須指定設定檔。請在 URL 中添加 profile 參數，例如：${generateSuggestedUrl()}`,
        )
    }

    // 在 iframe 模式下預設隱藏選單，除非明確指定不隱藏
    const urlParams = new URLSearchParams(window.location.search)
    const showMenu =
        ['true'].includes(urlParams.get('showMenu') || '') ||
        ['true'].includes(urlParams.get('menu') || '')
    const hideMenu = isIframe && !showMenu

    return {
        isIframe,
        profileId,
        hideMenu,
    }
}

/**
 * 設定檔 ID 映射表
 * 若新增設定檔，請在此處也新增iframe標準化設定檔
 */
const PROFILE_ID_MAP: Record<string, string> = {
    '1': 'profile1',
    '2': 'profile2',
    profile1: 'profile1',
    profile2: 'profile2',
}

/**
 * 支援的設定檔 ID 列表
 */
const VALID_PROFILE_IDS = Object.keys(PROFILE_ID_MAP)

/**
 * 驗證設定檔 ID 是否有效
 */
export function isValidProfileId(profileId: string | null): boolean {
    return profileId !== null && VALID_PROFILE_IDS.includes(profileId)
}

/**
 * 標準化設定檔 ID
 * 將簡化的 ID (如 '1', '2') 轉換為完整的 ID
 */
export function normalizeProfileId(profileId: string | null): string | null {
    if (!profileId) return null
    return PROFILE_ID_MAP[profileId] || null
}

/**
 * 獲取標準化的 iframe 配置
 */
export function getNormalizedIframeConfig(): {
    isIframe: boolean
    profileId: string | null
    hideMenu: boolean
} {
    const config = getIframeConfig()
    const normalizedProfileId = normalizeProfileId(config.profileId)

    // 如果是 iframe 模式且標準化後的設定檔 ID 無效，拋出錯誤
    if (config.isIframe && !isValidProfileId(normalizedProfileId)) {
        throw new IframeConfigError(
            `無效的設定檔 ID: ${config.profileId}。支援的設定檔：profile1, profile2, 1, 2。建議 URL：${generateSuggestedUrl()}`,
        )
    }

    return {
        ...config,
        profileId: normalizedProfileId,
    }
}
