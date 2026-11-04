#!/usr/bin/env node
import { parseArgs } from "node:util";
import { SQLsage, type Recommendation } from "@sqlsage/sdk";

const HELP = `sqlsage, AI-powered database intelligence

Usage
  sqlsage inspect                 Summarize tables, relationships and indexes
  sqlsage graph [--json]          Print the schema graph
  sqlsage path <from> <to>        Shortest join path between two tables
  sqlsage advise [--for "<use case>"]   Schema recommendations
  sqlsage ask "<question>" [--explain]  Natural language to validated SQL
  sqlsage insights --for "<use case>"   Suggested metrics and queries

Options
  --url <conn>     Connection string (default: $SQLSAGE_DATABASE_URL)
  --json           Machine-readable output
  -h, --help       Show help`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: "string" },
    json: { type: "boolean", default: false },
    explain: { type: "boolean", default: false },
    for: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

function printRecs(recs: Recommendation[]) {
  const color = { high: c.red, medium: c.yellow, low: c.cyan, info: c.dim };
  for (const r of recs) {
    console.log(`${color[r.severity](r.severity.toUpperCase().padEnd(6))} ${c.bold(r.title)} ${c.dim(`[${r.evidence}]`)}`);
    console.log(`       ${r.rationale}`);
    if (r.sql) console.log(`       ${c.dim(r.sql)}`);
  }
}

async function main() {
  const [cmd, ...rest] = positionals;
  if (values.help || !cmd) return console.log(HELP);
  const url = values.url ?? process.env.SQLSAGE_DATABASE_URL;
  if (!url) throw new Error("Provide --url or set SQLSAGE_DATABASE_URL");

  const sage = new SQLsage({
    database: url,
    provider: SQLsage.providerFromEnv(),
    guardrails: {
      egress: (process.env.SQLSAGE_EGRESS as "none" | "schema" | "schema+results") ?? "schema",
      statementTimeoutMs: Number(process.env.SQLSAGE_STATEMENT_TIMEOUT_MS ?? 5000),
      rowLimit: Number(process.env.SQLSAGE_ROW_LIMIT ?? 500),
    },
  });
  const out = (data: unknown, pretty: () => void) => (values.json ? console.log(JSON.stringify(data, null, 2)) : pretty());

  try {
    switch (cmd) {
      case "inspect": {
        const s = await sage.schema();
        const g = await sage.graph();
        out({ ...s, relationships: g.relationships }, () => {
          console.log(c.bold(`${s.database}`), c.dim(`${s.tables.length} tables, ${g.relationships.length} relationships, ${s.indexes.length} indexes`));
          for (const t of s.tables)
            console.log(`  ${c.cyan(t.id.padEnd(36))} ${String(t.columns.length).padStart(3)} cols  ${c.dim(`~${t.estimatedRows ?? "?"} rows`)}`);
        });
        break;
      }
      case "graph": {
        const g = await sage.graph();
        out(g.relationships, () => {
          for (const r of g.relationships)
            console.log(`  ${r.fromTable}.${r.fromColumns.join(",")} ${c.dim("->")} ${r.toTable}  ${r.provenance === "verified" ? c.cyan("verified") : c.yellow(`inferred ${Math.round(r.confidence * 100)}%`)}`);
        });
        break;
      }
      case "path": {
        const [from, to] = rest;
        const p = await sage.joinPath(from, to);
        out(p, () => console.log(p ? p.join(c.dim(" -> ")) : "No path found"));
        break;
      }
      case "advise": {
        const recs = values.for ? await sage.adviseFor(values.for) : await sage.advise();
        out(recs, () => printRecs(recs));
        break;
      }
      case "ask": {
        const res = await sage.ask(rest.join(" "), { explain: values.explain });
        out(res, () => {
          console.log(c.dim(res.sql), "\n");
          console.table(res.result.rows);
          if (res.result.truncated) console.log(c.yellow(`Truncated to ${res.result.rowCount} rows`));
          if (res.explanation) console.log("\n" + res.explanation);
        });
        break;
      }
      case "insights": {
        if (!values.for) throw new Error('insights needs --for "<use case>"');
        const items = await sage.insights(values.for);
        out(items, () => items.forEach((m) => console.log(`${c.bold(m.metric)}\n  ${m.why}\n  ${c.dim(m.sql)}\n`)));
        break;
      }
      default:
        console.log(HELP);
    }
  } finally {
    await sage.close();
  }
}

main().catch((e) => {
  console.error(c.red(e instanceof Error ? e.message : String(e)));
  process.exit(1);
});
