"use client";

import { useEffect, useMemo, useState } from "react";
import { adviseSchema } from "@sqlsage/core";
import { buildGraph } from "@sqlsage/graph";
import type { Relationship, SchemaSnapshot } from "@sqlsage/shared";
import { demoSnapshot } from "@/lib/demo";
import SchemaGraph from "./SchemaGraph";

const API = process.env.NEXT_PUBLIC_SQLSAGE_API;

type Tab = "graph" | "ask" | "advisor";

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<SchemaSnapshot>(demoSnapshot);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<Tab>("graph");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!API) return;
    fetch(`${API}/api/schema`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { snapshot: SchemaSnapshot }) => (setSnapshot(d.snapshot), setLive(true)))
      .catch(() => setLive(false));
  }, []);

  const graph = useMemo(() => buildGraph(snapshot), [snapshot]);
  const recs = useMemo(() => adviseSchema(snapshot), [snapshot]);
  const table = selected ? graph.tables.get(selected) : null;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="mark" /> SQLsage
        </div>
        <div className="conn">
          <span className={`led ${live ? "on" : ""}`} />
          {live ? snapshot.database : "Demo schema"}
        </div>
        <nav>
          {(["graph", "ask", "advisor"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {{ graph: "Schema Graph", ask: "Ask Your Data", advisor: "Schema Advisor" }[t]}
            </button>
          ))}
        </nav>
        <div className="tables">
          <div className="label">Tables</div>
          {snapshot.tables.map((t) => (
            <button key={t.id} className={selected === t.id ? "on" : ""} onClick={() => (setSelected(t.id), setTab("graph"))}>
              {t.name}
              <span>{t.estimatedRows?.toLocaleString() ?? "?"}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        {tab === "graph" && (
          <div className="graph-view">
            <div className="panel graph-panel">
              <SchemaGraph graph={graph} selected={selected} onSelect={setSelected} />
            </div>
            <div className="panel detail">
              {table ? (
                <>
                  <h2>{table.id}</h2>
                  <p className="muted">~{table.estimatedRows?.toLocaleString()} rows</p>
                  <table className="cols">
                    <tbody>
                      {table.columns.map((c) => (
                        <tr key={c.name}>
                          <td>{c.name}</td>
                          <td className="muted">{c.dataType}</td>
                          <td>{c.isPrimaryKey ? <span className="tag">pk</span> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <h3>Relationships</h3>
                  {graph.relationships
                    .filter((r) => r.fromTable === table.id || r.toTable === table.id)
                    .map((r) => <Rel key={r.id} r={r} />)}
                </>
              ) : (
                <p className="muted">Select a table to see columns and relationships.</p>
              )}
            </div>
          </div>
        )}
        {tab === "ask" && <Ask live={live} />}
        {tab === "advisor" && (
          <div className="panel">
            <h2>Schema Advisor</h2>
            <p className="muted">Deterministic checks. Suggested SQL is never applied automatically.</p>
            {recs.map((r) => (
              <div key={r.id} className="rec">
                <span className={`sev ${r.severity}`}>{r.severity}</span>
                <div>
                  <strong>{r.title}</strong> <span className="muted">[{r.evidence}]</span>
                  <p>{r.rationale}</p>
                  {r.sql && <pre>{r.sql}</pre>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Rel({ r }: { r: Relationship }) {
  return (
    <div className="rel">
      <code>
        {r.fromTable.split(".")[1]}.{r.fromColumns.join(",")} → {r.toTable.split(".")[1]}
      </code>
      <span className={`tag ${r.provenance}`}>
        {r.provenance === "verified" ? "verified" : `inferred ${Math.round(r.confidence * 100)}%`}
      </span>
    </div>
  );
}

function Ask({ live }: { live: boolean }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ sql: string; result: { columns: string[]; rows: Record<string, unknown>[] }; explanation?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!live || !API) return setErr("Connect the SQLsage server (set NEXT_PUBLIC_SQLSAGE_API) to ask questions.");
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${API}/api/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, explain: true }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? "Request failed");
      setRes(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Ask Your Data</h2>
      <form onSubmit={submit} className="ask">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Which customers generated the most revenue last quarter?" />
        <button disabled={busy || !q}>{busy ? "Thinking" : "Ask"}</button>
      </form>
      {err && <p className="err">{err}</p>}
      {res && (
        <>
          <pre>{res.sql}</pre>
          <table className="cols">
            <thead>
              <tr>{res.result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {res.result.rows.map((row, i) => (
                <tr key={i}>{res.result.columns.map((c) => <td key={c}>{String(row[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {res.explanation && <p>{res.explanation}</p>}
        </>
      )}
    </div>
  );
}
