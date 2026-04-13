export interface IDatabaseDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(query: string, params?: any[]): Promise<any>;

  getPlaceholderPrefix(): string;
  getINsertQuery(tableName: string, columns: string[]): string;
  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: string[],
  ): string;
  getDeleteQuery(
    tableName: string,
    columns: string[],
    conditions: string[],
    limit?: number,
    offset?: number,
  ): string;
  getSelectQuery(
    tableName: string,
    columns: string[],
    conditions: string[],
    limit?: number,
    offset?: number,
  ): string;
}
