import BetterSqlite3 from "better-sqlite3";

type RngRecord = {
  id: number;
  userId: string;
  guildId: string;
  amount: number;
  isWin: number;
  commandName: string;
  time: number;
};

type OptTime = number | null;

export default class RngRecordsTable {
  private db: BetterSqlite3.Database;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS RngRecords
        (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          userId      TEXT NOT NULL,
          guildId     TEXT NOT NULL,
          amount      INT  NOT NULL,
          isWin       INT  NOT NULL,
          commandName TEXT NOT NULL,
          time        INT  NOT NULL,
          FOREIGN KEY (userId, guildId) REFERENCES Users (id, guildId)
        );
      `,
      )
      .run();
  }

  createWinRecord(
    userId: string,
    guildId: string,
    amount: number,
    commandName: string,
  ) {
    this.db
      .prepare(
        `
      INSERT INTO RngRecords
      (userId, guildId, amount, isWin, commandName, time)
      VALUES (?, ?, ?, ?, ?, ?);
    `,
      )
      .run(userId, guildId, amount, 1, commandName, Date.now());
  }

  createLossRecord(
    userId: string,
    guildId: string,
    amount: number,
    commandName: string,
  ) {
    this.db
      .prepare(
        `
      INSERT INTO RngRecords
      (userId, guildId, amount, isWin, commandName, time)
      VALUES (?, ?, ?, ?, ?, ?);
    `,
      )
      .run(userId, guildId, amount, 0, commandName, Date.now());
  }

  getBiggestWin(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    return this.db
      .prepare<[string, string, OptTime, OptTime], RngRecord>(
        `
      SELECT *
      FROM RngRecords
      WHERE userId = ?
        AND guildId = ?
        AND isWin = 1
        AND time >= COALESCE(?, time)
        AND time <= COALESCE(?, time)
      ORDER BY amount DESC
      LIMIT 1;
    `,
      )
      .get(userId, guildId, startTime, endTime);
  }

  getBiggestLoss(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    return this.db
      .prepare<[string, string, OptTime, OptTime], RngRecord>(
        `
      SELECT *
      FROM RngRecords
      WHERE userId = ?
        AND guildId = ?
        AND isWin = 0
        AND time >= COALESCE(?, time)
        AND time <= COALESCE(?, time)
      ORDER BY amount DESC
      LIMIT 1;
    `,
      )
      .get(userId, guildId, startTime, endTime);
  }

  getTotalWins(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    return this.db
      .prepare<
        [string, string, OptTime, OptTime],
        { wins: number; winAmount: number }
      >(
        `
      SELECT COUNT(*) AS wins,
            SUM(CASE
                    WHEN isWin = 1
                        THEN amount
                    ELSE 0 END
            )        AS winAmount
      FROM RngRecords
      WHERE userId = ?
        AND guildId = ?
        AND isWin = 1
        AND time >= COALESCE(?, time)
        AND time <= COALESCE(?, time);
    `,
      )
      .get(userId, guildId, startTime, endTime);
  }

  getTotalLosses(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    return this.db
      .prepare<
        [string, string, OptTime, OptTime],
        { losses: number; lossAmount: number }
      >(
        `
      SELECT COUNT(*) AS losses,
            SUM(CASE
                    WHEN isWin = 0
                        THEN amount
                    ELSE 0 END
            )        AS lossAmount
      FROM RngRecords
      WHERE userId = ?
        AND guildId = ?
        AND isWin = 0
        AND time >= COALESCE(?, time)
        AND time <= COALESCE(?, time);
    `,
      )
      .get(userId, guildId, startTime, endTime);
  }

  /**
   * Returns the last records from most to least recent
   */
  getLastRecords(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
    limit = 10,
  ) {
    return this.db
      .prepare<[string, string, OptTime, OptTime, number], RngRecord>(
        `
      SELECT *
      FROM RngRecords
      WHERE userId = ?
        AND guildId = ?
        AND time >= COALESCE(?, time)
        AND time <= COALESCE(?, time)
      ORDER BY time DESC
      LIMIT ?;
    `,
      )
      .all(userId, guildId, startTime, endTime, limit);
  }

  getFavoriteGame(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    return this.db
      .prepare<
        [string, string, OptTime, OptTime],
        {
          commandName: string;
          usageCount: number;
          wins: number;
          losses: number;
        }
      >(
        `
        SELECT commandName,
               COUNT(*)   AS usageCount,
               SUM(isWin) AS wins,
               SUM(CASE WHEN isWin = 1 THEN 0 ELSE 1 END) AS losses
        FROM RngRecords
        WHERE userId = ?
          AND guildId = ?
          AND time >= COALESCE(?, time)
          AND time <= COALESCE(?, time)
        GROUP BY commandName
        ORDER BY usageCount DESC;
    `,
      )
      .get(userId, guildId, startTime, endTime);
  }

  getWinPercentage(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    return this.db
      .prepare<[string, string, OptTime, OptTime], { winPercentage: number }>(
        `
      SELECT 100.0 * SUM(isWin) / COUNT(*) AS winPercentage
      FROM RngRecords
      WHERE userId = ?
        AND guildId = ?
        AND time >= COALESCE(?, time)
        AND time <= COALESCE(?, time);
    `,
      )
      .get(userId, guildId, startTime, endTime);
  }

  getMostProfitableGame(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    return this.db
      .prepare<
        [string, string, OptTime, OptTime],
        { commandName: string; profit: number }
      >(
        `
        SELECT commandName, SUM(CASE
                      WHEN isWin = 1 THEN amount
                      ELSE -amount END) AS profit
        FROM RngRecords
        WHERE userId = ?
          AND guildId = ?
          AND time >= COALESCE(?, time)
          AND time <= COALESCE(?, time)
        GROUP BY commandName
        ORDER BY profit DESC
    `,
      )
      .get(userId, guildId, startTime, endTime);
  }

  getProfit(
    userId: string,
    guildId: string,
    startTime: OptTime = null,
    endTime: OptTime = null,
  ) {
    const result = this.db
      .prepare<[string, string, OptTime, OptTime], { profit: number }>(
        `
        SELECT SUM(CASE
                      WHEN isWin = 1 THEN amount
                      ELSE -amount END) AS profit
        FROM RngRecords
        WHERE userId = ?
          AND guildId = ?
          AND time >= COALESCE(?, time)
          AND time <= COALESCE(?, time);
    `,
      )
      .get(userId, guildId, startTime, endTime);

    if (!result || result.profit === null) {
      return undefined;
    }
    return result;
  }
}
