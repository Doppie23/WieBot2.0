import BetterSqlite3 from "better-sqlite3";

// time needed to pass after last interaction for a session to be considered expired
const SESSION_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes

export default class RngSessionsTable {
  private db: BetterSqlite3.Database;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS RngSessions
        (
          userId           TEXT,
          guildId          TEXT,
          startAmount      INT  NOT NULL,
          startTime        INT  NOT NULL,
          lastUpdateTime   INT  NOT NULL,
          PRIMARY KEY (userId, guildId),
          FOREIGN KEY (userId, guildId) REFERENCES Users (id, guildId)
        );
      `,
      )
      .run();
  }

  private entryExists(userId: string, guildId: string): boolean {
    const result = this.db
      .prepare(
        "SELECT * FROM RngSessions WHERE userId = ? AND guildId = ? LIMIT 1",
      )
      .get(userId, guildId) as { startTime: number } | undefined;

    return result !== undefined;
  }

  /**
   * Start a new session, overwrites the previous one
   */
  public startSession(userId: string, guildId: string, currAmount: number) {
    const now = Date.now();
    if (!this.entryExists(userId, guildId)) {
      this.db
        .prepare(
          `INSERT INTO RngSessions (userId, guildId, startAmount, startTime, lastUpdateTime) 
            VALUES (?, ?, ?, ?, ?);`,
        )
        .run(userId, guildId, currAmount, now, now);
    } else {
      this.db
        .prepare(
          `UPDATE RngSessions SET startAmount = ?, startTime = ?, lastUpdateTime = ?
            WHERE userId = ? AND guildId = ?;`,
        )
        .run(currAmount, now, now, userId, guildId);
    }
  }

  /**
   * Updates the last time the user played, this way the session stays active
   */
  public refreshSession(userId: string, guildId: string) {
    if (!this.entryExists(userId, guildId)) {
      throw new Error(
        `Session does not exist for user ${userId} in guild ${guildId}`,
      );
    }

    this.db
      .prepare(
        "UPDATE RngSessions SET lastUpdateTime = ? WHERE userId = ? AND guildId = ?;",
      )
      .run(Date.now(), userId, guildId);
  }

  public hasActiveSession(userId: string, guildId: string): boolean {
    const result = this.db
      .prepare(
        "SELECT * FROM RngSessions WHERE userId = ? AND guildId = ? LIMIT 1",
      )
      .get(userId, guildId) as { startTime: number } | undefined;

    if (!result) return false;

    const now = Date.now();

    if (result.startTime + SESSION_TIMEOUT_MS < now) {
      // session is expired
      return false;
    }
    return true;
  }

  public getLatestSession(userId: string, guildId: string) {
    const result = this.db
      .prepare(
        `
        SELECT r.startAmount, r.startTime, r.lastUpdateTime, u.rngScore
          FROM RngSessions r
            JOIN Users u ON r.userId = u.id AND r.guildId = u.guildId
            WHERE u.id = ? AND u.guildId = ? 
        LIMIT 1;
        `,
      )
      .get(userId, guildId) as
      | {
          startAmount: number;
          rngScore: number;
          startTime: number;
          lastUpdateTime: number;
        }
      | undefined;

    if (!result) throw new Error("No session found");

    return {
      startDate: new Date(result.startTime),
      lastUpdateDate: new Date(result.lastUpdateTime),
      amount: result.rngScore - result.startAmount,
    };
  }
}
