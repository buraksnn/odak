import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import {
  backupSchema,
  defaultSettings,
  catalog,
  type Snapshot,
} from "./domain";
const state = sqliteTable("app_state", {
  id: integer("id").primaryKey(),
  payload: text("payload", { mode: "json" }).$type<Snapshot>().notNull(),
});
const location = resolve(
  /* turbopackIgnore: true */ process.env.ODAK_DB_PATH || "data/odak.sqlite",
);
mkdirSync(dirname(location), { recursive: true, mode: 0o700 });
const sqlite = new Database(location);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
// Ordered, transactional migrations. Future schema changes append a migration.
const migrations = [
  `CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL CHECK(json_valid(payload)))`,
];
sqlite.transaction(() => {
  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)",
  );
  const current =
    (
      sqlite
        .prepare("SELECT MAX(version) AS v FROM schema_migrations")
        .get() as { v: number | null }
    ).v || 0;
  migrations.forEach((sql, i) => {
    if (i + 1 > current) {
      sqlite.exec(sql);
      sqlite.prepare("INSERT INTO schema_migrations VALUES (?)").run(i + 1);
    }
  });
})();
const db = drizzle(sqlite);
if (!db.select().from(state).get())
  db.insert(state)
    .values({
      id: 1,
      payload: {
        version: 1,
        settings: defaultSettings,
        tasks: [],
        exams: [],
        topics: catalog,
        analyses: [],
      },
    })
    .run();
export function read(): Snapshot {
  return backupSchema.parse(db.select().from(state).get()!.payload);
}
export function mutate(action: (b: Snapshot) => Snapshot) {
  return sqlite.transaction(() => {
    const next = backupSchema.parse(action(read()));
    db.update(state).set({ payload: next }).run();
    return next;
  })();
}
