# Pickle Play - Pickleball Court Management Platform

A modern web application for managing pickleball courts, scheduling games, and connecting players.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes / Hono
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Testing**: Vitest + Playwright

## Project Structure

```
pickle-play/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Backend API (optional standalone)
├── packages/
│   ├── config/       # Shared configuration (ESLint, TypeScript, Tailwind)
│   ├── types/        # Shared TypeScript types and interfaces
│   ├── ui/           # Shared UI component library
│   ├── utils/        # Shared utility functions
│   └── validation/   # Shared Zod schemas
├── turbo.json        # Turborepo configuration
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL 15+

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd pickle-play

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local

# Update environment variables as needed
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# (Optional) Open Prisma Studio
pnpm db:studio
```

### 4. Development

```bash
# Start all apps in development mode
pnpm dev

# Start specific app
pnpm --filter @pickle-play/web dev
pnpm --filter @pickle-play/api dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |
| `pnpm test` | Run tests across all packages |
| `pnpm clean` | Clean all build outputs |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## Package Overview

### Apps

- **@pickle-play/web**: Main Next.js web application with App Router
- **@pickle-play/api**: Backend API service (can be standalone or part of Next.js)

### Packages

- **@pickle-play/config**: Shared ESLint, TypeScript, and Tailwind configurations
- **@pickle-play/types**: Shared TypeScript types, interfaces, and enums
- **@pickle-play/ui**: Shared React UI components built with shadcn/ui
- **@pickle-play/utils**: Shared utility functions and helpers
- **@pickle-play/validation**: Shared Zod schemas for validation

## Development Guidelines

### Code Style

- Use TypeScript for all code
- Follow ESLint and Prettier configurations
- Use conventional commits for git messages
- Write tests for new features

### Adding Dependencies

```bash
# Add to specific workspace
pnpm --filter @pickle-play/web add <package>

# Add to root (dev dependencies)
pnpm add -D <package> -w

# Add to all packages
pnpm add <package> -r
```

### Creating New Packages

1. Create directory in `packages/` or `apps/`
2. Add `package.json` with appropriate name (`@pickle-play/<name>`)
3. Add `tsconfig.json` extending root config
4. Run `pnpm install` to link

## Deployment

### Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel --prod
```

### Docker

```bash
# Build Docker image
docker build -t pickle-play .

# Run container
docker run -p 3000:3000 pickle-play
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details
