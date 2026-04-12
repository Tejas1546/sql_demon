import { TABLE_METADATA_KEY } from "./table.decorator.js";
export interface IBaseEntity {
  id: number;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

export abstract class BaseEntity implements IBaseEntity {
  id: number;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;

  constructor(entity: IBaseEntity) {
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
    const entries = Object.entries(this).filter(([key, value]) => value !== undefined);
    const keys = entries.map(([key]) => key);
    const columns = keys.join(", ");
    const placeholder = "?, ".repeat(keys.length).slice(0, -2);
    
    const updateKeys = keys.filter(key => key !== 'id');
    const setClause = updateKeys.map((key) => `${key}=VALUES(${key})`).join(", ");
    
    const query = `INSERT INTO ${(this.constructor as typeof BaseEntity).getTableName()} (${columns}) VALUES (${placeholder}) ON DUPLICATE KEY UPDATE ${setClause}`;
    console.log(query);
    
    // const values = entries.map(([, value]) => value);
    // await db.execute(query, values);
  }

  static async findById<T extends IBaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<T | null> {
    const query = `SELECT * FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} WHERE id=?`;
    console.log(query);
    
    // const result = await db.execute(query, [id]);
    // return result.length > 0 ? new this(result[0]) : null;
    return null;
  }

  static async findAll<T extends IBaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    options?: { condition?: Partial<I>; limit?: number; offset?: number }
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

  static async findOne<T extends BaseEntity, I extends IBaseEntity>(
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

  static async deleteById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<number> {
    const query = `DELETE FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} WHERE id=?`;
    console.log(query);
    
    // const [result] = await db.execute(query, [id]);
    // return result.affectedRows;
    return 0;
  }

  static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
  ): Promise<number> {
    const query = `DELETE FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}`;
    console.log(query);
    
    // const [result] = await db.execute(query);
    // return result.affectedRows;
    return 0;
  }

  static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Partial<I>,
  ): Promise<number> {
    const keys = Object.keys(conditions);
    const whereClause = keys.map((key) => `${key}=?`).join(" AND ");
    const query = `DELETE FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}${whereClause ? ` WHERE ${whereClause}` : ""} LIMIT 1`;
    console.log(query);
    
    // const values = Object.values(conditions);
    // const [result] = await db.execute(query, values);
    // return result.affectedRows;
    return 0;
  }

  static async updateOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    condition: Partial<I>,
    data: Partial<I>,
  ): Promise<T | null> {
    const setKeys = Object.keys(data);
    const conditionKeys = Object.keys(condition);

    if (setKeys.length === 0) return null;

    const setClause = setKeys.map((key) => `${key}=?`).join(", ");
    const whereClause = conditionKeys.map((key) => `${key}=?`).join(" AND ");

    const query = `UPDATE ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} SET ${setClause}${whereClause ? ` WHERE ${whereClause}` : ""} LIMIT 1`;
    console.log(query);
    
    // const values = [...Object.values(data), ...(whereClause ? Object.values(condition) : [])];
    // await db.execute(query, values);
    // return this.findOne(condition);
    return null;
  }

  static async updateAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    condition: Partial<I>,
    data: Partial<I>,
  ): Promise<number> {
    const setKeys = Object.keys(data);
    const conditionKeys = Object.keys(condition);

    if (setKeys.length === 0) return 0;

    const setClause = setKeys.map((key) => `${key}=?`).join(", ");
    const whereClause = conditionKeys.map((key) => `${key}=?`).join(" AND ");

    const query = `UPDATE ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} SET ${setClause}${whereClause ? ` WHERE ${whereClause}` : ""}`;
    console.log(query);
    
    // const values = [...Object.values(data), ...(whereClause ? Object.values(condition) : [])];
    // const [result] = await db.execute(query, values);
    // return result.affectedRows;
    return 0;
  }

  static async count<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    condition?: Partial<I>,
  ): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}`;
    const values: any[] = [];
    
    if (condition) {
      const conditionKeys = Object.keys(condition);
      if (conditionKeys.length > 0) {
        const whereClause = conditionKeys.map((key) => `${key}=?`).join(" AND ");
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
