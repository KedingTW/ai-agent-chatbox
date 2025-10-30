# Project Structure

## Root Directory Organization

```
ai-agent-chatbox/
├── .kiro/                  # Kiro AI assistant configuration
├── amplify/               # AWS Amplify backend configuration
├── docs/                  # Project documentation and requirements
├── e2e/                   # End-to-end tests (Playwright)
├── public/                # Static assets served directly
├── src/                   # Main application source code
└── logs/                  # Application and MCP logs
```

## Source Code Structure (`src/`)

```
src/
├── assets/                # Static resources (CSS, images, fonts)
├── components/            # Reusable Vue components
│   ├── __tests__/         # Component unit tests
│   └── icons/             # Icon components
├── config/                # Configuration files (AWS, app settings)
├── layouts/               # Page layout components
├── router/                # Vue Router configuration
├── services/              # External service integrations (AWS, APIs)
├── stores/                # Pinia state management stores
├── types/                 # TypeScript type definitions
├── views/                 # Page-level Vue components
├── App.vue               # Root Vue component
└── main.ts               # Application entry point
```

## Key Architectural Patterns

### Architecture Philosophy: Store-Driven with Service Layer

This project follows a **Store-driven with Service as Tool Layer** (Store-driven with Service as Tool Layer) architecture:

- **Stores (Pinia)**: Primary controllers managing all application state and business logic
- **Services**: Pure utility layer for external API calls and integrations, stateless
- **Components**: UI layer that only interacts with stores, never directly with services

### Component Organization

- **Components**: Small, reusable UI elements in `src/components/`
- **Views**: Page-level components in `src/views/`
- **Layouts**: Wrapper components for common page structures in `src/layouts/`

### State Management Layer (Primary)

- **Pinia Stores**: Located in `src/stores/` - the central hub for all application logic
    - `state.ts`: Core application state store (isInitializing, isStreaming)
    - `chat.ts`: Chat-specific business logic (messages, sessions, streaming status, chat errors)
    - `config.ts`: Configuration and profile management (AWS profiles, iframe settings)
- **Store Responsibilities**:
    - All state mutations and business logic
    - Orchestrating service calls
    - Error handling and recovery
    - Data validation and transformation
- **Reactive Data**: Use Vue 3 Composition API patterns within stores

#### State Management Layered Architecture

**Three-Layer Store Architecture:**

```
State Store (state.ts)     ← Core application states
    ↑
Feature Stores             ← Domain-specific business logic
    ↑
Components                 ← UI-specific local states
```

**Layer 1: State Store (`state.ts`) - Application Foundation**

- **Purpose**: Manages core application lifecycle and global states
- **Current States**:
    - `isInitializing`: Application startup and configuration loading
    - `isStreaming`: Active streaming operations across the app
- **Characteristics**:
    - No dependencies on other stores
    - Affects entire application behavior
    - Used by multiple feature stores and components

**Layer 2: Feature Stores - Domain-Specific Logic**

- **Chat Store (`chat.ts`)**:
    - Depends on State Store for global states
    - Manages: messages, sessions, chat-specific errors, streaming progress
    - Should reference `stateStore.isStreaming` instead of maintaining own streaming state
- **Config Store (`config.ts`)**:
    - Independent store for configuration management
    - Manages: AWS profiles, iframe settings, user preferences
    - Can be used by other stores but doesn't depend on them

**Layer 3: Component States - UI Interactions**

- **Local Component States**: `isFocused`, `isHovered`, `isExpanded`, `showTooltip`
- **Form States**: Input values, validation states (unless shared across components)
- **Animation States**: Temporary UI feedback and transitions

**State Dependency Rules:**

1. **State Store**: Never imports other stores, pure application state
2. **Feature Stores**: Can import and use State Store, avoid circular dependencies
3. **Components**: Can use multiple stores but prefer single store per component when possible

**State Granularity Decision Matrix:**

| State Type             | Store Layer   | Examples                        | Reasoning                   |
| ---------------------- | ------------- | ------------------------------- | --------------------------- |
| Application Lifecycle  | State Store   | `isInitializing`, `isStreaming` | Affects entire app          |
| Feature Business Logic | Feature Store | `messages`, `currentSession`    | Domain-specific             |
| Cross-Feature Shared   | State Store   | `isStreaming`, `isOffline`      | Used by multiple features   |
| UI Interaction         | Component     | `isFocused`, `isHovered`        | Pure UI, no business impact |
| Temporary Feedback     | Component     | `showTooltip`, `isAnimating`    | Short-lived, visual only    |

**State Naming Conventions:**

- **Boolean States**: `is`, `has`, `can`, `should` prefixes
- **Present Tense**: Current states (`isLoading`, `isStreaming`)
- **Past Tense**: Completed actions (`hasInitialized`, `wasSuccessful`)
- **Avoid Negatives**: Use `isOffline` instead of `isNotOnline`

### Service Layer (Tool Layer)

- **AWS Services**: Located in `src/services/` - pure utility functions for external APIs
    - `aws-bedrock.ts`: AWS Bedrock API wrapper, stateless
    - `aws-service-manager.ts`: Service instance lifecycle management
- **Service Characteristics**:
    - Stateless and pure functions
    - No business logic, only API integration
    - Return data without side effects
    - Can be easily mocked for testing
- **Configuration**: Centralized in `src/config/` for environment and AWS settings
- **Types**: Shared TypeScript interfaces and types in `src/types/`

### Data Flow Pattern

```
Component → Store Action → Service Call → Store State Update → Component Re-render
```

**Example Flow:**

1. Component calls `chatStore.sendMessage()`
2. Store action calls `awsService.sendMessageWithStreaming()`
3. Service returns streaming data to store callbacks
4. Store updates reactive state
5. Component automatically re-renders with new state

### Composable Usage Guidelines

**When to Use Composables:**

- Cross-component logic reuse (e.g., message validation, keyboard shortcuts)
- Complex reactive logic combining multiple stores
- Browser API encapsulation (e.g., clipboard, localStorage)
- Lifecycle-related logic abstraction

**When NOT to Use Composables:**

- Pure state management (use Pinia stores instead)
- Simple utility functions (use `src/utils/` instead)
- Core business logic (belongs in store actions)

**Example Appropriate Composable:**

```typescript
// composables/useMessageRetry.ts
export function useMessageRetry() {
    const chatStore = useChatStore()

    const retryMessage = async (messageId: string) => {
        const message = chatStore.messages.find((m) => m.id === messageId)
        if (message?.sender === 'user') {
            await chatStore.sendMessage(message.content)
        }
    }

    return { retryMessage }
}
```

### File Naming Conventions

- **Vue Components**: PascalCase (e.g., `HelloWorld.vue`, `UserProfile.vue`)
- **TypeScript Files**: kebab-case (e.g., `aws-bedrock.ts`, `user-service.ts`)
- **Directories**: kebab-case (e.g., `components/`, `user-profile/`)
- **Test Files**: Match source file with `.test.ts` or `.spec.ts` suffix
- **Composables**: camelCase with `use` prefix (e.g., `useMessageRetry.ts`)

### Import Aliases

- Use `@/` alias for `src/` directory imports
- Example: `import { AWSBedrockService } from '@/services/aws-bedrock'`

### Configuration Files

- **Environment**: `.env` for local development variables
- **TypeScript**: Multiple `tsconfig.*.json` files for different contexts
- **Build**: `vite.config.ts` for Vite configuration
- **Testing**: `vitest.config.ts` and `playwright.config.ts`

## Architecture Best Practices

### Store-Service Interaction Rules

1. **Components → Stores Only**

    - Components should never directly import or call services
    - All service interactions must go through store actions
    - Components only consume reactive store state

2. **Stores → Services**

    - Store actions orchestrate service calls
    - Stores handle all error scenarios from services
    - Stores transform service responses into application state

3. **Service Purity**
    - Services should be stateless and side-effect free
    - Services return data, stores decide what to do with it
    - Services can be easily unit tested in isolation

### Inter-Store Communication Patterns

**Recommended Store Interaction Patterns:**

1. **State Store as Foundation**

    ```typescript
    // In chat.ts
    import { useStateStore } from './state'

    export const useChatStore = defineStore('chat', () => {
        const stateStore = useStateStore()

        const canSendMessage = computed(() => !stateStore.isStreaming && !stateStore.isInitializing)
    })
    ```

2. **Feature Store Actions Update State Store**

    ```typescript
    // In chat.ts actions
    const sendMessage = async (message: string) => {
        stateStore.isStreaming = true // Update global state

        try {
            // Chat-specific logic
        } finally {
            stateStore.isStreaming = false
        }
    }
    ```

3. **Avoid Circular Dependencies**
    - State Store should never import feature stores
    - Feature stores can import State Store
    - Use composables for complex cross-store logic if needed

### Error Handling Strategy

- **Service Level**: Return structured error objects, no throwing
- **Store Level**: Transform service errors into user-friendly error states
- **Component Level**: Display error states from stores, provide retry mechanisms

### Testing Strategy

- **Services**: Unit test with mocked external dependencies
- **Stores**: Unit test actions and state mutations with mocked services
- **Components**: Integration test with real stores, mocked services
- **E2E**: Full flow testing with real services in test environment

### Performance Considerations

- **Lazy Service Initialization**: Services created only when needed
- **Store State Optimization**: Use computed properties for derived state
- **Component Reactivity**: Minimize reactive dependencies in components
- **Memory Management**: Proper cleanup in store actions and service disposal
