import "reflect-metadata";

// Metadata key used to store column options on a class property.
// Stored via Reflect.defineMetadata and read back by getColumnSqlName().
export const COLUMN_METADATA_KEY = Symbol("column");

// Options accepted by the @Column decorator.
export interface ColumnOptions {
    /** Overrides the default column name (property name) with a custom SQL column name.
     *  e.g. @Column({ name: "created_at" }) maps the TS property to the "created_at" DB column. */
    name?: string;
}

/**
 * Accepts either a plain string (treated as the column name) or a full ColumnOptions object.
 * Normalises both forms into a consistent ColumnOptions shape.
 */
function normalizeOptions(options?: string | ColumnOptions): ColumnOptions {
    if (options === undefined) {
        return {};
    }
    if (typeof options === "string") {
        return { name: options };
    }
    return options;
}

/**
 * Property decorator that marks a class field as a database column.
 *
 * Usage:
 *   @Column()                    → column name defaults to the property name
 *   @Column({ name: "my_col" })  → column name is explicitly "my_col"
 *   @Column("my_col")            → shorthand string form
 *
 * Stores the resolved options in Reflect metadata so BaseEntity can read them at runtime.
 */
export function Column(options?: string | ColumnOptions) {
    const resolved = normalizeOptions(options);
    return function (target: object, propertyKey: string | symbol): void {
        Reflect.defineMetadata(COLUMN_METADATA_KEY, resolved, target, propertyKey);
    };
}

/**
 * Reads the @Column metadata for a given property on a prototype and returns
 * the resolved DB column name alongside the original property name.
 *
 * Returns an empty dbColumnName if the property has no @Column decorator.
 * Used by BaseEntity to map camelCase property names to snake_case DB column names.
 */
export function getColumnSqlName(prototype: object, propertyKey: string): { dbColumnName: string, propertyName: string } {
    const meta = Reflect.getMetadata(COLUMN_METADATA_KEY, prototype, propertyKey) as
        | ColumnOptions
        | undefined;

    // If no metadata exists the property is not a mapped column — return empty string.
    // If metadata exists but has no name, fall back to the property key itself.
    return { dbColumnName: meta ? meta.name ?? propertyKey : '', propertyName: propertyKey };
}
