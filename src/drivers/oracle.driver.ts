import type { DatabaseDriverResult, IDatabaseDriver } from "../core/db.js";
import OracleDB from "oracledb";
import type { Connection, ConnectionAttributes } from "oracledb";

// Oracle implementation of IDatabaseDriver.
// Uses the oracledb library in Thin mode (no Oracle Client installation required).
// Placeholder style: colon-prefixed numbers ":1, :2, :3 ..."
export class OracleSqlDriver implements IDatabaseDriver {
  private connection: Connection | null = null;
  private connectionConfig: ConnectionAttributes;

  /**
   * @param config - Oracle connection attributes: user, password, connectString.
   *                 e.g. { user: "orm_user", password: "pass", connectString: "localhost:1521/FREEPDB1" }
   */
  constructor(config: ConnectionAttributes) {
    this.connectionConfig = config;
  }

  /**
   * Opens a connection to Oracle using the config passed in the constructor.
   * Skips if a connection is already open.
   * Unlike MySQL/PG, Oracle uses getConnection() instead of a persistent client object.
   */
  async connect(): Promise<void> {
    if (this.connection) return;
    this.connection = await OracleDB.getConnection(this.connectionConfig);
  }

  /**
   * Closes the active Oracle connection and resets it to null.
   * Oracle requires explicit close() calls — connections are not auto-released.
   */
  async disconnect(): Promise<void> {
    if (!this.connection) return;
    await this.connection.close();
    this.connection = null;
  }

  /**
   * Executes a raw SQL query against Oracle.
   *
   * - autoCommit: true  → Oracle does not auto-commit by default, so we force it here
   *                        to match the behaviour of MySQL and PostgreSQL drivers.
   * - OUT_FORMAT_OBJECT → Returns rows as key/value objects instead of raw arrays,
   *                        so the shape matches what BaseEntity.hydrateFromRow() expects.
   */
  async execute(
    query: string,
    params: unknown[] = [],
  ): Promise<DatabaseDriverResult> {
    if (!this.connection) {
      throw new Error("Not Connected to db");
    }
    const result = await this.connection.execute(query, params, {
      outFormat: OracleDB.OUT_FORMAT_OBJECT,
      autoCommit: true,
    });

    return {
      rows: (result.rows ?? []) as Record<string, unknown>[],
      affectedRows: result.rowsAffected ?? 0,
    };
  }

  /**
   * Oracle uses colon-prefixed numbered placeholders: :1, :2, :3 ...
   * This prefix ":" is used by getNumberedPlaceholder() to build bind variable strings.
   */
  getPlaceholderPrefix(): string {
    return ":";
  }

  getNumberedPlaceholder(index: number): string {
    return `:${index}`;
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
   comment here
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
  /**
   * Builds a parameterized INSERT statement using Oracle's :1, :2 ... bind syntax.
   * Similar to PostgreSQL's $1, $2 but with colons instead of dollar signs.
   */
  getInsertQuery(tableName: string, columns: string[]): string {
    throw new Error("not implemented");
  }

  /**
   * Builds an upsert using Oracle's MERGE statement.
   * Oracle has no ON CONFLICT (PG) or ON DUPLICATE KEY (MySQL).
   * MERGE matches on conflictColumns (e.g. id), updates if matched, inserts if not.
   */
  getUpsertQuery(
    tableName: string,
    columns: string[],
    conflictColumns: string[],
  ): string {
    throw new Error("not implemented");
  }

  /**
   * Builds a parameterized UPDATE query.
   * conditions map to the WHERE clause; columns map to the SET clause.
   * Placeholder indices continue from where the SET clause left off.
   */
  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: Record<string, unknown>,
  ): string {
    throw new Error("not implemented");
  }

  /**
   * Builds a DELETE query with an optional WHERE clause.
   * Oracle does not support LIMIT on DELETE directly.
   * Pagination (limit/offset) requires a subquery using ROWNUM or FETCH syntax.
   */
  getDeleteQuery(
    tableName: string,
    conditions: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    throw new Error("not implemented");
  }

  /**
   * Builds a SELECT query with optional WHERE and pagination.
   * Oracle does not use LIMIT/OFFSET — pagination uses:
   *   OFFSET n ROWS FETCH NEXT m ROWS ONLY
   */
  getSelectQuery(
    tableName: string,
    columns: string[],
    conditions?: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    let query = `SELECT ${columns.join(", ")} FROM ${tableName}`;
  }

  /**
   * Builds a COUNT(*) query with an optional WHERE clause.
   * Used by BaseEntity.count() to return the number of matching rows.
   */
  getCountQuery(
    tableName: string,
    conditions?: Record<string, unknown>,
  ): string {
    return `SELECT COUNT(*) AS count FROM ${tableName}${this.getWhereClause(conditions)}`;
  }
}
