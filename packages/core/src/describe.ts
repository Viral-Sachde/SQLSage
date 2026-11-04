import type { SchemaSnapshot } from "@sqlsage/shared";
import { buildGraph } from "@sqlsage/graph";

/** Compact, token-efficient schema description for LLM context. Contains metadata only, never row data. */
export function describeSchema(snapshot: SchemaSnapshot, only?: Set<string>): string {
  const graph = buildGraph(snapshot);
  const lines: string[] = [];
  for (const t of snapshot.tables) {
    if (only && !only.has(t.id)) continue;
    const cols = t.columns
      .map((c) => `${c.name} ${c.dataType}${c.isPrimaryKey ? " pk" : ""}${c.nullable ? "" : " not null"}`)
      .join(", ");
    lines.push(`table ${t.id} (~${t.estimatedRows ?? "?"} rows): ${cols}`);
  }
  for (const r of graph.relationships) {
    if (only && !(only.has(r.fromTable) && only.has(r.toTable))) continue;
    lines.push(
      `rel ${r.fromTable}(${r.fromColumns.join(",")}) -> ${r.toTable}(${r.toColumns.join(",")}) [${r.provenance}]`,
    );
  }
  return lines.join("\n");
}
