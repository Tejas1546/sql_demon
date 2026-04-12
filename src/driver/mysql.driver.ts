import type { IDatabaseDriver } from "../core/db.js";


export class MySqlDriver implements IDatabaseDriver {

    connect(): Promise<void> {
        console.log("[SIMULATING]: Connecting to MySQL database...");
        return Promise.resolve();
    }
    disconnect(): Promise<void> {
        console.log("[SIMULATING]: Disconnecting from MySQL database...");
        return Promise.resolve();
    }
    execute(query: string, params?: any[]): Promise<any> {
        console.log("[SIMULATING]: Executing query...", query, params);
        return Promise.resolve();
    }
    getPlaceholderPrefix(): string {
        return '?';
    }
    getInsertQuery(tableName: string, columns: string[]): string {
        const placeholders = columns.map(() => this.getPlaceholderPrefix()).join(', ');
        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    }
    
    getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string {
        const setClause = columns.map((col) => `${col}=${this.getPlaceholderPrefix()}`).join(', ');
        const conditionKeys = Object.keys(conditions || {});
        const whereClause = conditionKeys.length > 0 
            ? ` WHERE ` + conditionKeys.map((key) => `${key}=${this.getPlaceholderPrefix()}`).join(' AND ') 
            : '';
        const query = `UPDATE ${tableName} SET ${setClause}${whereClause}`;
        console.log(query);
        return query;
    }

    getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, offset?: number): string {
        const conditionKeys = Object.keys(conditions || {});
        const whereClause = conditionKeys.length > 0 
            ? ` WHERE ` + conditionKeys.map((key) => `${key}=${this.getPlaceholderPrefix()}`).join(' AND ') 
            : '';
        let query = `DELETE FROM ${tableName}${whereClause}`;
        if (limit !== undefined) {
            query += ` LIMIT ${limit}`;
            if (offset !== undefined) {
                query += ` OFFSET ${offset}`;
            }
        }
        console.log(query);
        return query;
    }

    getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string {
        const selectCols = columns.length > 0 ? columns.join(', ') : '*';
        let query = `SELECT ${selectCols} FROM ${tableName}`;
        
        if (conditions) {
            const conditionKeys = Object.keys(conditions);
            if (conditionKeys.length > 0) {
                query += ` WHERE ` + conditionKeys.map((key) => `${key}=${this.getPlaceholderPrefix()}`).join(' AND ');
            }
        }

        if (limit !== undefined) {
            query += ` LIMIT ${limit}`;
            if (offset !== undefined) {
                query += ` OFFSET ${offset}`;
            }
        }
        console.log(query);
        return query;
    }

    getCountQuery(tableName: string, conditions?: Record<string, unknown>): string {
        let query = `SELECT COUNT(*) as count FROM ${tableName}`;
        if (conditions) {
            const conditionKeys = Object.keys(conditions);
            if (conditionKeys.length > 0) {
                query += ` WHERE ` + conditionKeys.map((key) => `${key}=${this.getPlaceholderPrefix()}`).join(' AND ');
            }
        }
        console.log(query);
        return query;
    }
}