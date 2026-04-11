import { TABLE_METADATA_KEY } from "./table.decorator.js";
export interface IBaseEntity {
  id: number;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

export abstract class BaseEntitiy implements IBaseEntity {
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
    const keys = Object.keys(this);
    const columns = keys.join(", ");
    const placeholder = "?, ".repeat(keys.length).slice(0, -2);
    const query = `INSERT INTO ${(this.constructor as typeof BaseEntitiy).getTableName()} (${columns}) VALUES (${placeholder})`;
    console.log(query);
    // await db.execute(query, Object.values(this));
  }

  static async findById<T extends IBaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<T | null> {
    const query = `SELECT * FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} WHERE id=?`;
    // const result = await db.execute(query, [id]);
    // return result.length > 0 ? new this(result[0]) : null;
    console.log(query);
    return null;
  }

  static async findAll<T extends IBaseEntity, I extends IBaseEntity>(
    this: new (entitiy: I) => T,
  ): Promise<T | null> {
    const query = `SELECT * FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}`;
    // const result = await db.execute(query);
    // return result.length > 0 ? new this(result[0]) : null;
    console.log(query);
    return null;
  }

  static async findOne<T extends BaseEntitiy, I extends IBaseEntity>(
    this: new (entitiy: I) => T,
    condition: Partial<I>,
  ): Promise<T | null> {
    const keys = Object.keys(condition);
    const whereClause = keys.map((key) => `${key}=?`).join(" AND ");
    const query = `SELECT * FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} WHERE ${whereClause} LIMIT 1`;
    // const values = Object.values(condition);
    // const result = await db.execute(query, values);
    // return result.length > 0 ? new this(result[0]) : null;
    console.log(query);
    return null;
  }

  static async deleteById<T extends BaseEntitiy, I extends IBaseEntity>(
    this: new (entitiy: I) => T,
    id: number,
  ): Promise<T | null> {
    const query = `DELETE FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} WHERE id=?`;
    //await db.execute(query, [id]);
    console.log(query);

    return null;
  }

  static async deleteAll<T extends BaseEntitiy, I extends IBaseEntity>(
    this: new (entitiy: I) => T,
  ): Promise<T | null> {
    const query = `DELETE FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}`;
    //await db.execute(query, [id]);
    console.log(query);
    return null;
  }

  static async deleteOne<T extends BaseEntitiy, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Partial<I>,
  ): Promise<T | null> {
    const keys = Object.keys(conditions);
    const whereClause = keys.map((key) => `${key}=?`).join(" AND ");
    const query = `DELETE FROM ${Reflect.getMetadata(TABLE_METADATA_KEY, this)}${whereClause ? ` WHERE ${whereClause}` : ""} LIMIT 1`;
    console.log(query);
    // const values = Object.values(conditions);
    // await db.execute(query, values);
    return null;
  }

  async update(): Promise<void> {
    const entries = Object.entries(this).filter(([key, value]) => key !== "id" && value !== undefined);
    if (entries.length === 0) return;
    const setClause = entries.map(([key]) => `${key}=?`).join(", ");
    const query = `UPDATE ${(this.constructor as typeof BaseEntitiy).getTableName()} SET ${setClause} WHERE id=?`;
    console.log(query);
    // const values = [...entries.map(([, value]) => value), this.id];
    // await db.execute(query, values);
  }

  static async update<T extends BaseEntitiy, I extends IBaseEntity>(
    this: new (entity: I) => T,
    condition: Partial<I>,
    data: Partial<I>,
  ): Promise<T | null> {
    const setKeys = Object.keys(data);
    const conditionKeys = Object.keys(condition);

    if (setKeys.length === 0) return null;

    const setClause = setKeys.map((key) => `${key}=?`).join(", ");
    const whereClause = conditionKeys.map((key) => `${key}=?`).join(" AND ");

    const query = `UPDATE ${Reflect.getMetadata(TABLE_METADATA_KEY, this)} SET ${setClause}${whereClause ? ` WHERE ${whereClause}` : ""}`;
    console.log(query);

    // const values = [...Object.values(data), ...(whereClause ? Object.values(condition) : [])];
    // await db.execute(query, values);

    return null;
  }
}
