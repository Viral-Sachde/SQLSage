import type { Recommendation, SchemaSnapshot } from "@sqlsage/shared";
import { buildGraph } from "@sqlsage/graph";

const isSnake = (s: string) => /^[a-z][a-z0-9_]*$/.test(s);

/**
 * Deterministic schema checks. These run without any AI and are the
 * baseline the AI advisors build on.
 */
export function adviseSchema(snapshot: SchemaSnapshot): Recommendation[] {
  const recs: Recommendation[] = [];
  const graph = buildGraph(snapshot);
  const indexedPrefixes = (table: string) =>
    snapshot.indexes.filter((i) => i.table === table).map((i) => i.columns);

  for (const t of snapshot.tables) {
    if (t.primaryKey.length === 0)
      recs.push({
        id: `no-pk:${t.id}`, kind: "data-model", severity: "high", evidence: "measured", tables: [t.id],
        title: `${t.id} has no primary key`,
        rationale: "Rows cannot be uniquely addressed, which breaks replication, ORMs and safe updates.",
      });

    const names = t.columns.map((c) => c.name);
    const mixed = names.filter((n) => !isSnake(n));
    if (mixed.length && mixed.length < names.length)
      recs.push({
        id: `naming:${t.id}`, kind: "naming", severity: "low", evidence: "measured", tables: [t.id],
        title: `Inconsistent column naming in ${t.id}`,
        rationale: `Columns ${mixed.join(", ")} are not snake_case while the rest of the table is.`,
      });
  }

  for (const r of graph.relationships) {
    const covered = indexedPrefixes(r.fromTable).some((cols) =>
      r.fromColumns.every((c, i) => cols[i] === c),
    );
    if (!covered) {
      const t = graph.tables.get(r.fromTable);
      const big = (t?.estimatedRows ?? 0) > 10_000;
      recs.push({
        id: `fk-index:${r.id}`, kind: "index", severity: big ? "medium" : "low",
        evidence: r.provenance === "verified" ? "measured" : "speculative",
        tables: [r.fromTable, r.toTable],
        title: `Index ${r.fromTable}(${r.fromColumns.join(", ")})`,
        rationale: `${r.provenance === "verified" ? "Foreign key" : "Likely join column"} without a supporting index. Joins and cascading deletes will scan ${r.fromTable}.`,
        sql: `create index concurrently on ${r.fromTable} (${r.fromColumns.join(", ")});`,
      });
    }
    if (r.provenance === "inferred")
      recs.push({
        id: `declare-fk:${r.id}`, kind: "relationship", severity: "info", evidence: "speculative",
        tables: [r.fromTable, r.toTable],
        title: `Possible relationship ${r.fromTable}.${r.fromColumns[0]} to ${r.toTable}`,
        rationale: `${r.reason}. If this is intended, a foreign key would enforce integrity. Confidence ${Math.round(r.confidence * 100)}%.`,
        sql: `alter table ${r.fromTable} add foreign key (${r.fromColumns.join(", ")}) references ${r.toTable} (${r.toColumns.join(", ")}) not valid;`,
      });
  }

  const order = { high: 0, medium: 1, low: 2, info: 3 };
  return recs.sort((a, b) => order[a.severity] - order[b.severity]);
}
