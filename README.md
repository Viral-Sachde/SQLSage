# SQLsage

AI-powered database intelligence.

Connect a database. Understand its structure. Ask questions. Discover insights. Make better data decisions.

| Capability | What it does |
| --- | --- |
| **Schema Graph** | Visualize tables, relationships, keys and dependencies. Verified foreign keys and AI-inferred relationships are kept apart. |
| **Ask Your Data** | Turn natural language into validated, read-only SQL and results. |
| **Schema Advisor** | Suggest indexes, relationships, naming improvements and data-model changes, labelled measured or speculative. |
| **Business Insights** | Recommend queries, metrics and decisions based on your use case. |

## Principles

- **Self-hostable and provider-flexible.** The app and metadata live in your infrastructure. Use a hosted model (Anthropic) or a local one (Ollama) through one provider interface.
- **Your database is never uploaded.** Egress policy controls whether schema metadata or query results may leave your environment (`none`, `schema`, `schema+results`).
- **Read-only, always.** Read-only credentials, read-only transactions, statement timeouts, row limits and SQL validation.
- **Never auto-apply.** Suggested DDL is shown and explained, never executed for you.
- **PostgreSQL first.** MySQL and SQLite come after the core is excellent.

## Architecture

```
Interfaces          Web app · CLI · Node.js SDK
SQLsage Core        Schema introspection · Metadata graph · Query planning · Recommendations
AI orchestration    Schema analyst · SQL agent · Performance advisor · Business analyst
Database adapters   PostgreSQL first · MySQL · SQLite later
                    Customer's database
```

The core is independent of the web app and NestJS, so the SDK analyzes schemas in-process instead of calling the SQLsage API.

## Repository layout

```
sqlsage/
├── apps/
│   ├── web/              # Next.js dashboard (port 3000)
│   ├── marketing/        # Next.js marketing site, liquid metal theme (port 3001)
│   ├── server/           # NestJS API (port 4000)
│   └── cli/              # Terminal interface
├── packages/
│   ├── shared/           # Types and guardrail defaults
│   ├── graph/            # Schema graph, inferred relationships, join paths
│   ├── adapter-postgres/ # PostgreSQL introspection and guarded execution
│   ├── core/             # SQL validation, deterministic advisor, schema description
│   ├── ai/               # LLM providers and agents (SQL, use case, insights)
│   └── sdk/              # Public Node.js SDK
├── docker/               # Sample database seed and server image
└── docker-compose.yml
```

## Getting started

```bash
npm install
npm run build:packages

# Marketing site and dashboard (the dashboard runs on a demo schema with no setup)
npm run dev:marketing   # http://localhost:3001
npm run dev:web         # http://localhost:3000

# Sample database plus API
cp .env.example .env    # then fill in your values
docker compose up -d sample-db
SQLSAGE_DATABASE_URL=postgres://sqlsage_readonly:readonly@localhost:5432/app npm run dev:server
NEXT_PUBLIC_SQLSAGE_API=http://localhost:4000 npm run dev:web
```

### CLI

```bash
npm run build -w @sqlsage/cli
export SQLSAGE_DATABASE_URL=postgres://sqlsage_readonly:readonly@localhost:5432/app
npm run cli -- inspect
npm run cli -- graph
npm run cli -- path public.payments public.accounts
npm run cli -- advise
npm run cli -- ask "Which customers generated the most revenue last quarter?" --explain
npm run cli -- insights --for "B2B SaaS subscription product"
```

### SDK

```ts
import { SQLsage, AnthropicProvider } from "@sqlsage/sdk";

const sage = new SQLsage({
  database: process.env.DATABASE_URL!,
  provider: new AnthropicProvider(), // or new OllamaProvider({ model: "qwen2.5-coder" })
  guardrails: { egress: "schema", rowLimit: 500, statementTimeoutMs: 5000 },
});

const graph = await sage.graph();
const recs = await sage.advise();
const { sql, result } = await sage.ask("Which customers generated the most revenue last quarter?");
```

## Roadmap

- [x] Monorepo, PostgreSQL introspection, schema graph, SQL guard, deterministic advisor
- [x] SQL agent, use-case advisor, insights, Anthropic and Ollama providers
- [ ] Query-plan based performance advisor (`EXPLAIN` and `pg_stat_statements`)
- [ ] Metadata store for snapshots and history
- [ ] MySQL and SQLite adapters
- [ ] VS Code extension
