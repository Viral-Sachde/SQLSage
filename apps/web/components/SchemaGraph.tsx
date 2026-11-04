"use client";

import { useMemo } from "react";
import type { SchemaGraph as Graph } from "@sqlsage/graph";

const W = 150;
const H = 40;

/** Simple layered layout: tables ordered by how many hops they are from the most connected table. */
function layout(graph: Graph) {
  const ids = [...graph.tables.keys()];
  const root = ids.sort((a, b) => (graph.adjacency.get(b)?.size ?? 0) - (graph.adjacency.get(a)?.size ?? 0))[0];
  const depth = new Map<string, number>([[root, 0]]);
  const queue = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of graph.adjacency.get(cur) ?? []) if (!depth.has(n)) (depth.set(n, depth.get(cur)! + 1), queue.push(n));
  }
  const maxD = Math.max(0, ...depth.values());
  for (const id of ids) if (!depth.has(id)) depth.set(id, maxD + 1);
  const cols = new Map<number, string[]>();
  for (const [id, d] of depth) cols.set(d, [...(cols.get(d) ?? []), id]);
  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, list] of cols) list.forEach((id, i) => pos.set(id, { x: 30 + d * 210, y: 30 + i * 80 }));
  const width = 60 + (Math.max(...cols.keys()) + 1) * 210;
  const height = 60 + Math.max(...[...cols.values()].map((l) => l.length)) * 80;
  return { pos, width, height };
}

export default function SchemaGraph({ graph, selected, onSelect }: { graph: Graph; selected: string | null; onSelect: (id: string) => void }) {
  const { pos, width, height } = useMemo(() => layout(graph), [graph]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="graph" role="img" aria-label="Schema graph">
      {graph.relationships.map((r) => {
        const a = pos.get(r.fromTable);
        const b = pos.get(r.toTable);
        if (!a || !b) return null;
        const x1 = a.x + W / 2, y1 = a.y + H / 2, x2 = b.x + W / 2, y2 = b.y + H / 2;
        const mx = (x1 + x2) / 2;
        const hot = selected && (r.fromTable === selected || r.toTable === selected);
        return (
          <path key={r.id} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none"
            className={`edge ${r.provenance} ${hot ? "hot" : ""}`} />
        );
      })}
      {[...graph.tables.values()].map((t) => {
        const p = pos.get(t.id)!;
        return (
          <g key={t.id} transform={`translate(${p.x},${p.y})`} className={`node ${selected === t.id ? "on" : ""}`} onClick={() => onSelect(t.id)}>
            <rect width={W} height={H} rx="8" />
            <text x="12" y="25">{t.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
