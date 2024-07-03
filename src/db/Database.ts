import _Database from "better-sqlite3";

export type DbUser = {
  id: string;
  guildId: string;
  rngScore: number | null;
  outroScore: number;
};

export default class Database extends _Database {
  constructor(fileName: string) {
    super(fileName);

    this.prepare(
      `
      CREATE TABLE IF NOT EXISTS Users (
        id          TEXT NOT NULL,
        guildId     TEXT NOT NULL,
        rngScore    INT DEFAULT NULL,
        outroScore  INT DEFAULT 0,
        PRIMARY KEY (id, guildId)
      );
    `,
    ).run();
  }

  userExists(id: string, guildId: string): boolean {
    return this.getUser(id, guildId) !== undefined;
  }

  getUser(id: string, guildId: string): DbUser | undefined {
    return this.prepare("SELECT * FROM Users WHERE id = ? AND guildId = ?").get(
      id,
      guildId,
    ) as DbUser | undefined;
  }

  createUser(id: string, guildId: string) {
    this.prepare("INSERT INTO Users (id, guildId) VALUES (?, ?)").run(
      id,
      guildId,
    );
  }

  getUsers(guildId: string): DbUser[] {
    return this.prepare("SELECT * FROM Users WHERE guildId = ?").all(
      guildId,
    ) as DbUser[];
  }

  increaseOutroScore(id: string, guildId: string) {
    if (!this.userExists(id, guildId)) {
      this.createUser(id, guildId);
    }

    const result = this.prepare(
      "UPDATE Users SET outroScore = outroScore + 1 WHERE id = ? AND guildId = ?",
    ).run(id, guildId);

    if (result.changes === 0) {
      throw new Error("Did not increase outro score for user " + id);
    }
  }

  /**
   * Returns all the users with a outro score higher than 0, sorted from highest to lowest
   */
  getOutroScores(guildId: string): DbUser[] {
    const users = this.prepare(
      "SELECT * FROM Users WHERE guildId = ? AND outroScore > 0 ORDER BY outroScore DESC",
    ).all(guildId) as DbUser[];

    return users;
  }

  /**
   * Sorted from highest to lowest
   */
  getRngScores(guildId: string): DbUser[] {
    const users = this.prepare(
      "SELECT * FROM Users WHERE guildId = ? AND rngScore IS NOT NULL ORDER BY rngScore DESC",
    ).all(guildId) as DbUser[];

    return users;
  }

  getAllRngUsers(guildId: string) {
    return this.prepare(
      "SELECT * FROM Users WHERE guildId = ? AND rngScore IS NOT NULL",
    ).all(guildId) as DbUser[];
  }

  isRngUser(id: string, guildId: string): boolean {
    const user = this.getUser(id, guildId);

    if (!user) return false;

    return user.rngScore !== null;
  }

  updateRngScore(id: string, guildId: string, amount: number) {
    if (!this.isRngUser(id, guildId)) {
      throw new Error("User " + id + " is not a RNG user");
    }

    const result = this.prepare(
      "UPDATE Users SET rngScore = rngScore + ? WHERE id = ? AND guildId = ?",
    ).run(amount, id, guildId);

    if (result.changes === 0) {
      throw new Error("Did not increase rng score for user " + id);
    }
  }

  donate(fromId: string, toId: string, guildId: string, amount: number) {
    this.updateRngScore(fromId, guildId, -amount);
    this.updateRngScore(toId, guildId, amount);
  }
}