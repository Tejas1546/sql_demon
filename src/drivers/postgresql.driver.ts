import type { DatabaseDriverResult, IDatabaseDriver } from "../core/db.js";
import type { ClientConfig } from "pg";
import { Client } from "pg";

export class PostgreSqlDriver implements IDatabaseDriver {
  private client: Client | null = null;
  private connectionConfig: string | ClientConfig;

  constructor(connectionConfig: string | ClientConfig) {
    this.connectionConfig = connectionConfig;
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client =
      typeof this.connectionConfig === "string"
        ? new Client({ connectionString: this.connectionConfig })
        : new Client(this.connectionConfig);

    await this.client.connect();
    await this.client.query("SELECT 1");
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.end();
    this.client = null;
  }

  async execute(
    query: string,
    params?: unknown[],
  ): Promise<DatabaseDriverResult> {
    if (!this.client) {
      throw new Error("Not connected to the database");
    }

    const result = await this.client.query(query, params);
    const rowId = result.rows[0]?.id;
    const insertedId =
      typeof rowId === "number"
        ? rowId
        : typeof rowId === "string" &&
            rowId.trim() !== "" &&
            !Number.isNaN(Number(rowId))
          ? Number(rowId)
          : undefined;
    return {
      rows: result.rows as Record<string, unknown>[],
      affectedRows: result.rowCount ?? 0,
      ...(insertedId !== undefined ? { insertedId } : {}),
    };
  }

  getPlaceholderPrefix(): string {
    return "$";
  }
  getNumberedPlaceholder(index: number): string {
    return `${this.getPlaceholderPrefix()}${index}`;
  }

  getInsertQuery(tableName: string, columns: string[]): string {
    const placeholders = columns
      .map((_, i) => this.getNumberedPlaceholder(i + 1))
      .join(", ");
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`;
  }

  getUpsertQuery(
    tableName: string,
    columns: string[],
    conflictColumns: string[],
  ): string {
    const placeholders = columns
      .map((_, index) => this.getNumberedPlaceholder(index + 1))
      .join(", ");
    const updateColumns = columns.filter(
      (column) => !conflictColumns.includes(column),
    );
    const conflictClause = conflictColumns.join(", ");
    const updateClause =
      updateColumns.length > 0
        ? `DO UPDATE SET ${updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(", ")}`
        : "DO NOTHING";
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (${conflictClause}) ${updateClause} RETURNING *`;
  }

  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: Record<string, unknown>,
  ): string {
    const setClause = columns
      .map(
        (column, index) =>
          `${column} = ${this.getNumberedPlaceholder(index + 1)}`,
      )
      .join(", ");
    const conditionKeys = Object.keys(conditions);
    const whereClause =
      conditionKeys.length > 0
        ? ` WHERE ${conditionKeys.map((column, index) => `${column} = ${this.getNumberedPlaceholder(columns.length + index + 1)}`).join(" AND ")}`
        : "";

    return `UPDATE ${tableName} SET ${setClause}${whereClause}`;
  }

  getDeleteQuery(
    tableName: string,
    conditions: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    const whereClause = this.getWhereClause(conditions);

    if (limit === undefined && offset === undefined) {
      return `DELETE FROM ${tableName}${whereClause}`;
    }

    const scopedSelect = [`SELECT ctid FROM ${tableName}${whereClause}`];
    if (limit !== undefined) {
      scopedSelect.push(`LIMIT ${limit}`);
    }
    if (offset !== undefined) {
      scopedSelect.push(`OFFSET ${offset}`);
    }

    return `DELETE FROM ${tableName} WHERE ctid IN (${scopedSelect.join(" ")})`;
  }
  getSelectQuery(
    tableName: string,
    columns: string[],
    conditions?: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    const whereClause = this.getWhereClause(conditions);
    const query = [
      `SELECT ${columns.join(", ")} FROM ${tableName}${whereClause}`,
    ];

    if (limit !== undefined) {
      query.push(`LIMIT ${limit}`);
    }
    if (offset !== undefined) {
      query.push(`OFFSET ${offset}`);
    }

    return query.join(" ");
  }
  getCountQuery(
    tableName: string,
    conditions?: Record<string, unknown>,
  ): string {
    return `SELECT COUNT(*)::int AS count FROM ${tableName}${this.getWhereClause(conditions)}`;
  }

  private getWhereClause(conditions?: Record<string, unknown>): string {
    if (!conditions || Object.keys(conditions).length === 0) {
      return "";
    }

    const entries = Object.entries(conditions);
    const predicates = entries.map(
      ([column, value]) => `${column} = ${this.serializeValue(value)}`,
    );
    return ` WHERE ${predicates.join(" AND ")}`;
  }

  private serializeValue(value: unknown): string {
    if (value === null) {
      return "NULL";
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid numeric value: ${value}`);
      }
      return value.toString();
    }

    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    return `'${serialized.replace(/'/g, "''")}'`;
  }
}
