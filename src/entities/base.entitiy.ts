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

  //TODO
  // static async findOne<T extends BaseEntitiy, I extends IBaseEntity>(
  //   this: new (entitiy: I) => T,
  //   condition: Partial<I>,
  // ): Promise<T | null> {
  //   const query = `SELECT `; // to do
  //   const result = await db.execute(query);
  //   return result.length > 0 ? new this(result[0]) : null;
  // }

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
    const query = ``;
    console.log(query);
    return null;
  }
}
