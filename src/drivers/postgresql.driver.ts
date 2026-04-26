import type { DatabaseDriverResult, IDatabaseDriver } from "../core/db.js";
import type { ClientConfig } from "pg";
import { Client } from "pg";

// PostgreSQL implementation of IDatabaseDriver.
// Uses the "pg" (node-postgres) library for async query execution.
// Placeholder style: numbered "$1, $2, $3 ..." — each placeholder maps to the
// corresponding index in the params array.
export class PostgreSqlDriver implements IDatabaseDriver {
  private client: Client | null = null;
  private connectionConfig: string | ClientConfig;

  /**
   * @param connectionConfig - Either a connection string (e.g. "postgresql://user:pass@host/db")
   *                           or a structured ClientConfig object.
   */
  constructor(connectionConfig: string | ClientConfig) {
    this.connectionConfig = connectionConfig;
  }

  /**
   * Creates a pg Client, connects to the database, and verifies with a ping query.
   * Skips if a client is already connected.
   */
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

  /** Ends the pg client connection and resets it to null. */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.end();
    this.client = null;
  }

  /**
   * Executes a parameterized SQL query and normalises the result into DatabaseDriverResult.
   * PostgreSQL returns all results (SELECT and DML) in the same result shape,
   * so we always read result.rows and result.rowCount.
   * insertedId is extracted from result.rows[0].id — populated when the query uses RETURNING id/RETURNING *.
   */
  async execute(
    query: string,
    params?: unknown[],
  ): Promise<DatabaseDriverResult> {
    if (!this.client) {
      throw new Error("Not connected to the database");
    }

    const result = await this.client.query(query, params);

    // Try to extract the inserted row's id from the first returned row.
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

  /**
   * Wraps an identifier in double-quote style to prevent SQL injection and handle reserved words.
   */
  escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '"')}\``;
  }

  /** PostgreSQL uses "$" as the numbered placeholder prefix. */
  getPlaceholderPrefix(): string {
    return "$";
  }

  /**
   * Returns a numbered placeholder string for a given 1-based index.
   * e.g. index 1 → "$1", index 3 → "$3"
   */
  getNumberedPlaceholder(index: number): string {
    return `${this.getPlaceholderPrefix()}${index}`;
  }

  /**
   * Builds a parameterized INSERT query with RETURNING id so the new row's id
   * is available in the result without a separate SELECT.
   * e.g. INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id
   */
  getInsertQuery(tableName: string, columns: string[]): string {
    const placeholders = columns
      .map((_, i) => this.getNumberedPlaceholder(i + 1))
      .join(", ");
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`;
  }

  /**
   * Builds a PostgreSQL upsert using ON CONFLICT ... DO UPDATE SET.
   * @param conflictColumns - Define which columns trigger the conflict check (usually ["id"]).
   *
   * Non-conflict columns are updated using EXCLUDED.<column> (the value that was attempted to be inserted).
   * RETURNING * ensures the full updated/inserted row is returned so BaseEntity can hydrate directly.
   */
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

  /**
   * Builds a parameterized UPDATE query.
   * SET clause uses $1, $2 ... for each column.
   * WHERE clause continues the numbering from where SET left off.
   * Params must be passed in order: [...setValues, ...conditionValues].
   */
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

  /**
   * Builds a DELETE query with an optional WHERE clause.
   * PostgreSQL does not support LIMIT directly on DELETE.
   * When limit/offset are needed, uses a subquery on ctid (PostgreSQL's internal row identifier)
   * to scope the deletion to a specific page of rows.
   */
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

    // Use a subquery with ctid to simulate LIMIT/OFFSET on DELETE.
    const scopedSelect = [`SELECT ctid FROM ${tableName}${whereClause}`];
    if (limit !== undefined) {
      scopedSelect.push(`LIMIT ${limit}`);
    }
    if (offset !== undefined) {
      scopedSelect.push(`OFFSET ${offset}`);
    }

    return `DELETE FROM ${tableName} WHERE ctid IN (${scopedSelect.join(" ")})`;
  }

  /**
   * Builds a SELECT query with optional WHERE clause and LIMIT/OFFSET pagination.
   * PostgreSQL supports LIMIT and OFFSET independently (no workaround needed).
   */
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

  /**
   * Builds a COUNT(*) query with an optional WHERE clause.
   * ::int casts the bigint COUNT result to a regular integer so it can be read as a JS number.
   */
  getCountQuery(
    tableName: string,
    conditions?: Record<string, unknown>,
  ): string {
    return `SELECT COUNT(*)::int AS count FROM ${tableName}${this.getWhereClause(conditions)}`;
  }

  /**
   * Builds a WHERE clause string from a conditions object.
   * Values are inlined (not parameterized) using serializeValue() — used for WHERE clauses
   * in SELECT/DELETE/COUNT where the driver doesn't pass a separate params array.
   */
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

  /**
   * Converts a JS value to its SQL literal representation for safe inline embedding.
   * PostgreSQL uses TRUE/FALSE for booleans and ISO 8601 strings for Dates.
   */
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
      // PostgreSQL accepts ISO 8601 datetime strings directly.
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
