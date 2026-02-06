import type { SQLiteDatabase } from "expo-sqlite";

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;

  // Performance + consistency
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  let row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let current = row?.user_version ?? 0;

  if (current >= DATABASE_VERSION) return;

  if (current === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY NOT NULL,
        currency TEXT NOT NULL,
        base_frequency TEXT NOT NULL,
        starting_balance REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS income_sources (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        rule_json TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        rule_json TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS flows (
        id INTEGER PRIMARY KEY NOT NULL,
        flow_type TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency TEXT NOT NULL,
        rule_json TEXT NOT NULL,
        goal_target REAL,
        enabled INTEGER NOT NULL DEFAULT 1
      );
    `);

    // single row settings
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (id, currency, base_frequency, starting_balance)
       VALUES (1, ?, ?, ?);`,
      "EUR",
      "monthly",
      0
    );

    current = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}
