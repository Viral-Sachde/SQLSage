import type { EgressPolicy, QueryResult, Recommendation, SchemaSnapshot } from "@sqlsage/shared";
import { buildGraph, neighborhood } from "@sqlsage/graph";
import { describeSchema, validateReadOnlySql } from "@sqlsage/core";
import type { LLMProvider } from "./providers/types.js";

function assertEgress(provider: LLMProvider, policy: EgressPolicy, needs: "schema" | "results") {
  if (!provider.external) return;
  if (policy === "none") throw new Error("Egress policy 'none' forbids sending metadata to an external model. Use a local provider.");
  if (needs === "results" && policy !== "schema+results")
    throw new Error("Egress policy forbids sending query results to an external model.");
}

function extractSql(text: string) {
  const fenced = /```(?:sql)?\s*([\s\S]*?)```/i.exec(text);
  return (fenced ? fenced[1] : text).trim();
}

function extractJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  return JSON.parse(fenced ? fenced[1] : text) as T;
}

/** Picks tables mentioned by the question, then widens one hop to include join tables. */
export function relevantTables(snapshot: SchemaSnapshot, question: string): Set<string> {
  const q = question.toLowerCase();
  const graph = buildGraph(snapshot);
  const seeds = snapshot.tables
    .filter((t) => {
      const n = t.name.toLowerCase();
      return q.includes(n) || q.includes(n.replace(/s$/, "")) || t.columns.some((c) => q.includes(c.name.toLowerCase()));
    })
    .map((t) => t.id);
  if (seeds.length === 0 || snapshot.tables.length <= 30) return new Set(snapshot.tables.map((t) => t.id));
  return neighborhood(graph, seeds, 1);
}

export interface SqlAgentOptions {
  provider: LLMProvider;
  snapshot: SchemaSnapshot;
  egress: EgressPolicy;
  /** Max regeneration attempts when validation fails */
  retries?: number;
}

/** Natural language to validated, read-only SQL. */
export async function generateSql(question: string, o: SqlAgentOptions): Promise<{ sql: string; tables: string[] }> {
  assertEgress(o.provider, o.egress, "schema");
  const tables = relevantTables(o.snapshot, question);
  const schema = describeSchema(o.snapshot, tables);
  const system = [
    `You write a single read-only ${o.snapshot.engine} query that answers the user's question.`,
    "Use only tables and columns from the schema provided. Prefer verified relationships for joins; use inferred ones only when needed.",
    "Return only the SQL in a ```sql fence.",
  ].join("\n");
  let prompt = `Schema:\n${schema}\n\nQuestion: ${question}`;
  for (let attempt = 0; attempt <= (o.retries ?? 2); attempt++) {
    const sql = extractSql(await o.provider.complete({ system, prompt }));
    const check = validateReadOnlySql(sql);
    if (check.ok) return { sql, tables: [...tables] };
    prompt += `\n\nYour previous query was rejected: ${check.reason}. Write a corrected query.`;
  }
  throw new Error("Could not produce a valid read-only query.");
}

export async function explainResult(question: string, result: QueryResult, o: Omit<SqlAgentOptions, "snapshot">) {
  assertEgress(o.provider, o.egress, "results");
  const sample = JSON.stringify(result.rows.slice(0, 50));
  return o.provider.complete({
    system: "Explain query results to a busy product or engineering lead in 2 to 4 sentences. State caveats such as truncation.",
    prompt: `Question: ${question}\nSQL: ${result.sql}\nRows (${result.rowCount}${result.truncated ? ", truncated" : ""}): ${sample}`,
    maxTokens: 2000,
  });
}

/** Use-case advisor: what a schema for this kind of product might be missing. */
export async function adviseUseCase(useCase: string, o: SqlAgentOptions): Promise<Recommendation[]> {
  assertEgress(o.provider, o.egress, "schema");
  const text = await o.provider.complete({
    system: [
      "You review a database schema against a stated product use case.",
      "Suggest missing concepts, tables, columns or indexes only when the use case plausibly needs them, and say why.",
      "Do not assume every suggestion is required. Mark everything as speculative evidence.",
      'Return a JSON array of {"kind":"data-model"|"index"|"relationship"|"naming","severity":"info"|"low"|"medium"|"high","title":string,"rationale":string,"tables":string[],"sql"?:string} in a ```json fence.',
    ].join("\n"),
    prompt: `Use case: ${useCase}\n\nSchema:\n${describeSchema(o.snapshot)}`,
  });
  const items = extractJson<Omit<Recommendation, "id" | "evidence">[]>(text);
  return items.map((r, i) => ({ ...r, id: `usecase:${i}`, evidence: "speculative" }));
}

/** Business analyst: metrics and starter queries worth tracking for this schema. */
export async function suggestInsights(useCase: string, o: SqlAgentOptions) {
  assertEgress(o.provider, o.egress, "schema");
  const text = await o.provider.complete({
    system:
      'Suggest up to 6 business metrics this schema can answer for the use case. Return a JSON array of {"metric":string,"why":string,"sql":string} in a ```json fence. SQL must be read-only.',
    prompt: `Use case: ${useCase}\n\nSchema:\n${describeSchema(o.snapshot)}`,
  });
  return extractJson<{ metric: string; why: string; sql: string }[]>(text).filter((m) => validateReadOnlySql(m.sql).ok);
}
