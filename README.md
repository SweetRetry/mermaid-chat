# Next.js Monorepo Starter

A modern monorepo template powered by **Turborepo**, **Next.js**, **shadcn/ui**, **Biome**, and **Knip**.

## What's Inside

### Apps

- `apps/web` - Next.js 16 application with App Router and Turbopack

### Packages

- `packages/ui` - Shared React component library with shadcn/ui
- `packages/typescript-config` - Shared TypeScript configurations

### Tools

- [Turborepo](https://turbo.build/repo) - High-performance build system
- [Biome](https://biomejs.dev) - Fast formatter and linter
- [Knip](https://knip.dev) - Find unused files, dependencies and exports
- [pnpm](https://pnpm.io) - Fast, disk space efficient package manager

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build all apps and packages
pnpm build

# Lint and format code
pnpm check

# Find unused code
pnpm knip
```

## Adding UI Components

To add shadcn/ui components, run at the project root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Components will be placed in `packages/ui/src/components`.

## Using Components

Import components from the `@workspace/ui` package:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Project Structure

```
.
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── ui/                  # Shared UI components
│   └── typescript-config/   # Shared TS configs
├── biome.json               # Biome configuration
├── knip.json                # Knip configuration
├── turbo.json               # Turborepo configuration
└── pnpm-workspace.yaml      # pnpm workspace config
```
