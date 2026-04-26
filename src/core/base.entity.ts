import { DB } from "./db.js";
import { Column, getColumnSqlName } from "./column.decorator.js";
import { TABLE_METADATA_KEY } from "./table.decorator.js";

// Minimum set of fields every entity must have.
// Concrete entity interfaces (IUser, IEmployee, etc.) extend this.
export interface IBaseEntity {
  id?: number | undefined;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

// Abstract base class that all entity classes extend.
// Provides all CRUD operations (save, findAll, findOne, findById, deleteAll, count, updateAll, etc.)
// by reading @Column and @Table decorator metadata at runtime to build SQL queries
// and delegating execution to whichever driver is registered in DB.
export abstract class BaseEntity implements IBaseEntity {
  @Column()
  id?: number | undefined;

  // These properties use explicit column name overrides because the DB columns
  // use snake_case while the TS properties use camelCase.
  @Column({ name: "created_at" })
  createdAt: Date;
  @Column({ name: "created_by" })
  createdBy: number;
  @Column({ name: "updated_at" })
  updatedAt: Date;
  @Column({ name: "updated_by" })
  updatedBy: number;

  constructor(entity: Partial<IBaseEntity> = {}) {
    this.id = entity.id;
    this.createdAt = entity.createdAt ?? new Date(0);
    this.createdBy = entity.createdBy ?? 0;
    this.updatedAt = entity.updatedAt ?? new Date(0);
    this.updatedBy = entity.updatedBy ?? 0;
  }

  /**
   * Persists the current entity instance to the database.
   *
   * - Reads all own properties and filters out undefined values (e.g. id before first insert).
   * - Maps camelCase property names to snake_case DB column names via @Column metadata.
   * - Calls getUpsertQuery() on the driver — inserts on first save, updates on subsequent saves.
   * - After execution, sets this.id from the returned insertedId or RETURNING clause.
   * - If the driver returns the full row (e.g. PostgreSQL RETURNING *), hydrates the instance
   *   directly. Otherwise falls back to a SELECT by id to reload the latest state.
   */
  async save(): Promise<void> {
    const ctor = this.constructor;
    const proto = Object.getPrototypeOf(this) as object;

    // Read the table name stored by the @Table decorator on the subclass constructor.
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, ctor) as string;

    // Collect all instance properties into a plain object.
    const propertyValues = Object.keys(this).reduce<Record<string, unknown>>(
      (acc, key) => {
        acc[key] = (this as any)[key];
        return acc;
      },
      {},
    );

    // Drop undefined values — we don't want to send "id = undefined" on a new insert.
    const persistableValues = Object.entries(propertyValues).reduce<
      Record<string, unknown>
    >((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    // Translate property names to DB column names using @Column metadata.
    // e.g. { createdAt: Date } → { created_at: Date }
    const mappedValues = BaseEntity.mapPropertyKeysToDbColumns(
      proto,
      persistableValues,
    );

    const columns = Object.keys(mappedValues);
    if (columns.length === 0) {
      throw new Error("Cannot save entity without any mapped columns");
    }

    const values = Object.values(mappedValues);

    // Ask the driver to build the upsert SQL string, then execute it with the values.
    const query = DB.driver.getUpsertQuery(tableName, columns, ["id"]);
    const result = await DB.driver.execute(query, values);

    // Try to resolve the inserted/updated row's id from the result.
    const resolvedId = BaseEntity.resolveNumericId(
      result.insertedId ?? result.rows[0]?.id,
    );

    if (resolvedId !== undefined) {
      this.id = resolvedId;
    }

    // If the driver returned the full row (PostgreSQL RETURNING *), hydrate directly.
    const returnedRow = result.rows[0];
    if (returnedRow) {
      this.hydrateFromRow(proto, returnedRow);
      return;
    }

    // Fallback: reload the row from the DB by id (used by drivers that don't return rows on upsert).
    await this.reloadCurrentState(tableName, proto);
  }

  /**
   * Returns all rows from the table, optionally filtered by conditions and paginated.
   * @param conditions - Keys are camelCase property names — mapped to DB column names internally.
   */
  static async findAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions?: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): Promise<T[]> {
    const dbConditions = conditions
      ? BaseEntity.mapPropertyKeysToDbColumns(this.prototype, conditions)
      : undefined;
    const query = DB.driver.getSelectQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      ["*"],
      dbConditions,
      limit,
      offset,
    );
    const result = await DB.driver.execute(query);

    // Map each raw DB row into a hydrated entity instance.
    return result.rows.map((row) => {
      const instance = new this({} as I);
      instance.hydrateFromRow(this.prototype, row);
      return instance;
    });
  }

  /** Returns the first row matching the given conditions, or null if none found. */
  static async findOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
  ): Promise<T | null> {
    const results = await (this as any).findAll(conditions);
    return results.length > 0 ? results[0] : null;
  }

  /** Convenience wrapper around findOne() that looks up a row by its primary key. */
  static async findById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<T | null> {
    return await (this as any).findOne({ id });
  }

  /**
   * Deletes all rows matching conditions, with optional pagination.
   * @returns The number of rows deleted.
   */
  static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): Promise<number> {
    const dbConditions = BaseEntity.mapPropertyKeysToDbColumns(
      this.prototype,
      conditions,
    );
    const query = DB.driver.getDeleteQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      dbConditions,
      limit,
      offset,
    );
    const result = await DB.driver.execute(query);
    return result.affectedRows;
  }

  /**
   * Deletes the first row matching conditions.
   * @returns True if a row was deleted.
   */
  static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
  ): Promise<boolean> {
    const affectedRows = await (this as any).deleteAll(conditions, 1);
    return affectedRows > 0;
  }

  /** Convenience wrapper that deletes a row by its primary key. */
  static async deleteById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<boolean> {
    return await (this as any).deleteOne({ id });
  }

  /** Returns the count of rows matching the optional conditions. */
  static async count<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions?: Record<string, unknown>,
  ): Promise<number> {
    const dbConditions = conditions
      ? BaseEntity.mapPropertyKeysToDbColumns(this.prototype, conditions)
      : undefined;
    const query = DB.driver.getCountQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      dbConditions,
    );
    const result = await DB.driver.execute(query);
    return Number(result.rows[0]?.count ?? 0);
  }

  /**
   * Updates all rows matching conditions with the given field values.
   * Both updates and conditions use camelCase property names — mapped to DB columns internally.
   * @returns The number of rows affected.
   */
  static async updateAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    updates: Record<string, unknown>,
    conditions: Record<string, unknown>,
  ): Promise<number> {
    const dbUpdates = BaseEntity.mapPropertyKeysToDbColumns(
      this.prototype,
      updates,
    );
    const dbConditions = BaseEntity.mapPropertyKeysToDbColumns(
      this.prototype,
      conditions,
    );
    const query = DB.driver.getUpdateQuery(
      Reflect.getMetadata(TABLE_METADATA_KEY, this),
      Object.keys(dbUpdates),
      dbConditions,
    );
    // params order: SET values first, then WHERE values — must match the query placeholder order.
    const params = [...Object.values(updates), ...Object.values(conditions)];
    const result = await DB.driver.execute(query, params);
    return result.affectedRows;
  }

  /**
   * Convenience wrapper that updates a single row by its primary key.
   * @returns True if the row was found and updated.
   */
  static async updateById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
    updates: Record<string, unknown>,
  ): Promise<boolean> {
    const affectedRows = await (this as any).updateAll(updates, { id });
    return affectedRows > 0;
  }

  /**
   * Translates a plain object whose keys are camelCase property names
   * into a new object whose keys are the corresponding DB column names.
   * Properties without a @Column decorator are silently dropped.
   */
  private static mapPropertyKeysToDbColumns(
    prototype: object,
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [propertyName, value] of Object.entries(values)) {
      const dbColumnName = BaseEntity.resolveDbColumnName(
        prototype,
        propertyName,
      );
      if (!dbColumnName) {
        continue;
      }
      mapped[dbColumnName] = value;
    }

    return mapped;
  }

  /**
   * Walks up the prototype chain to find the @Column metadata for a given property name.
   * This is necessary because @Column decorators can be defined on a parent class (e.g. BaseEntity)
   * and still need to be resolved when called from a subclass prototype.
   * Returns an empty string if no @Column metadata is found.
   */
  private static resolveDbColumnName(
    prototype: object,
    propertyName: string,
  ): string {
    let proto: object | null = prototype;
    while (proto !== null && proto !== Object.prototype) {
      const metadata = getColumnSqlName(proto, propertyName);
      if (metadata.dbColumnName) {
        return metadata.dbColumnName;
      }
      proto = Object.getPrototypeOf(proto) as object | null;
    }
    return "";
  }

  /**
   * Reloads the entity's current state from the DB by selecting the row with this.id.
   * Used as a fallback in save() when the driver doesn't return the full row after upsert
   * (e.g. MySQL's ON DUPLICATE KEY UPDATE doesn't return rows).
   */
  private async reloadCurrentState(
    tableName: string,
    prototype: object,
  ): Promise<void> {
    const entityId = BaseEntity.resolveNumericId(this.id);
    if (entityId === undefined) {
      throw new Error("Cannot reload entity after save without an id");
    }

    const query = DB.driver.getSelectQuery(
      tableName,
      ["*"],
      { id: entityId },
      1,
    );
    const result = await DB.driver.execute(query);
    const row = result.rows[0];
    if (!row) {
      throw new Error(`Unable to reload entity with id ${entityId} after save`);
    }

    this.hydrateFromRow(prototype, row);
  }

  /**
   * Safely converts a value to a finite number, or returns undefined if it can't.
   * Handles both numeric and string representations of IDs.
   */
  private static resolveNumericId(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
    return undefined;
  }

  /**
   * Populates this entity instance's properties from a raw DB row object.
   * Builds a reverse map of { db_column_name → propertyName } using @Column metadata,
   * then assigns each column value to the matching property.
   * Column names not found in the map fall back to being used as-is as property names.
   */
  hydrateFromRow(prototype: object, row: Record<string, unknown>): void {
    const propertyToColumn = Object.keys(this).reduce<Record<string, string>>(
      (acc, propertyName) => {
        const dbColumnName = BaseEntity.resolveDbColumnName(
          prototype,
          propertyName,
        );
        if (dbColumnName) {
          acc[dbColumnName] = propertyName;
        }
        return acc;
      },
      {},
    );

    for (const [columnName, value] of Object.entries(row)) {
      const propertyName = propertyToColumn[columnName] ?? columnName;
      if (propertyName in this) {
        (this as Record<string, unknown>)[propertyName] = value;
      }
    }
  }
}
