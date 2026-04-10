import "reflect-metadata";
import { BaseEntitiy } from "./base.entitiy.js";

export const TABLE_METADATA_KEY = Symbol("table");

export function Table<T extends typeof BaseEntitiy>(tableName: string) {
  return function (target: T) {
    Reflect.defineMetadata(TABLE_METADATA_KEY, tableName, target);
  };
}
