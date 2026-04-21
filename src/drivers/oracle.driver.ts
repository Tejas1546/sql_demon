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
  }
}
