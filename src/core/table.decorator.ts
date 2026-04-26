import "reflect-metadata";
import type { BaseEntity } from "./base.entity.js";

// Metadata key used to store the table name on an entity class constructor.
// Stored via Reflect.defineMetadata and read back by BaseEntity's static methods.
export const TABLE_METADATA_KEY = Symbol("table");

/**
 * Returns true if the character is a consonant (not a vowel).
 * Used by pluralize() to decide whether a word ending in "y" should become "ies".
 */
function isConsonant(c: string): boolean {
  return c !== "" && !/[aeiou]/i.test(c);
}

/**
 * Produces a simple English plural of a word.
 * Handles the most common cases:
 *   - "y" after a consonant → "ies"  (e.g. "category" → "categories")
 *   - ends in s/x/z/ch/sh  → "es"   (e.g. "class" → "classes")
 *   - everything else       → "s"    (e.g. "user" → "users")
 */
function pluralize(word: string): string {
  const w = word.toLowerCase();
  if (w.length === 0) {
    return w;
  }
  const last = w[w.length - 1]!;
  const secondLast = w.length >= 2 ? w[w.length - 2]! : "";

  if (last === "y" && isConsonant(secondLast)) {
    return `${w.slice(0, -1)}ies`;
  }
  if (
    last === "s" ||
    last === "x" ||
    last === "z" ||
    w.endsWith("ch") ||
    w.endsWith("sh")
  ) {
    return `${w}es`;
  }
  return `${w}s`;
}

/**
 * Derives a default table name from the class name.
 * Lowercases the first letter then pluralises the result.
 * e.g. "User" → "users", "Employee" → "employees"
 */
function defaultTableNameFromClass(ctor: Function): string {
  const raw = ctor.name;
  if (!raw) {
    throw new Error("Unable to determine table name from class name");
  }
  const stem = raw.charAt(0).toLowerCase() + raw.slice(1);
  return pluralize(stem);
}

/**
 * Class decorator that registers the SQL table name for an entity.
 *
 * Usage:
 *   @Table('users')    → explicitly sets the table name to "users"
 *   @Table()           → derives the table name from the class name (e.g. User → "users")
 *
 * Stores the name in Reflect metadata so BaseEntity's static methods can retrieve it
 * via Reflect.getMetadata(TABLE_METADATA_KEY, this).
 */
export function Table<TARGET extends typeof BaseEntity>(tableName?: string) {
  return function (target: TARGET) {
    const name = tableName ?? defaultTableNameFromClass(target);
    Reflect.defineMetadata(TABLE_METADATA_KEY, name, target);
  };
}
