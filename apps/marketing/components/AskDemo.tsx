"use client";

import { useEffect, useState } from "react";

const EXAMPLES = [
  {
    q: "Which customers generated the most revenue last quarter?",
    sql: `select c.name, sum(i.amount_cents) / 100.0 as revenue
from public.customers c
join public.invoices i on i.customer_id = c.id
where i.paid_at >= date_trunc('quarter', now()) - interval '3 months'
  and i.paid_at <  date_trunc('quarter', now())
group by c.name
order by revenue desc
limit 5`,
    cols: ["name", "revenue"],
    rows: [["Northwind Labs", "$184,220"], ["Acme Freight", "$151,904"], ["Halcyon Health", "$122,375"], ["Orbit Retail", "$98,010"]],
    note: "Revenue is concentrated: the top 4 accounts make up 41% of last quarter's paid invoices.",
  },
  {
    q: "How many trials converted to paid in the last 30 days?",
    sql: `select count(*) filter (where s.status = 'active') as converted,
       count(*) as trials
from public.subscriptions s
where s.trial_started_at >= now() - interval '30 days'`,
    cols: ["converted", "trials"],
    rows: [["312", "1,148"]],
    note: "27% trial conversion. status history is not tracked, so churned conversions are not counted.",
  },
  {
    q: "Which tables grew the fastest this month?",
    sql: `select relname as table_name, n_tup_ins as inserted
from pg_stat_user_tables
order by n_tup_ins desc
limit 3`,
    cols: ["table_name", "inserted"],
    rows: [["events", "8.2M"], ["sessions", "1.1M"], ["invoices", "48K"]],
    note: "events has no index on (account_id, created_at), which most dashboard queries filter by.",
  },
];

const CHECKS = ["Single statement", "SELECT only", "Read-only transaction", "5s statement timeout", "500 row limit"];

export default function AskDemo() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [stage, setStage] = useState(0);
  const ex = EXAMPLES[i];

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTyped(ex.q);
      setStage(3);
      return;
    }
    setTyped("");
    setStage(0);
    let n = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const type = setInterval(() => {
      n++;
      setTyped(ex.q.slice(0, n));
      if (n >= ex.q.length) {
        clearInterval(type);
        timers.push(setTimeout(() => setStage(1), 350));
        timers.push(setTimeout(() => setStage(2), 1300));
        timers.push(setTimeout(() => setStage(3), 2100));
        timers.push(setTimeout(() => setI((v) => (v + 1) % EXAMPLES.length), 7500));
      }
    }, 28);
    return () => {
      clearInterval(type);
      timers.forEach(clearTimeout);
    };
  }, [i, ex.q]);

  return (
    <div className="ask metal-frame">
      <div className="ask-bar">
        <span className="ask-prompt">ask</span>
        <span className="ask-q">
          {typed}
          <span className="caret" />
        </span>
      </div>
      <div className={`ask-step ${stage >= 1 ? "on" : ""}`}>
        <div className="ask-label">Generated SQL</div>
        <pre className="ask-sql">{ex.sql}</pre>
      </div>
      <div className={`ask-step ${stage >= 2 ? "on" : ""}`}>
        <div className="ask-label">Validated</div>
        <ul className="checks">
          {CHECKS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <div className={`ask-step ${stage >= 3 ? "on" : ""}`}>
        <div className="ask-label">Result</div>
        <table className="ask-table">
          <thead>
            <tr>{ex.cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {ex.rows.map((r) => (
              <tr key={r[0]}>{r.map((v, k) => <td key={k}>{v}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="ask-note">{ex.note}</p>
      </div>
      <div className="ask-dots" role="tablist" aria-label="Examples">
        {EXAMPLES.map((e, k) => (
          <button key={k} role="tab" aria-selected={k === i} aria-label={e.q} className={k === i ? "on" : ""} onClick={() => setI(k)} />
        ))}
      </div>
    </div>
  );
}
