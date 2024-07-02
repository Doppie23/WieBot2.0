import Database from "better-sqlite3";
import { existsSync } from "node:fs";

const fileName = "database.db";

const exists = existsSync(fileName);

const db = new Database("database.db");

if (!exists) {
  db.prepare(
    `
    CREATE TABLE Users (
      id          TEXT NOT NULL,
      guildId     TEXT NOT NULL,
      rngScore    INT DEFAULT NULL,
      outroScore  INT DEFAULT 0,
      PRIMARY KEY (id, guildId)
    );
    `,
  ).run();
}

export type User = {
  id: string;
  guildId: string;
  rngScore: number | null;
  outroScore: number;
};

export default db;
