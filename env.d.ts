/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

interface ImportMetaEnv {
    readonly VITE_AWS_REGION: string
    readonly VITE_AWS_BEDROCK_AGENT_ARN: string
    readonly VITE_AWS_ACCESS_KEY_ID: string
    readonly VITE_AWS_SECRET_ACCESS_KEY: string
    readonly VITE_AWS_SESSION_TOKEN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
