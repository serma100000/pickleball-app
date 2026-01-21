# Environment Configuration

This document explains the multi-environment setup for the Pickleball App, including how to configure local development and deploy to staging and production.

## Environments Overview

| Environment | Branch | Neon Branch | Web URL | API URL |
|-------------|--------|-------------|---------|---------|
| Development | `*` | `dev` | http://localhost:3000 | http://localhost:3001 |
| Staging | `staging` | `staging` | https://staging.pickleballapp.com | https://api-staging.pickleballapp.com |
| Production | `main` | `main` | https://pickleballapp.com | https://api.pickleballapp.com |

## Getting Neon Connection Strings

Neon uses database branching to provide isolated database environments. Each environment connects to a different Neon branch.

### Step 1: Access Neon Console

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Navigate to the **Branches** tab

### Step 2: Get Connection String for Each Branch

For each branch (main, staging, dev):

1. Click on the branch name
2. Go to **Connection Details**
3. Select **Pooled connection** (recommended for serverless)
4. Copy the connection string

The connection string format:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### Branch Setup

If branches don't exist, create them:

```bash
# Using Neon CLI
neon branches create --name staging --parent main
neon branches create --name dev --parent main
```

Or via the Neon Console:
1. Go to Branches tab
2. Click "New Branch"
3. Name it `staging` or `dev`
4. Select `main` as the parent branch

## Local Development Setup

### 1. Copy Environment Files

```bash
# From project root
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/database/.env.example packages/database/.env
```

### 2. Configure Database

Get your dev branch connection string from Neon and update:

**apps/api/.env:**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

**packages/database/.env:**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### 3. Configure Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or select existing
3. Go to **API Keys**
4. Copy the keys to **apps/web/.env**:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```

### 4. Optional: Configure Mapbox

For map features:

1. Go to [Mapbox](https://account.mapbox.com)
2. Create an access token
3. Add to **apps/web/.env**:

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx
```

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

### 6. Start Development

```bash
pnpm dev
```

## GitHub Secrets for CI/CD

Configure these secrets in your GitHub repository settings (Settings > Secrets and variables > Actions):

### Required Secrets

| Secret | Description | Used In |
|--------|-------------|---------|
| `NEON_API_KEY` | Neon API key for branch management | All workflows |
| `NEON_PROJECT_ID` | Your Neon project ID | All workflows |
| `DATABASE_URL_DEV` | Dev branch connection string | PR previews |
| `DATABASE_URL_STAGING` | Staging branch connection string | Staging deploy |
| `DATABASE_URL_PRODUCTION` | Main branch connection string | Production deploy |
| `CLERK_SECRET_KEY` | Clerk backend secret | All workflows |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | All workflows |

### Optional Secrets

| Secret | Description | Used In |
|--------|-------------|---------|
| `VERCEL_TOKEN` | Vercel deployment token | Vercel deployments |
| `VERCEL_ORG_ID` | Vercel organization ID | Vercel deployments |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel deployments |
| `MAPBOX_ACCESS_TOKEN` | Mapbox API token | Map features |

### Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret with its value

## Environment Variables by App

### apps/api

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (development/staging/production) |
| `CORS_ORIGIN` | No | Allowed CORS origin |
| `ENABLE_RATE_LIMITING` | No | Enable rate limiting (default: false) |

### apps/web

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | No | Sign in page URL |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | No | Sign up page URL |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | No | Redirect after sign in |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | No | Redirect after sign up |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_SOCKET_URL` | No | WebSocket server URL |
| `NEXT_PUBLIC_APP_URL` | No | Frontend app URL |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | No | Mapbox API token |

### packages/database

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |

## Troubleshooting

### Database Connection Issues

1. **SSL Required**: Ensure `?sslmode=require` is in your connection string
2. **IP Restrictions**: Check Neon's IP allow list if using VPN
3. **Branch Status**: Ensure the Neon branch is not suspended (free tier suspends after inactivity)

### Clerk Authentication Issues

1. **Domain Mismatch**: Ensure Clerk app domains match your deployment URLs
2. **Key Mismatch**: Don't mix test and production keys
3. **Webhook Config**: Configure webhooks for user sync if needed

### Environment Variable Not Loading

1. Restart the dev server after changing `.env` files
2. Ensure variable names match exactly (case-sensitive)
3. For Next.js, client-side variables must start with `NEXT_PUBLIC_`
