const NODES = [
  { id: "customers", x: 90, y: 70, cols: ["id", "name", "plan"] },
  { id: "subscriptions", x: 330, y: 40, cols: ["id", "customer_id", "status"] },
  { id: "invoices", x: 330, y: 200, cols: ["id", "customer_id", "amount_cents"] },
  { id: "events", x: 90, y: 230, cols: ["id", "account_id", "type"] },
  { id: "payments", x: 560, y: 130, cols: ["id", "invoice_id", "status"] },
];
const EDGES = [
  { from: "subscriptions", to: "customers", inferred: false },
  { from: "invoices", to: "customers", inferred: false },
  { from: "payments", to: "invoices", inferred: false },
  { from: "events", to: "customers", inferred: true },
];
const W = 150;
const H = 88;

export default function SchemaArt() {
  const pos = Object.fromEntries(NODES.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 740 340" className="schema-art" role="img" aria-label="Schema graph with verified foreign keys drawn solid and an AI-inferred relationship drawn dashed">
      <defs>
        <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f7fa" />
          <stop offset="0.45" stopColor="#a9afb8" />
          <stop offset="0.5" stopColor="#5d636b" />
          <stop offset="1" stopColor="#d7dbe0" />
        </linearGradient>
        <linearGradient id="node" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16191e" />
          <stop offset="1" stopColor="#0c0e11" />
        </linearGradient>
      </defs>
      {EDGES.map((e) => {
        const a = pos[e.from];
        const b = pos[e.to];
        const x1 = a.x + W / 2, y1 = a.y + H / 2, x2 = b.x + W / 2, y2 = b.y + H / 2;
        const mx = (x1 + x2) / 2;
        return (
          <path
            key={e.from + e.to}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none"
            stroke={e.inferred ? "#9fd3ff" : "url(#chrome)"}
            strokeWidth={e.inferred ? 1.5 : 2}
            strokeDasharray={e.inferred ? "6 6" : undefined}
            className={e.inferred ? "edge-inferred" : undefined}
          />
        );
      })}
      {NODES.map((n) => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          <rect width={W} height={H} rx="10" fill="url(#node)" stroke="url(#chrome)" strokeWidth="1" />
          <text x="12" y="22" className="node-title">{n.id}</text>
          <line x1="0" x2={W} y1="32" y2="32" stroke="#2a2e35" />
          {n.cols.map((c, i) => (
            <text key={c} x="12" y={50 + i * 14} className="node-col">
              {c}
            </text>
          ))}
        </g>
      ))}
      <g transform="translate(470,272)" className="legend">
        <line x1="0" x2="28" y1="0" y2="0" stroke="url(#chrome)" strokeWidth="2" />
        <text x="36" y="4">verified foreign key</text>
        <line x1="0" x2="28" y1="22" y2="22" stroke="#9fd3ff" strokeWidth="1.5" strokeDasharray="6 6" />
        <text x="36" y="26">inferred, 80% confidence</text>
      </g>
    </svg>
  );
}
