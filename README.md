# Mermaid Chat

An AI-powered chat application for creating and editing Mermaid diagrams through natural language conversations.

## Features

- **AI-Powered Diagram Generation**: Create flowcharts, sequence diagrams, class diagrams, and more using natural language
- **Real-time Streaming**: Watch diagrams generate in real-time with streaming responses
- **Deep Thinking Mode**: Enable AI reasoning for complex diagram requirements
- **Web Search**: Integrate real-time web search for up-to-date information
- **Interactive Diagram Viewer**: Pan, zoom, and interact with your diagrams
- **Context Menu**: Right-click to copy code, export PNG, or view documentation
- **Document Panel**: View and edit associated documentation for each conversation
- **Conversation History**: All chats are persisted and can be resumed
- **Node Selection**: Click diagram nodes to reference them in your next message
- **AI Model**: Powered by Doubao Seed 1.8 via Volcengine Ark
- **Authentication**: Optional password-based authentication for access control
- **Multimodal Support**: Upload images alongside text prompts

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
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai) with [@sweetretry/ai-sdk-volcengine-adapter](https://www.npmjs.com/package/@sweetretry/ai-sdk-volcengine-adapter)
- **State Management**: [TanStack Query](https://tanstack.com/query) + [Zustand](https://zustand.docs.pmnd.rs)
- **Database**: [Prisma](https://prisma.io) with [Neon](https://neon.tech) serverless PostgreSQL
- **UI**: [shadcn/ui](https://ui.shadcn.com) + [Radix](https://radix-ui.com) + [Framer Motion](https://motion.dev)
- **Rich Text**: [Tiptap](https://tiptap.dev) editor with Markdown support
- **Diagrams**: [Mermaid.js](https://mermaid.js.org) for rendering
- **Build**: [Turborepo](https://turbo.build/repo) monorepo with [pnpm](https://pnpm.io)
- **Code Quality**: [Biome](https://biomejs.dev) for linting and formatting

## Project Structure

```
.
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App Router pages and API routes
│       │   ├── api/            # API routes (chat, conversations, auth)
│       │   │   ├── chat/       # Chat streaming endpoint
│       │   │   ├── conversations/  # CRUD for conversations
│       │   │   └── auth/       # Authentication
│       │   ├── chat/           # Chat page with conversation routing
│       │   └── login/          # Authentication page
│       ├── components/         # React components
│       │   ├── chat/           # Chat interface (input, messages, panel)
│       │   ├── mermaid/        # Diagram renderer and plugins
│       │   └── conversation/   # Conversation list and cards
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities, constants, and database
│       ├── types/              # TypeScript type definitions
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
# Neon PostgreSQL Database
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Volcengine Ark API Key (for Doubao Seed 1.8)
ARK_API_KEY="your-ark-api-key"

# Site Password (optional - leave empty for no auth)
SITE_PASSWORD="your-site-password"
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
  createTransformPlugin,      // Pan/zoom controls
  createNodeSelectionPlugin,  // Click-to-select nodes
  createDocViewPlugin,        // View documentation
  createContextMenuPlugin,    // Right-click menu (copy, export)
  fullPlugins                 // Preset with all plugins
} from "./mermaid"

// Use preset
<MermaidRenderer code={code} plugins={fullPlugins()} />

// Or customize
const plugins = [
  createTransformPlugin(),
  createNodeSelectionPlugin({ onNodeSelect: handleSelect }),
  createContextMenuPlugin()
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
