import type { DatabaseDriverResult, IDatabaseDriver } from "../core/db.js";
import OracleDB from "oracledb";
import type { Connection, ConnectionAttributes } from "oracledb";

export class OracleSqlDriver implements IDatabaseDriver {
  private connection: Connection | null = null;
  private connectionConfig: ConnectionAttributes;

  constructor(config: ConnectionAttributes) {
    this.connectionConfig = config;
  }

  async connect(): Promise<void> {
    if (this.connection) return;
    this.connection = await OracleDB.getConnection(this.connectionConfig);
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    await this.connection.close();
    this.connection = null;
  }

  async execute(query: string, params: unknown[]=[]): Promise<DatabaseDriverResult> {
    if(!this.connection){
      throw new Error("Not Connected to db")
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

  getPlaceholderPrefix(): string {
    throw new Error("not implemented");
  }

  getInsertQuery(tableName: string, columns: string[]): string {
    throw new Error("not implemented")
  }

  getUpsertQuery(tableName: string, columns: string[], conflictColumns: string[]): string {
    throw new Error("not implemented")
  }

  getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string {
    throw new Error("not implemented")
  }

  getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, offset?: number): string {
    throw new Error("not implemented")
  }

  getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string {
    throw new Error("not implemented")
  }

  getCountQuery(tableName: string, conditions?: Record<string, unknown>): string {
    throw new Error("not implemented")
  }
}
