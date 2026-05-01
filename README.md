# AlgoForge Backend

AlgoForge Backend is an Express + Prisma service that handles authentication, AI-powered problem generation, problem persistence, and secure code execution/submission through Docker sandboxes.

## Tech Stack

- Node.js (ESM)
- Express 5
- Prisma + PostgreSQL
- JWT authentication
- Docker-based code execution isolation (Node.js and C++)
- Google GenAI SDK for problem generation

## Architecture Overview

```text
Client (Frontend)
  -> Express API (`index.js`)
      -> Auth Routes (`/user/*`)
      -> Protected Problem Routes (`/problem/*`, `/generate`, `/run`, `/submit`)
          -> Prisma Client
              -> PostgreSQL
          -> Docker Runner
              -> temp/<execution-id> (code/input/output)
              -> language container (node:22 or gcc:15)
```

### Runtime Components

- **API server**: receives requests, validates auth, orchestrates workflows.
- **Database**: stores users and generated problems.
- **Execution sandbox**: runs user code with memory/CPU/time limits.
- **DinD sidecar (optional via compose)**: allows backend container to launch execution containers.

## Project Structure

```text
algoforge_backend/
├── ai/                    # AI generation workflow
├── controllers/           # route handlers
├── middlewares/           # auth middleware
├── routes/                # express route modules
├── service/               # token helpers
├── prisma/                # schema + migrations
├── temp/                  # transient execution files
├── index.js               # app entrypoint + run/submit engine
└── docker-compose.yml     # backend + dind + postgres stack
```

## Data Model (Prisma)

- `User`
  - `id`, `email`, `passwordHash`, timestamps
- `Problem`
  - ownership (`createdById`)
  - content (`title`, `problemStatement`, examples/hidden I/O, tags, difficulty)
  - status (`isSolved`)
  - timestamps

Schema source: `prisma/schema.prisma`.

## Environment Variables

Create `.env` in `algoforge_backend/`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:passAdmin@localhost:5432/portfolio_site_db?schema=public
GEMINI_API_KEY=your_key_here
```

If running backend inside Docker Compose, keep `DOCKER_HOST=tcp://dind:2375` as configured in compose.

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Server starts on `http://localhost:4000`.

## Docker Compose Setup

The provided compose file starts:

- `backend` (API service)
- `dind` (docker-in-docker for isolated code execution)
- `db` (PostgreSQL 15)

Start:

```bash
docker compose up --build
```

The backend command applies migrations on startup (`prisma migrate deploy`) before launching the API.

## API Endpoints

### Public

- `GET /health` - service health + execution slot stats
- `POST /user/signup` - register user
- `POST /user/login` - login and receive JWT

### Protected (Bearer token required)

- `GET /generate` - generate and persist a new problem for current user
- `GET /problem/allproblems` - list all user problems
- `GET /problem/getlatestproblem` - latest unsolved (fallback latest solved)
- `GET /problem/getlatest3` - latest three problems
- `DELETE /problem/deleteproblem` - delete one user-owned problem
- `POST /run` - compile/execute submitted code against custom input
- `POST /submit` - execute code against hidden input and mark solved if accepted

## Security and Execution Notes

- Run/submit use ephemeral execution folders under `temp/`.
- Commands run inside disposable containers with CPU/memory caps.
- Execution timeout is enforced (`20s`) and output buffer is limited.
- JWT is currently signed with an in-code secret in `service/auth.js`; move this to env for production hardening.

## Operational Notes

- `MAX_CONCURRENT_EXECUTIONS` limits parallel runs to reduce server pressure.
- Health endpoint exposes current usage to help with monitoring.
- Prisma client is generated into `generated/prisma`.
