/** Where a piece of knowledge came from. Verified facts come from database catalogs. */
export type Provenance = "verified" | "inferred";

export interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  comment: string | null;
}

export interface Index {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
  method: string;
}

export interface ForeignKey {
  name: string;
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
}

export interface Table {
  /** Fully qualified name, schema.table */
  id: string;
  schema: string;
  name: string;
  columns: Column[];
  primaryKey: string[];
  estimatedRows: number | null;
  sizeBytes: number | null;
  comment: string | null;
}

export interface SchemaSnapshot {
  engine: "postgres" | "mysql" | "sqlite";
  database: string;
  capturedAt: string;
  tables: Table[];
  foreignKeys: ForeignKey[];
  indexes: Index[];
}

export interface Relationship {
  id: string;
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  cardinality: "one-to-one" | "many-to-one";
  provenance: Provenance;
  /** 0..1, always 1 for verified relationships */
  confidence: number;
  reason: string;
}

export type RecommendationKind = "index" | "relationship" | "naming" | "data-model" | "performance";

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  severity: "info" | "low" | "medium" | "high";
  title: string;
  rationale: string;
  /** Measured comes from stats or query plans; speculative comes from heuristics or AI. */
  evidence: "measured" | "speculative";
  tables: string[];
  /** Suggested DDL. Never applied automatically. */
  sql?: string;
}

export interface QueryResult {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

/** Controls what is allowed to leave the customer's environment. */
export type EgressPolicy = "none" | "schema" | "schema+results";

export interface Guardrails {
  statementTimeoutMs: number;
  rowLimit: number;
  egress: EgressPolicy;
}

export const defaultGuardrails: Guardrails = {
  statementTimeoutMs: 5000,
  rowLimit: 500,
  egress: "schema",
};

/** Minimal executor contract every database adapter implements. */
export interface DatabaseAdapter {
  readonly engine: SchemaSnapshot["engine"];
  introspect(): Promise<SchemaSnapshot>;
  /** Runs read-only SQL inside a read-only transaction with a timeout. */
  query(sql: string, guardrails: Guardrails): Promise<QueryResult>;
  explain(sql: string): Promise<unknown>;
  close(): Promise<void>;
}
