import { existsSync } from "node:fs";
import Database from "./Database";

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

export default db;
