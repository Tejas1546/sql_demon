import {
  TABLE_METADATA_KEY,
  COLUMNS_METADATA_KEY,
  type ColumnMetaData,
} from "./table.decorator.js";

export interface IBaseEntity<ID_TYPE> {
  id: ID_TYPE | undefined;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

export abstract class BaseEntity<ID_TYPE> implements IBaseEntity<ID_TYPE> {
  id: ID_TYPE | undefined;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;

  constructor(entity: IBaseEntity<ID_TYPE>) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.createdBy = entity.createdBy;
    this.updatedAt = entity.updatedAt;
    this.updatedBy = entity.updatedBy;
  }

  static getTableName(): string {
    return Reflect.getMetadata(TABLE_METADATA_KEY, this);
  }

  async save(): Promise<void> {
    // 1. Fetch the secret dictionary of columns from the decorator
    const columnsMetadata: ColumnMetaData[] =
      Reflect.getMetadata(COLUMNS_METADATA_KEY, this) || [];

    if (columnsMetadata.length === 0) {
      throw new Error(
        `No @Column decorators found on ${this.constructor.name}`,
      );
    }

    const activeColumns = columnsMetadata.filter(
      (meta) => (this as any)[meta.propertyName] !== undefined,
    );

    if (activeColumns.length === 0) {
      throw new Error("No data provided to save");
    }

    const dbColumns = activeColumns.map((meta) => meta.columnName);
    const values = activeColumns.map(
      (meta) => (this as any)[meta.propertyName],
    );

    const columnsString = dbColumns.join(", ");
    const placeholders = dbColumns.map(() => "?").join(", ");

    const updateColumns = dbColumns.filter((col) => col !== "id");

    const setClause =
      updateColumns.length > 0
        ? updateColumns.map((col) => `${col}=VALUES(${col})`).join(", ")
        : "id=id";

    const tableName = (this.constructor as typeof BaseEntity).getTableName();

    const query = `INSERT INTO ${tableName} (${columnsString}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${setClause}`;

    console.log("Generated Query:", query);
    console.log("Values to Bind:", values);

    // await db.execute(query, values);
  }

  static async findById<T extends BaseEntity<any>, I extends IBaseEntity<any>>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<T[]> {
    const query = `SELECT * FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} WHERE id=?`;
    console.log(query);

    // const result = await db.execute(query, [id]);
    // return result.length > 0 ? new this(result[0]) : null;
    return [];
  }

  static async findAll<T extends BaseEntity<any>, I extends IBaseEntity<any>>(
    this: new (entity: I) => T,
    options?: { condition?: Partial<I>; limit?: number; offset?: number },
  ): Promise<T[]> {
    let query = `SELECT * FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}`;
    const values: any[] = [];

    if (options?.condition) {
      const keys = Object.keys(options.condition);
      if (keys.length > 0) {
        const whereClause = keys.map((key) => `${key}=?`).join(" AND ");
        query += ` WHERE ${whereClause}`;
        values.push(...Object.values(options.condition));
      }
    }

    if (options?.limit !== undefined) {
      query += ` LIMIT ?`;
      values.push(options.limit);
      if (options?.offset !== undefined) {
        query += ` OFFSET ?`;
        values.push(options.offset);
      }
    }

    console.log(query);

    // const result = await db.execute(query, values);
    // return result.map((item: any) => new this(item));
    return [];
  }

  static async findOne<T extends BaseEntity<any>, I extends IBaseEntity<any>>(
    this: new (entity: I) => T,
    condition: Partial<I>,
  ): Promise<T | null> {
    const keys = Object.keys(condition);
    const whereClause = keys.map((key) => `${key}=?`).join(" AND ");
    const query = `SELECT * FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} WHERE ${whereClause} LIMIT 1`;
    console.log(query);

    // const values = Object.values(condition);
    // const result = await db.execute(query, values);
    // return result.length > 0 ? new this(result[0]) : null;
    return null;
  }

  static async delete<T extends BaseEntity<any>, I extends IBaseEntity<any>>(
    this: new (entity: I) => T,
    options?: { condition?: Partial<I>; limit?: number },
  ): Promise<number> {
    let query = `DELETE FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}`;
    const values: any[] = [];

    if (options?.condition) {
      const keys = Object.keys(options.condition);
      if (keys.length > 0) {
        const whereClause = keys.map((key) => `${key}=?`).join(" AND ");
        query += ` WHERE ${whereClause}`;
        values.push(...Object.values(options.condition));
      }
    }

    if (options?.limit !== undefined) {
      query += ` LIMIT ?`;
      values.push(options.limit);
    }

    console.log(query);

    // const [result] = await db.execute(query, values);
    // return result.affectedRows;
    return 0;
  }

  static async update<T extends BaseEntity<any>, I extends IBaseEntity<any>>(
    this: new (entity: I) => T,
    data: Partial<I>,
    options?: { condition?: Partial<I>; limit?: number },
  ): Promise<number> {
    const setKeys = Object.keys(data);
    if (setKeys.length === 0) return 0;

    let query = `UPDATE ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} SET `;
    const setClause = setKeys.map((key) => `${key}=?`).join(", ");
    query += setClause;

    const values: any[] = [...Object.values(data)];

    if (options?.condition) {
      const conditionKeys = Object.keys(options.condition);
      if (conditionKeys.length > 0) {
        const whereClause = conditionKeys.map((key) => `${key}=?`).join(" AND ");
        query += ` WHERE ${whereClause}`;
        values.push(...Object.values(options.condition));
      }
    }

    if (options?.limit !== undefined) {
      query += ` LIMIT ?`;
      values.push(options.limit);
    }

    console.log(query);

    // const [result] = await db.execute(query, values);
    // return result.affectedRows;
    return 0;
  }

  static async count<T extends BaseEntity<any>, I extends IBaseEntity<any>>(
    this: new (entity: I) => T,
    condition?: Partial<I>,
  ): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}`;
    const values: any[] = [];

    if (condition) {
      const conditionKeys = Object.keys(condition);
      if (conditionKeys.length > 0) {
        const whereClause = conditionKeys
          .map((key) => `${key}=?`)
          .join(" AND ");
        query += ` WHERE ${whereClause}`;
        values.push(...Object.values(condition));
      }
    }
    console.log(query);

    // const [result] = await db.execute(query, values);
    // return result.length > 0 ? result[0].count : 0;
    return 0;
  }
}
