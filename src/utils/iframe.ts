/**
 * iframe 嵌入相關工具函數
 */

/**
 * 檢測是否在 iframe 中運行
 */
export function isInIframe(): boolean {
    try {
        return window.self !== window.top
    } catch (e) {
        // 如果無法訪問 window.top，通常表示在 iframe 中
        return true
    }
}

/**
 * 從 URL 參數中獲取設定檔 ID
 * 支援的參數名稱：profile, profileId, p
 */
export function getProfileFromUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search)

    // 支援多種參數名稱
    const profileParam = urlParams.get('profile') ||
        urlParams.get('profileId') ||
        urlParams.get('p')

    return profileParam
}

/**
 * 從 URL hash 中獲取設定檔 ID
 * 例如：#profile=profile1 或 #profile1
 */
export function getProfileFromHash(): string | null {
    const hash = window.location.hash.substring(1) // 移除 #

    if (!hash) return null

    // 檢查是否是 key=value 格式
    if (hash.includes('=')) {
        const params = new URLSearchParams(hash)
        return params.get('profile') || params.get('profileId') || params.get('p')
    }

    // 直接使用 hash 作為 profile ID
    return hash
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
    const profileFromUrl = getProfileFromUrl()
    const profileFromHash = getProfileFromHash()

    // 優先使用 URL 參數，其次使用 hash
    let profileId = profileFromUrl || profileFromHash

    // 如果是 iframe 模式且沒有指定設定檔，預設使用 profile1
    if (isIframe && !profileId) {
        profileId = 'profile1'
    }

    // 在 iframe 模式下預設隱藏選單，除非明確指定不隱藏
    const urlParams = new URLSearchParams(window.location.search)
    const showMenu = urlParams.get('showMenu') === 'true' || urlParams.get('menu') === 'true'
    const hideMenu = isIframe && !showMenu

    return {
        isIframe,
        profileId,
        hideMenu,
    }
}

/**
 * 驗證設定檔 ID 是否有效
 */
export function isValidProfileId(profileId: string | null): boolean {
    if (!profileId) return false

    // 支援的設定檔 ID
    const validProfiles = ['profile1', 'profile2', '1', '2']

    return validProfiles.includes(profileId)
}

/**
 * 標準化設定檔 ID
 * 將簡化的 ID (如 '1', '2') 轉換為完整的 ID
 * 若新增設定檔，請在此處也新增iframe標準化設定檔
 */
export function normalizeProfileId(profileId: string | null): string | null {
    if (!profileId) return null

    const profileMap: Record<string, string> = {
        '1': 'profile1',
        '2': 'profile2',
        'profile1': 'profile1',
        'profile2': 'profile2',
    }

    return profileMap[profileId] || null
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

    return {
        ...config,
        profileId: normalizeProfileId(config.profileId),
    }
}