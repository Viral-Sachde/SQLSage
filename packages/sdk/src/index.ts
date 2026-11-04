import { PostgresAdapter } from "@sqlsage/adapter-postgres";
import { AnthropicProvider, OllamaProvider, adviseUseCase, explainResult, generateSql, suggestInsights, type LLMProvider } from "@sqlsage/ai";
import { adviseSchema, validateReadOnlySql } from "@sqlsage/core";
import { buildGraph, joinPath } from "@sqlsage/graph";
import { defaultGuardrails, type DatabaseAdapter, type Guardrails, type SchemaSnapshot } from "@sqlsage/shared";

export * from "@sqlsage/shared";
export { buildGraph, joinPath } from "@sqlsage/graph";
export { validateReadOnlySql, adviseSchema, describeSchema } from "@sqlsage/core";
export { AnthropicProvider, OllamaProvider, type LLMProvider } from "@sqlsage/ai";
export { PostgresAdapter } from "@sqlsage/adapter-postgres";

export interface SQLsageOptions {
  /** Postgres connection string, or a custom adapter */
  database: string | DatabaseAdapter;
  provider?: LLMProvider;
  guardrails?: Partial<Guardrails>;
}

export class SQLsage {
  readonly adapter: DatabaseAdapter;
  readonly guardrails: Guardrails;
  private provider?: LLMProvider;
  private snapshot?: SchemaSnapshot;

  constructor(opts: SQLsageOptions) {
    this.adapter = typeof opts.database === "string" ? new PostgresAdapter({ connectionString: opts.database }) : opts.database;
    this.provider = opts.provider;
    this.guardrails = { ...defaultGuardrails, ...opts.guardrails };
  }

  /** Builds a provider from SQLSAGE_* environment variables. */
  static providerFromEnv(env = process.env): LLMProvider | undefined {
    if (env.SQLSAGE_LLM_PROVIDER === "ollama")
      return new OllamaProvider({ baseUrl: env.SQLSAGE_OLLAMA_URL, model: env.SQLSAGE_OLLAMA_MODEL ?? "qwen2.5-coder" });
    if (env.ANTHROPIC_API_KEY || env.SQLSAGE_LLM_PROVIDER === "anthropic") return new AnthropicProvider();
    return undefined;
  }

  async schema(refresh = false) {
    if (!this.snapshot || refresh) this.snapshot = await this.adapter.introspect();
    return this.snapshot;
  }

  async graph() {
    return buildGraph(await this.schema());
  }

  async joinPath(from: string, to: string) {
    return joinPath(await this.graph(), from, to);
  }

  /** Deterministic recommendations, no AI involved. */
  async advise() {
    return adviseSchema(await this.schema());
  }

  async query(sql: string) {
    const check = validateReadOnlySql(sql);
    if (!check.ok) throw new Error(`Rejected: ${check.reason}`);
    return this.adapter.query(sql, this.guardrails);
  }

  async ask(question: string, opts: { explain?: boolean } = {}) {
    const provider = this.requireProvider();
    const { sql, tables } = await generateSql(question, { provider, snapshot: await this.schema(), egress: this.guardrails.egress });
    const result = await this.query(sql);
    const explanation =
      opts.explain && (this.guardrails.egress === "schema+results" || !provider.external)
        ? await explainResult(question, result, { provider, egress: this.guardrails.egress })
        : undefined;
    return { sql, tables, result, explanation };
  }

  async adviseFor(useCase: string) {
    const provider = this.requireProvider();
    const snapshot = await this.schema();
    const ai = await adviseUseCase(useCase, { provider, snapshot, egress: this.guardrails.egress });
    return [...adviseSchema(snapshot), ...ai];
  }

  async insights(useCase: string) {
    return suggestInsights(useCase, { provider: this.requireProvider(), snapshot: await this.schema(), egress: this.guardrails.egress });
  }

  close() {
    return this.adapter.close();
  }

  private requireProvider() {
    if (!this.provider) throw new Error("No LLM provider configured. Pass `provider` or set SQLSAGE_LLM_PROVIDER.");
    return this.provider;
  }
}
