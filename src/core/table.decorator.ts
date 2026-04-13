import "reflect-metadata";
import { BaseEntity } from "./base.entity.js";

export const TABLE_METADATA_KEY = Symbol("table");
export const COLUMNS_METADATA_KEY = Symbol("columns");

export interface ColumnMetaData {
  propertyName: string;
  columnName: string;
}

export function Table<ID_TYPE, T extends typeof BaseEntity<ID_TYPE>>(
  tableName: string,
) {
  return function (target: T) {
    Reflect.defineMetadata(TABLE_METADATA_KEY, tableName, target);
  };
}

export function Column(nameDB?: string) {
  return function (target: Object, propertykey: string) {
    const existingColumns: ColumnMetaData[] =
      Reflect.getMetadata(COLUMNS_METADATA_KEY, target) || [];
    existingColumns.push({
      propertyName: propertykey,
      columnName: nameDB || propertykey,
    });
    Reflect.defineMetadata(COLUMNS_METADATA_KEY, existingColumns, target);
  };
}
