// Shared result shape returned by every driver's execute() method.
// BaseEntity uses this to extract inserted IDs, affected row counts, and returned rows.
export interface DatabaseDriverResult {
    rows: Record<string, unknown>[];      // Rows returned by SELECT or RETURNING clauses
    affectedRows: number;                 // Number of rows affected by INSERT/UPDATE/DELETE
    insertedId?: number;                  // The auto-generated ID of a newly inserted row (if available)
}

// Contract that every database driver must implement.
// BaseEntity only ever talks to this interface — it never imports a concrete driver directly.
// This is what allows swapping MySQL, PostgreSQL, or Oracle without touching any entity code.
export interface IDatabaseDriver {
    /** Opens a connection to the database. */
    connect(): Promise<void>;

    /** Closes the active database connection. */
    disconnect(): Promise<void>;

    /** Sends a SQL string + bound parameters to the database and returns a normalised result. */
    execute(query: string, params?: unknown[]): Promise<DatabaseDriverResult>;

    /** Returns the placeholder prefix character used by this dialect (e.g. "?" for MySQL, "$" for PG, ":" for Oracle). */
    getPlaceholderPrefix(): string;

    /** Builds a dialect-specific INSERT query string for the given table and columns. */
    getInsertQuery(tableName: string, columns: string[]): string;

    /**
     * Builds a dialect-specific upsert query (INSERT ... ON CONFLICT / ON DUPLICATE KEY / MERGE).
     * @param conflictColumns - Columns used to detect a duplicate (usually ["id"]).
     */
    getUpsertQuery(tableName: string, columns: string[], conflictColumns: string[]): string;

    /**
     * Builds an UPDATE query.
     * @param conditions - Become the WHERE clause.
     */
    getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string;

    /** Builds a DELETE query with an optional WHERE clause and pagination. */
    getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, offset?: number): string;

    /** Builds a SELECT query with optional filtering and pagination. */
    getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string;

    /** Builds a COUNT(*) query with an optional WHERE clause. */
    getCountQuery(tableName: string, conditions?: Record<string, unknown>): string;
}

// Global singleton that holds the active database driver.
// Call DB.setDriver() once at application startup (e.g. in index.ts),
// then use DB.driver anywhere in the codebase to reach the database.
export class DB {
    private static instance: IDatabaseDriver;

    /**
     * Registers the driver to use for all database operations.
     * Must be called before any entity methods are invoked.
     */
    static setDriver(driver: IDatabaseDriver) {
        this.instance = driver;
    }

    /** Returns the registered driver. Throws if setDriver() was never called. */
    static get driver(): IDatabaseDriver {
        if (!this.instance) {
            throw new Error("Database driver not set");
        }
        return this.instance;
    }
}
