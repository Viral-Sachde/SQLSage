"use client";

import { useState } from "react";

const TABS = [
  {
    id: "web",
    label: "Web app",
    status: "Build first",
    blurb: "Schema graph, chat, recommendations and a query explorer in one self-hosted dashboard.",
    code: `docker compose up -d

# open http://localhost:3000
# connect a read-only role, SQLsage does the rest`,
  },
  {
    id: "sdk",
    label: "Node.js SDK",
    status: "Alongside core",
    blurb: "Embed SQLsage in your own products and agents. The core runs in-process, no API hop.",
    code: `import { SQLsage, AnthropicProvider } from "@sqlsage/sdk";

const sage = new SQLsage({
  database: process.env.DATABASE_URL,
  provider: new AnthropicProvider(),
  guardrails: { egress: "schema", rowLimit: 500 },
});

const { sql, result } = await sage.ask(
  "Which customers generated the most revenue last quarter?"
);`,
  },
  {
    id: "cli",
    label: "CLI",
    status: "Early",
    blurb: "Inspect a database from the terminal and run AI analysis in your scripts and CI.",
    code: `$ sqlsage inspect
app  42 tables, 57 relationships, 88 indexes

$ sqlsage advise
MEDIUM Index public.invoices(customer_id) [measured]
INFO   Possible relationship events.account_id to accounts [speculative]

$ sqlsage ask "weekly active accounts" --explain`,
  },
  {
    id: "server",
    label: "Self-hosted server",
    status: "Core",
    blurb: "Metadata, queries and AI processing stay inside your infrastructure. Bring a local model if you like.",
    code: `SQLSAGE_DATABASE_URL=postgres://readonly@db/app
SQLSAGE_LLM_PROVIDER=ollama
SQLSAGE_OLLAMA_MODEL=qwen2.5-coder
SQLSAGE_EGRESS=none

POST /api/ask      { "question": "..." }
GET  /api/schema
GET  /api/advise`,
  },
  {
    id: "vscode",
    label: "VS Code",
    status: "Later",
    blurb: "Explore schemas and ask questions without leaving the editor.",
    code: `> SQLsage: Open Schema Graph
> SQLsage: Ask Your Data
> SQLsage: Explain Selected Query`,
  },
];

export default function FormatTabs() {
  const [active, setActive] = useState(TABS[1].id);
  const tab = TABS.find((t) => t.id === active)!;
  return (
    <div className="formats">
      <div className="format-list" role="tablist" aria-label="Product formats">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === active} className={`format-tab ${t.id === active ? "on" : ""}`} onClick={() => setActive(t.id)}>
            <span>{t.label}</span>
            <span className="pill">{t.status}</span>
          </button>
        ))}
      </div>
      <div className="format-panel metal-frame" role="tabpanel">
        <p>{tab.blurb}</p>
        <pre className="code">
          <code>{tab.code}</code>
        </pre>
      </div>
    </div>
  );
}
