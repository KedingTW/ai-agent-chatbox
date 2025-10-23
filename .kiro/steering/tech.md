# Technology Stack

## Frontend Framework

- **Vue 3** with Composition API
- **TypeScript** for type safety
- **Vite** as build tool and dev server
- **Pinia** for state management
- **Vue Router** for client-side routing

## UI Framework

- **CoreUI Vue** components library
- Custom CSS with system fonts
- Responsive design with modern CSS (dvh units)

## AWS Integration

- **AWS SDK v3** (`@aws-sdk/client-bedrock-agent-runtime`)
- **AWS Bedrock Agent Runtime** for AI chat functionality
- **AWS Amplify** for backend infrastructure (auth, DynamoDB, Lambda, S3)

## Development Tools

- **ESLint** with Vue/TypeScript configs
- **Prettier** for code formatting (4-space tabs, 100 char width, single quotes)
- **Vitest** for unit testing
- **Playwright** for E2E testing
- **Yarn** for package management

## Build & Development Commands

```bash
# Development
yarn dev                    # Start dev server with hot reload
yarn build                  # Build for production
yarn preview               # Preview production build

# Code Quality
yarn lint                  # Run ESLint
yarn format               # Format code with Prettier
yarn type-check           # TypeScript type checking
yarn type-check:all       # Run all checks (type, lint, format)

# Testing
yarn test:unit            # Run unit tests with Vitest
yarn test:e2e             # Run E2E tests with Playwright
npx playwright install    # Install browser dependencies

# AWS Deployment
npx ampx sandbox --profile <profile>        # Deploy to AWS sandbox
npx ampx sandbox delete --profile <profile> # Delete AWS sandbox
```

## Code Style Standards

- 4-space indentation (2 spaces for YAML files)
- Single quotes for strings
- No semicolons
- 100 character line width
- Prefer `const` over `let`, avoid `var`
- Use TypeScript strict mode
- CSS class naming: camelCase (e.g., `chatContainer`)
