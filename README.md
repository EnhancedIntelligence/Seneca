# Seneca Protocol

## Getting Started

First, install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## AI Files Organization

The `.ai/` directory contains AI-related artifacts that are **reference-only** and not part of the application runtime:

- **`.ai/sessions/`** - Development session handover documents
- **`.ai/docs/`** - AI-specific documentation (BUILD_LOG, architecture)
- **`.ai/tests/`** - Reference tests (not run in CI)
- **`.ai/artifacts/`** - Build artifacts (TypeScript cache)

### Important Notes:

- AI files in `.ai/` are for documentation purposes only
- ESLint will error if you try to import from `.ai/`
- To reorganize AI files, run: `npm run ai:migrate`
- To clean build artifacts: `npm run ai:prune`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
INTERNAL_API_KEY=your_secure_random_key_here
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
