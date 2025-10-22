/**
 * Node.js环境变量类型定义
 * 用于AWS凭证等服务器端环境变量
 */

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // AWS凭证
            AWS_ACCESS_KEY_ID?: string
            AWS_SECRET_ACCESS_KEY?: string
            AWS_SESSION_TOKEN?: string

            // AWS Bedrock配置
            AWS_BEDROCK_AGENT_ID?: string
            AWS_BEDROCK_AGENT_ALIAS_ID?: string
            AWS_BEDROCK_SESSION_ID?: string

            // Node.js环境
            NODE_ENV?: 'development' | 'production' | 'test'
        }
    }
}

export { }
