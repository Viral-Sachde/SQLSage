import type { SchemaSnapshot, Table } from "@sqlsage/shared";

const col = (name: string, dataType: string, pk = false, nullable = !pk) => ({
  name, dataType, nullable, isPrimaryKey: pk, defaultValue: null, comment: null,
});
const table = (name: string, rows: number, columns: ReturnType<typeof col>[]): Table => ({
  id: `public.${name}`, schema: "public", name, columns, estimatedRows: rows, sizeBytes: rows * 180, comment: null,
  primaryKey: columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
});

/** Demo snapshot so the dashboard works with no database or server. */
export const demoSnapshot: SchemaSnapshot = {
  engine: "postgres",
  database: "demo_saas",
  capturedAt: new Date(0).toISOString(),
  tables: [
    table("accounts", 1200, [col("id", "uuid", true), col("name", "text"), col("plan", "text"), col("created_at", "timestamptz")]),
    table("customers", 5400, [col("id", "uuid", true), col("account_id", "uuid"), col("email", "text"), col("name", "text")]),
    table("subscriptions", 4100, [col("id", "uuid", true), col("customer_id", "uuid"), col("status", "text"), col("trial_started_at", "timestamptz")]),
    table("invoices", 61000, [col("id", "uuid", true), col("customer_id", "uuid"), col("amount_cents", "integer"), col("paid_at", "timestamptz")]),
    table("payments", 59000, [col("id", "uuid", true), col("invoice_id", "uuid"), col("status", "text"), col("provider", "text")]),
    table("events", 8200000, [col("id", "bigint", true), col("account_id", "uuid"), col("type", "text"), col("created_at", "timestamptz")]),
    table("audit_log", 320000, [col("actor", "text"), col("action", "text"), col("createdAt", "timestamptz")]),
  ],
  foreignKeys: [
    { name: "customers_account_id_fkey", fromTable: "public.customers", fromColumns: ["account_id"], toTable: "public.accounts", toColumns: ["id"] },
    { name: "subscriptions_customer_id_fkey", fromTable: "public.subscriptions", fromColumns: ["customer_id"], toTable: "public.customers", toColumns: ["id"] },
    { name: "invoices_customer_id_fkey", fromTable: "public.invoices", fromColumns: ["customer_id"], toTable: "public.customers", toColumns: ["id"] },
    { name: "payments_invoice_id_fkey", fromTable: "public.payments", fromColumns: ["invoice_id"], toTable: "public.invoices", toColumns: ["id"] },
  ],
  indexes: [
    { name: "customers_account_id_idx", table: "public.customers", columns: ["account_id"], unique: false, primary: false, method: "btree" },
    { name: "payments_invoice_id_idx", table: "public.payments", columns: ["invoice_id"], unique: false, primary: false, method: "btree" },
  ],
};
