import pg from "pg";
import type { DatabaseAdapter, Guardrails, QueryResult, SchemaSnapshot } from "@sqlsage/shared";

const TABLES_SQL = `
select n.nspname as schema, c.relname as name, c.reltuples::bigint as estimated_rows,
       pg_total_relation_size(c.oid) as size_bytes, obj_description(c.oid) as comment
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'
order by 1, 2`;

const COLUMNS_SQL = `
select c.table_schema as schema, c.table_name as table, c.column_name as name, c.data_type,
       c.is_nullable = 'YES' as nullable, c.column_default,
       col_description((quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass, c.ordinal_position) as comment
from information_schema.columns c
where c.table_schema not in ('pg_catalog','information_schema')
order by c.table_schema, c.table_name, c.ordinal_position`;

const CONSTRAINTS_SQL = `
select con.conname as name, con.contype as type,
       ns.nspname||'.'||cl.relname as from_table,
       array(select attname from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k)::text[] as from_columns,
       fns.nspname||'.'||fcl.relname as to_table,
       array(select attname from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k)::text[] as to_columns
from pg_constraint con
join pg_class cl on cl.oid = con.conrelid join pg_namespace ns on ns.oid = cl.relnamespace
left join pg_class fcl on fcl.oid = con.confrelid left join pg_namespace fns on fns.oid = fcl.relnamespace
where con.contype in ('p','f') and ns.nspname not in ('pg_catalog','information_schema')`;

const INDEXES_SQL = `
select i.relname as name, ns.nspname||'.'||t.relname as table, ix.indisunique as unique, ix.indisprimary as primary,
       am.amname as method,
       array(select a.attname from unnest(ix.indkey) k join pg_attribute a on a.attrelid = t.oid and a.attnum = k)::text[] as columns
from pg_index ix
join pg_class i on i.oid = ix.indexrelid join pg_class t on t.oid = ix.indrelid
join pg_namespace ns on ns.oid = t.relnamespace join pg_am am on am.oid = i.relam
where ns.nspname not in ('pg_catalog','information_schema') and ns.nspname not like 'pg_toast%'`;

export interface PostgresAdapterOptions {
  connectionString: string;
  /** Max pool size. Keep small, SQLsage is an analyst, not an app. */
  max?: number;
}

export class PostgresAdapter implements DatabaseAdapter {
  readonly engine = "postgres" as const;
  private pool: pg.Pool;

  constructor(opts: PostgresAdapterOptions) {
    this.pool = new pg.Pool({ connectionString: opts.connectionString, max: opts.max ?? 3 });
  }

  async introspect(): Promise<SchemaSnapshot> {
    const [db, tables, columns, constraints, indexes] = await Promise.all([
      this.pool.query<{ db: string }>("select current_database() as db"),
      this.pool.query(TABLES_SQL),
      this.pool.query(COLUMNS_SQL),
      this.pool.query(CONSTRAINTS_SQL),
      this.pool.query(INDEXES_SQL),
    ]);
    const pks = new Map<string, string[]>();
    for (const c of constraints.rows) if (c.type === "p") pks.set(c.from_table, c.from_columns);

    return {
      engine: "postgres",
      database: db.rows[0].db,
      capturedAt: new Date().toISOString(),
      tables: tables.rows.map((t) => {
        const id = `${t.schema}.${t.name}`;
        const pk = pks.get(id) ?? [];
        return {
          id, schema: t.schema, name: t.name, primaryKey: pk, comment: t.comment,
          estimatedRows: t.estimated_rows < 0 ? null : Number(t.estimated_rows),
          sizeBytes: t.size_bytes == null ? null : Number(t.size_bytes),
          columns: columns.rows
            .filter((c) => c.schema === t.schema && c.table === t.name)
            .map((c) => ({
              name: c.name, dataType: c.data_type, nullable: c.nullable,
              defaultValue: c.column_default, isPrimaryKey: pk.includes(c.name), comment: c.comment,
            })),
        };
      }),
      foreignKeys: constraints.rows.filter((c) => c.type === "f").map((c) => ({
        name: c.name, fromTable: c.from_table, fromColumns: c.from_columns, toTable: c.to_table, toColumns: c.to_columns,
      })),
      indexes: indexes.rows.map((i) => ({
        name: i.name, table: i.table, columns: i.columns, unique: i.unique, primary: i.primary, method: i.method,
      })),
    };
  }

  async query(sql: string, g: Guardrails): Promise<QueryResult> {
    const client = await this.pool.connect();
    const started = performance.now();
    try {
      await client.query("begin transaction read only");
      await client.query(`set local statement_timeout = ${Math.floor(g.statementTimeoutMs)}`);
      const res = await client.query(`select * from (${sql.replace(/;\s*$/, "")}) as sqlsage_q limit ${g.rowLimit + 1}`);
      const truncated = res.rows.length > g.rowLimit;
      const rows = truncated ? res.rows.slice(0, g.rowLimit) : res.rows;
      return {
        sql, rows, truncated, rowCount: rows.length,
        columns: res.fields.map((f) => f.name),
        durationMs: Math.round(performance.now() - started),
      };
    } finally {
      await client.query("rollback").catch(() => {});
      client.release();
    }
  }

  async explain(sql: string): Promise<unknown> {
    const client = await this.pool.connect();
    try {
      await client.query("begin transaction read only");
      const res = await client.query(`explain (format json) ${sql}`);
      return res.rows[0]["QUERY PLAN"];
    } finally {
      await client.query("rollback").catch(() => {});
      client.release();
    }
  }

  close() {
    return this.pool.end();
  }
}
