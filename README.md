# Test Automation Execution Platform

Centralized platform for discovering, validating and executing automation projects.

Initial scope:

- Serenity BDD
- Screenplay
- Maven
- GitHub
- Bitbucket
- Local project upload
- Feature discovery
- Scenario discovery
- Tag discovery
- Environment selection
- Project readiness
- Isolated execution
- Serenity reports

Architecture:

- Frontend: React + TypeScript + Vite (`frontend/`)
- Backend: Fastify + TypeScript (`backend/`)
- Persistence: in-memory (no database yet)
- Email delivery: Resend in production, local mailbox fallback in development
- Execution: local process execution (no container isolation yet)

## Setup

Install dependencies (do this on the machine/OS you will actually run on;
`node_modules` must not be copied between platforms, since some packages
ship native binaries):

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

Configure the backend before starting it (optional for local development):

```bash
cp backend/.env.example backend/.env
# edit ALLOWED_PROJECT_ROOTS in backend/.env
```

`ALLOWED_PROJECT_ROOTS` is a comma-separated allowlist of absolute
directories the backend may browse (`/api/filesystem/*`) or inspect/execute
projects from (`/api/projects/inspect`). With no value configured, those
endpoints accept any path reachable from this machine — fine while
developing locally, but set this before exposing the backend beyond your
own machine. See `backend/src/config/allowed-roots.ts`.

For email verification:

- `RESEND_API_KEY` and `EMAIL_FROM` enable real delivery through Resend.
- If either value is missing, the backend falls back to the local dev mailbox.
- The dev mailbox endpoint is only available outside production.

Run both apps together from the repo root:

```bash
npm run dev
```
