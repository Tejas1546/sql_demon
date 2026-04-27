import type { ConnectionOptions } from "mysql2";
import type { DatabaseDriverResult, IDatabaseDriver } from "../core/db.js";
import { createConnection, Connection } from "mysql2/promise";

// MySQL implementation of IDatabaseDriver.
// Uses the mysql2/promise library for async query execution.
// Placeholder style: positional "?" — values are bound in order by the mysql2 library.
export class MySqlDriver implements IDatabaseDriver {
  private connection: Connection | null = null;
  private connectionConfig: string | ConnectionOptions;

  /**
   * @param connectionConfig - Either a connection string (e.g. "mysql://user:pass@host/db")
   *                           or a structured ConnectionOptions object.
   */
  constructor(connectionConfig: string | ConnectionOptions) {
    this.connectionConfig = connectionConfig;
  }

  /**
   * Opens a MySQL connection and verifies it with a ping query.
   * Skips if a connection is already open.
   */
  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }
    this.connection = await (typeof this.connectionConfig === "string"
      ? createConnection(this.connectionConfig)
      : createConnection(this.connectionConfig));
    await this.connection.query("SELECT 1");
  }

  /** Closes the active MySQL connection and resets it to null. */
  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }
    await this.connection.end();
    this.connection = null;
  }

  /**
   * Executes a parameterized SQL query and normalises the result into DatabaseDriverResult.
   *
   * mysql2 returns two different result shapes depending on the query type:
   *   - SELECT → Array of row objects
   *   - INSERT/UPDATE/DELETE → ResultSetHeader with affectedRows and insertId
   */
  async execute(
    query: string,
    params?: unknown[],
  ): Promise<DatabaseDriverResult> {
    if (!this.connection) {
      throw new Error("Not connected to the database");
    }
    const [results] = await this.connection.execute(query, params as any);

    // SELECT queries return an array of row objects.
    if (Array.isArray(results)) {
      return {
        rows: results as Record<string, unknown>[],
        affectedRows: 0,
      };
    }

    // INSERT/UPDATE/DELETE queries return a ResultSetHeader.
    if (results && typeof results === "object" && "affectedRows" in results) {
      const maybeInsertId =
        "insertId" in results ? results.insertId : undefined;
      // insertId is 0 for non-insert statements — treat 0 as "no inserted id".
      const insertedId =
        typeof maybeInsertId === "number" && Number.isFinite(maybeInsertId)
          ? maybeInsertId
          : undefined;
      return {
        rows: [],
        affectedRows: Number(results.affectedRows ?? 0),
        ...(insertedId !== undefined ? { insertedId } : {}),
      };
    }

    return {
      rows: [],
      affectedRows: 0,
    };
  }

  /**
   * Wraps an identifier (table or column name) in backticks to prevent SQL injection
   * and handle reserved words. Escapes any existing backticks inside the identifier.
   */
  escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, "``")}\``;
  }

  /** MySQL uses "?" as a positional placeholder — values are bound in array order. */
  getPlaceholderPrefix(): string {
    return "?";
  }

  /**
   * Returns a positional placeholder for MySQL.
   */
  getPositionalPlaceholder(_index?: number): string {
    return this.getPlaceholderPrefix();
  }

  /**
   * Builds a basic INSERT query using "?" placeholders.
   * e.g. INSERT INTO users (name, email) VALUES (?, ?)
   */
  getInsertQuery(tableName: string, columns: string[]): string {
    const placeholders = columns
      .map(() => this.getPositionalPlaceholder())
      .join(", ");
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
  }

  /**
   * Builds a MySQL upsert using ON DUPLICATE KEY UPDATE.
   * If a row with the same unique key already exists, all non-id columns are updated.
   * "id = LAST_INSERT_ID(id)" ensures the auto-increment ID is returned even on update,
   * so BaseEntity.save() can reliably read back this.id.
   */
  getUpsertQuery(
    tableName: string,
    columns: string[],
    _conflictColumns: string[],
  ): string {
    const placeholders = columns
      .map(() => this.getPositionalPlaceholder())
      .join(", ");
    const updateColumns = columns.filter((column) => column !== "id");
    const updateAssignments = updateColumns.map(
      (column) => `${column} = VALUES(${column})`,
    );
    updateAssignments.push("id = LAST_INSERT_ID(id)");
    const updateClause = updateAssignments.join(", ");
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
  }

  /**
   * Builds a parameterized UPDATE query.
   * SET clause uses "?" for each column; WHERE clause uses "?" for each condition key.
   * Params must be passed in order: [...setValues, ...conditionValues].
   */
  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: Record<string, unknown>,
  ): string {
    const setClause = columns
      .map((column) => `${column} = ${this.getPositionalPlaceholder()}`)
      .join(", ");
    const conditionKeys = Object.keys(conditions);
    const whereClause =
      conditionKeys.length > 0
        ? ` WHERE ${conditionKeys.map((column) => `${column} = ${this.getPositionalPlaceholder()}`).join(" AND ")}`
        : "";

    return `UPDATE ${tableName} SET ${setClause}${whereClause}`;
  }

  /**
   * Builds a DELETE query with an optional WHERE clause and row limit.
   * MySQL supports LIMIT directly on DELETE.
   * When both limit and offset are provided, uses MySQL's "LIMIT offset, count" syntax.
   */
  getDeleteQuery(
    tableName: string,
    conditions: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    const whereClause = this.getWhereClause(conditions);
    const query = [`DELETE FROM ${tableName}${whereClause}`];

    if (limit !== undefined && offset !== undefined) {
      query.push(`LIMIT ${offset}, ${limit}`);
    } else if (limit !== undefined) {
      query.push(`LIMIT ${limit}`);
    }

    return query.join(" ");
  }

  /**
   * Builds a SELECT query with optional WHERE clause and LIMIT/OFFSET pagination.
   * MySQL requires a LIMIT to be present before OFFSET can be used.
   * When only offset is given (no limit), uses MySQL's max bigint as a workaround.
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
    } else if (offset !== undefined) {
      // MySQL requires LIMIT before OFFSET — use max bigint to mean "no limit".
      query.push("LIMIT 18446744073709551615");
    }

    if (offset !== undefined) {
      query.push(`OFFSET ${offset}`);
    }

    return query.join(" ");
  }

  /** Builds a COUNT(*) query with an optional WHERE clause.
   * CAST to UNSIGNED ensures the result comes back as a number, not a string. */
  getCountQuery(
    tableName: string,
    conditions?: Record<string, unknown>,
  ): string {
    return `SELECT CAST(COUNT(*) AS UNSIGNED) AS count FROM ${tableName}${this.getWhereClause(conditions)}`;
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
   * MySQL uses 1/0 for booleans and a space-separated datetime format for Dates.
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
      return value ? "1" : "0";
    }

    if (value instanceof Date) {
      // MySQL datetime format: "YYYY-MM-DD HH:MM:SS"
      return `'${value.toISOString().replace("T", " ").replace("Z", "")}'`;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    return `'${serialized.replace(/'/g, "''")}'`;
  }
}
