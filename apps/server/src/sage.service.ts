import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { SQLsage, type EgressPolicy } from "@sqlsage/sdk";

@Injectable()
export class SageService implements OnModuleDestroy {
  readonly sage: SQLsage;

  constructor() {
    const url = process.env.SQLSAGE_DATABASE_URL;
    if (!url) throw new Error("SQLSAGE_DATABASE_URL is required");
    this.sage = new SQLsage({
      database: url,
      provider: SQLsage.providerFromEnv(),
      guardrails: {
        egress: (process.env.SQLSAGE_EGRESS as EgressPolicy) ?? "schema",
        statementTimeoutMs: Number(process.env.SQLSAGE_STATEMENT_TIMEOUT_MS ?? 5000),
        rowLimit: Number(process.env.SQLSAGE_ROW_LIMIT ?? 500),
      },
    });
  }

  onModuleDestroy() {
    return this.sage.close();
  }
}
