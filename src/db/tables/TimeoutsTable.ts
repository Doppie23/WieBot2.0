import BetterSqlite3 from "better-sqlite3";

export default class TimeoutsTable {
  private db: BetterSqlite3.Database;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS Timeouts
        (
          userId      TEXT NOT NULL,
          guildId     TEXT NOT NULL,
          commandName TEXT NOT NULL,
          timeout     INT  NOT NULL,
          PRIMARY KEY (userId, guildId, commandName)
        );
      `,
      )
      .run();
  }

  public addTimeout(
    userId: string,
    guildId: string,
    commandName: string,
    timeout: number,
  ) {
    this.db
      .prepare(
        "INSERT INTO Timeouts (userId, guildId, commandName, timeout) VALUES (?, ?, ?, ?);",
      )
      .run(userId, guildId, commandName, Date.now() + timeout * 1000);
  }

  public timeRemaining(userId: string, guildId: string, commandName: string) {
    const result = this.db
      .prepare(
        "SELECT timeout FROM Timeouts WHERE userId = ? AND guildId = ? AND commandName = ? LIMIT 1",
      )
      .get(userId, guildId, commandName) as { timeout: number } | undefined;

    if (!result) return 0;

    const timeRemaining = result.timeout - Date.now();

    if (timeRemaining <= 0) {
      this.deleteTimeout(userId, guildId, commandName);
    }

    return timeRemaining;
  }

  public deleteTimeout(userId: string, guildId: string, commandName: string) {
    this.db
      .prepare(
        "DELETE FROM Timeouts WHERE userId = ? AND guildId = ? AND commandName = ?",
      )
      .run(userId, guildId, commandName);
  }
}
