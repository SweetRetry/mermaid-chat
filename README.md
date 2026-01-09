# Mermaid Chat

An AI-powered chat application for creating and editing Mermaid diagrams through natural language conversations.

## Features

- **AI-Powered Diagram Generation**: Create flowcharts, sequence diagrams, class diagrams, and more using natural language
- **Real-time Streaming**: Watch diagrams generate in real-time with streaming responses
- **Interactive Diagram Viewer**: Pan, zoom, and interact with your diagrams
- **Export Options**: Export diagrams as PNG or copy the Mermaid code
- **Conversation History**: All chats are persisted and can be resumed
- **Node Selection**: Click diagram nodes to reference them in your next message
- **Version History**: Browse and compare previous diagram versions within a conversation
- **Multiple AI Models**: Choose between DeepSeek and Doubao Seed

### Supported Diagram Types

- Flowchart (TD, LR, TB, RL)
- Sequence Diagram
- Class Diagram
- ER Diagram
- State Diagram
- Pie Chart
- Gantt Chart
- Mindmap

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) with App Router and Turbopack
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai) with DeepSeek and Doubao Seed
- **Database**: [Prisma](https://prisma.io) with [Neon](https://neon.tech) serverless PostgreSQL
- **UI**: [shadcn/ui](https://ui.shadcn.com) components with Radix primitives
- **Diagrams**: [Mermaid.js](https://mermaid.js.org) for rendering
- **Build**: [Turborepo](https://turbo.build/repo) monorepo with [pnpm](https://pnpm.io)
- **Code Quality**: [Biome](https://biomejs.dev) for linting and formatting

## Project Structure

```
.
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App Router pages and API routes
│       ├── components/         # React components
│       │   ├── chat/           # Chat interface components
│       │   ├── mermaid/        # Diagram renderer and plugins
│       │   └── layout/         # Layout components
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities and constants
│       └── prisma/             # Database schema
├── packages/
│   ├── ui/                     # Shared UI component library
│   └── typescript-config/      # Shared TypeScript configs
└── turbo.json                  # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 10.x
- PostgreSQL database (or [Neon](https://neon.tech) account)

### Environment Variables

Create `.env` file in `apps/web/`:

```bash
# Database
DATABASE_URL="postgresql://..."

# AI Providers (at least one required)
DEEPSEEK_API_KEY="..."
ARK_API_KEY="..."  # For Doubao Seed via Volcengine Ark
```

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter web db:generate

# Push database schema
pnpm --filter web db:push

# Start development server
pnpm dev
```

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server with Turbopack

# Build
pnpm build            # Build all apps and packages

# Code Quality
pnpm check            # Lint and format with Biome
pnpm knip             # Find unused code

# Database (run from apps/web)
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
```

## Mermaid Plugin System

The diagram renderer supports a plugin architecture for extensibility:

```tsx
import {
  MermaidRenderer,
  createTransformPlugin,    // Pan/zoom controls
  createExportPlugin,       // PNG export and code copy
  createCodeViewPlugin,     // View raw Mermaid code
  createNodeSelectionPlugin // Click-to-select nodes
} from "./mermaid-renderer"

const plugins = [
  createTransformPlugin(),
  createExportPlugin(),
  createCodeViewPlugin(),
  createNodeSelectionPlugin({ onNodeSelect: handleSelect })
]

<MermaidRenderer code={code} plugins={plugins} />
```

## Adding UI Components

Add new shadcn/ui components:

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

Components are placed in `packages/ui/src/components`.

## License

MIT
