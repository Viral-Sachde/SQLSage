/**
 * Conservative SQL validation. The database role should already be read-only;
 * this is a second layer, not the only one.
 */
export interface GuardResult {
  ok: boolean;
  reason?: string;
}

const FORBIDDEN = /\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|vacuum|analyze|cluster|reindex|lock|listen|notify|set|reset|comment|security|refresh|prepare|execute|deallocate|discard)\b/i;
const DANGEROUS_FUNCS = /\b(pg_sleep|pg_read_file|pg_read_binary_file|pg_ls_dir|lo_import|lo_export|dblink|pg_terminate_backend|pg_cancel_backend|set_config)\s*\(/i;

function stripLiteralsAndComments(sql: string) {
  return sql
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""');
}

export function validateReadOnlySql(sql: string): GuardResult {
  const clean = stripLiteralsAndComments(sql).trim().replace(/;\s*$/, "");
  if (!clean) return { ok: false, reason: "Empty query" };
  if (clean.includes(";")) return { ok: false, reason: "Only a single statement is allowed" };
  if (!/^(select|with)\b/i.test(clean)) return { ok: false, reason: "Only SELECT or WITH queries are allowed" };
  const bad = FORBIDDEN.exec(clean);
  if (bad) return { ok: false, reason: `Keyword not allowed: ${bad[1].toUpperCase()}` };
  const fn = DANGEROUS_FUNCS.exec(clean);
  if (fn) return { ok: false, reason: `Function not allowed: ${fn[1]}` };
  if (/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/i.test(clean))
    return { ok: false, reason: "Row locking clauses are not allowed" };
  return { ok: true };
}
