import LiquidMetal from "@/components/LiquidMetal";
import AskDemo from "@/components/AskDemo";
import FormatTabs from "@/components/FormatTabs";
import SchemaArt from "@/components/SchemaArt";

const GITHUB = "https://github.com/Viral-Sachde/SQLSage";

const CAPABILITIES = [
  {
    n: "01",
    title: "Schema Graph",
    body: "Visualize tables, relationships, keys and dependencies. Verified foreign keys and AI-inferred relationships are always kept apart.",
    tag: "Schema intelligence",
  },
  {
    n: "02",
    title: "Ask Your Data",
    body: "Natural language becomes validated SQL, executed under restricted permissions, with the result explained in plain words.",
    tag: "Data agent",
  },
  {
    n: "03",
    title: "Schema Advisor",
    body: "Indexes, relationships, naming and data-model changes, each with the evidence behind it. Nothing is applied without your approval.",
    tag: "Performance and design",
  },
  {
    n: "04",
    title: "Business Insights",
    body: "Tell SQLsage what you are building. It recommends the metrics, queries and decisions your schema can actually support.",
    tag: "Use-case advisor",
  },
];

const LAYERS = [
  { name: "Interfaces", items: ["Web app", "CLI", "Node.js SDK"] },
  { name: "SQLsage Core", items: ["Schema introspection", "Metadata graph", "Query planning", "Recommendations"] },
  { name: "AI orchestration", items: ["Schema analyst", "SQL agent", "Performance advisor", "Business analyst"] },
  { name: "Database adapters", items: ["PostgreSQL", "MySQL soon", "SQLite later"] },
  { name: "Your database", items: ["Read-only role", "Never uploaded"] },
];

const GUARDS = [
  { t: "Read-only by design", d: "Read-only credentials plus read-only transactions. SQLsage cannot write, even if a model tries." },
  { t: "Validated SQL", d: "Single statements, SELECT only, dangerous functions and locking clauses rejected before execution." },
  { t: "Timeouts and limits", d: "Statement timeouts and row limits on every query, configurable per deployment." },
  { t: "Egress control", d: "Choose whether schema metadata or query results may leave your environment. Or neither." },
  { t: "Any model", d: "Hosted APIs or local models through one provider interface. Swap without touching your app." },
  { t: "Approval first", d: "Suggested DDL is shown, explained and labelled measured or speculative. Never run for you." },
];

const ADVICE = [
  { sev: "high", title: "public.audit_log has no primary key", ev: "measured" },
  { sev: "medium", title: "Index public.invoices (customer_id)", ev: "measured" },
  { sev: "low", title: "Add subscription_status_history for churn analysis", ev: "speculative" },
  { sev: "info", title: "Declare events.account_id as a foreign key", ev: "speculative" },
];

export default function Home() {
  return (
    <>
      <header className="nav">
        <a href="#" className="brand" aria-label="SQLsage home">
          <span className="brand-mark" aria-hidden="true" />
          SQLsage
        </a>
        <nav className="nav-links">
          <a href="#capabilities">Capabilities</a>
          <a href="#ask">Ask</a>
          <a href="#formats">Formats</a>
          <a href="#architecture">Architecture</a>
          <a href="#security">Security</a>
        </nav>
        <a href={GITHUB} className="btn btn-ghost btn-sm">
          GitHub
        </a>
      </header>

      <main>
        <section className="hero">
          <LiquidMetal className="hero-canvas" />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-inner">
            <p className="eyebrow">
              <span className="dot" /> AI-powered database intelligence
            </p>
            <h1 className="chrome-text">
              Your database,
              <br />
              finally understood.
            </h1>
            <p className="lede">
              Connect a database. Understand its structure. Ask questions. Discover insights. Make better data decisions,
              all from infrastructure you control.
            </p>
            <div className="cta-row">
              <a href="#formats" className="btn btn-metal">
                Get started
              </a>
              <a href={GITHUB} className="btn btn-ghost">
                Star on GitHub
              </a>
            </div>
            <div className="install">
              <span className="install-prompt">$</span>
              <code>npx @sqlsage/cli inspect --url $DATABASE_URL</code>
            </div>
          </div>
        </section>

        <section className="strip" aria-label="Highlights">
          <span>Self-hosted</span>
          <span>PostgreSQL first</span>
          <span>Local or hosted models</span>
          <span>Read-only by default</span>
          <span>TypeScript SDK</span>
        </section>

        <section id="capabilities" className="section">
          <div className="section-head">
            <p className="kicker">Four capabilities, not one giant agent</p>
            <h2 className="chrome-text">Intelligence you can trust, because you can see it.</h2>
          </div>
          <div className="cap-grid">
            {CAPABILITIES.map((c) => (
              <article key={c.n} className="cap metal-frame">
                <div className="cap-top">
                  <span className="cap-n">{c.n}</span>
                  <span className="pill">{c.tag}</span>
                </div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section split">
          <div>
            <p className="kicker">Schema graph</p>
            <h2 className="chrome-text">Know what is verified and what is a guess.</h2>
            <p className="body">
              SQLsage reads your catalogs and builds a graph of tables, columns, keys, indexes and dependencies. Where a
              column looks like a relationship but no constraint exists, it says so, with a confidence score and the
              reason, instead of pretending.
            </p>
          </div>
          <div className="metal-frame art-frame">
            <SchemaArt />
          </div>
        </section>

        <section id="ask" className="section split reverse">
          <AskDemo />
          <div>
            <p className="kicker">Ask your data</p>
            <h2 className="chrome-text">Questions in. Validated SQL out.</h2>
            <p className="body">
              SQLsage finds the relevant tables, writes the query, checks it against strict read-only rules, runs it
              with a timeout and a row limit, and explains what came back, including the caveats.
            </p>
          </div>
        </section>

        <section className="section split">
          <div>
            <p className="kicker">Schema and use-case advisor</p>
            <h2 className="chrome-text">Advice with receipts.</h2>
            <p className="body">
              Say “I am building a SaaS subscription product” and SQLsage looks for what is missing: status history,
              invoices, payment events, supporting indexes. Every suggestion is labelled measured or speculative, and
              none of them is assumed to be necessary.
            </p>
          </div>
          <div className="advice metal-frame">
            {ADVICE.map((a) => (
              <div key={a.title} className="advice-row">
                <span className={`sev sev-${a.sev}`}>{a.sev}</span>
                <span className="advice-title">{a.title}</span>
                <span className={`ev ev-${a.ev}`}>{a.ev}</span>
              </div>
            ))}
            <div className="advice-foot">4 suggestions · 0 applied · awaiting your review</div>
          </div>
        </section>

        <section id="formats" className="section">
          <div className="section-head">
            <p className="kicker">One core, many doors</p>
            <h2 className="chrome-text">Use it however you work.</h2>
            <p className="body center">
              The intelligence lives in a reusable TypeScript core. The web app, CLI, SDK and server are just different
              ways in.
            </p>
          </div>
          <FormatTabs />
        </section>

        <section id="architecture" className="section">
          <div className="section-head">
            <p className="kicker">Architecture</p>
            <h2 className="chrome-text">Layered like an alloy.</h2>
          </div>
          <div className="layers">
            {LAYERS.map((l, i) => (
              <div key={l.name} className="layer" style={{ ["--i" as string]: i }}>
                <span className="layer-name">{l.name}</span>
                <span className="layer-items">
                  {l.items.map((it) => (
                    <span key={it} className="chip">
                      {it}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="security" className="section">
          <div className="section-head">
            <p className="kicker">Local-first, provider-flexible</p>
            <h2 className="chrome-text">Your data never has to leave.</h2>
            <p className="body center">
              Run the app and its metadata store in your own infrastructure. SQLsage never requires uploading your
              database to an AI provider.
            </p>
          </div>
          <div className="guard-grid">
            {GUARDS.map((g) => (
              <div key={g.t} className="guard">
                <span className="guard-icon" aria-hidden="true" />
                <h3>{g.t}</h3>
                <p>{g.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="final">
          <LiquidMetal className="final-canvas" intensity={0.85} scale={0.5} />
          <div className="final-shade" aria-hidden="true" />
          <div className="final-inner">
            <h2 className="chrome-text">Not just chat with your database.</h2>
            <p className="lede">
              Understand what it means, what it is missing, and how to use it to make better decisions.
            </p>
            <div className="cta-row center">
              <a href={GITHUB} className="btn btn-metal">
                Get SQLsage
              </a>
              <a href="#formats" className="btn btn-ghost">
                Read the docs
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          SQLsage
        </span>
        <span className="muted">AI-powered database intelligence. Open source, self-hosted.</span>
        <a href={GITHUB} className="muted">
          github.com/Viral-Sachde/SQLSage
        </a>
      </footer>
    </>
  );
}
