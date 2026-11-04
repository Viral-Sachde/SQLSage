import type { Relationship, SchemaSnapshot, Table } from "@sqlsage/shared";

export interface SchemaGraph {
  tables: Map<string, Table>;
  relationships: Relationship[];
  /** Undirected adjacency, table id to neighbor table ids */
  adjacency: Map<string, Set<string>>;
}

const singular = (word: string) =>
  word.endsWith("ies") ? word.slice(0, -3) + "y" : word.endsWith("s") ? word.slice(0, -1) : word;

/** Relationships declared through foreign key constraints. */
export function verifiedRelationships(snapshot: SchemaSnapshot): Relationship[] {
  return snapshot.foreignKeys.map((fk) => {
    const target = snapshot.tables.find((t) => t.id === fk.toTable);
    const source = snapshot.tables.find((t) => t.id === fk.fromTable);
    const fromIsPk =
      !!source && source.primaryKey.length === fk.fromColumns.length &&
      source.primaryKey.every((c) => fk.fromColumns.includes(c));
    return {
      id: `fk:${fk.name}`,
      fromTable: fk.fromTable,
      fromColumns: fk.fromColumns,
      toTable: fk.toTable,
      toColumns: fk.toColumns.length ? fk.toColumns : target?.primaryKey ?? [],
      cardinality: fromIsPk ? "one-to-one" : "many-to-one",
      provenance: "verified",
      confidence: 1,
      reason: `Foreign key constraint ${fk.name}`,
    };
  });
}

/**
 * Heuristic relationships for columns like `customer_id` with no constraint.
 * These are always marked as inferred and never presented as fact.
 */
export function inferRelationships(snapshot: SchemaSnapshot, known: Relationship[]): Relationship[] {
  const covered = new Set(known.map((r) => `${r.fromTable}.${r.fromColumns.join(",")}`));
  const byName = new Map<string, Table>();
  for (const t of snapshot.tables) {
    byName.set(t.name, t);
    byName.set(singular(t.name), t);
  }
  const out: Relationship[] = [];
  for (const table of snapshot.tables) {
    for (const col of table.columns) {
      const m = /^(.+?)_?id$/i.exec(col.name);
      if (!m || col.isPrimaryKey) continue;
      const key = `${table.id}.${col.name}`;
      if (covered.has(key)) continue;
      const base = m[1].replace(/_$/, "").toLowerCase();
      const target = byName.get(base) ?? byName.get(base + "s");
      if (!target || target.id === table.id || target.primaryKey.length !== 1) continue;
      const pk = target.columns.find((c) => c.name === target.primaryKey[0]);
      const typeMatch = pk?.dataType === col.dataType;
      out.push({
        id: `inferred:${key}`,
        fromTable: table.id,
        fromColumns: [col.name],
        toTable: target.id,
        toColumns: target.primaryKey,
        cardinality: "many-to-one",
        provenance: "inferred",
        confidence: typeMatch ? 0.8 : 0.5,
        reason: `Column name ${col.name} matches table ${target.name}${typeMatch ? " and key types agree" : ""}`,
      });
    }
  }
  return out;
}

export function buildGraph(snapshot: SchemaSnapshot, opts: { infer?: boolean } = {}): SchemaGraph {
  const verified = verifiedRelationships(snapshot);
  const relationships = opts.infer === false ? verified : [...verified, ...inferRelationships(snapshot, verified)];
  const tables = new Map(snapshot.tables.map((t) => [t.id, t]));
  const adjacency = new Map<string, Set<string>>();
  for (const id of tables.keys()) adjacency.set(id, new Set());
  for (const r of relationships) {
    adjacency.get(r.fromTable)?.add(r.toTable);
    adjacency.get(r.toTable)?.add(r.fromTable);
  }
  return { tables, relationships, adjacency };
}

/** Shortest join path between two tables (BFS). */
export function joinPath(graph: SchemaGraph, from: string, to: string): string[] | null {
  if (from === to) return [from];
  const prev = new Map<string, string>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of graph.adjacency.get(cur) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      prev.set(next, cur);
      if (next === to) {
        const path = [to];
        let p = to;
        while (prev.has(p)) path.unshift((p = prev.get(p)!));
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/** Tables within `depth` hops, used to scope AI context to what matters. */
export function neighborhood(graph: SchemaGraph, seeds: string[], depth = 1): Set<string> {
  const result = new Set(seeds);
  let frontier = [...seeds];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier)
      for (const n of graph.adjacency.get(id) ?? []) if (!result.has(n)) (result.add(n), next.push(n));
    frontier = next;
  }
  return result;
}

/** Tables nothing references and that reference nothing. */
export function isolatedTables(graph: SchemaGraph): string[] {
  return [...graph.adjacency].filter(([, n]) => n.size === 0).map(([id]) => id);
}
