import db, { User } from "./db";
import { createUser, getUser, getUsers, userExists } from "./utils";

export function increaseOutroScore(id: string, guildId: string) {
  if (!userExists(id, guildId)) {
    createUser(id, guildId);
  }

  const result = db
    .prepare(
      "UPDATE Users SET outroScore = outroScore + 1 WHERE id = ? AND guildId = ?",
    )
    .run(id, guildId);

  if (result.changes === 0) {
    console.warn("[WARN] Did not increase outro score for user " + id);
  } else {
    console.log("[INFO] Increased outro score for user " + id);
  }
}

/**
 * Returns all the users with a outro score higher than 0, sorted from highest to lowest
 */
export function getOutroScores(guildId: string): User[] {
  const users = db
    .prepare("SELECT * FROM Users WHERE guildId = ? AND outroScore > 0")
    .all(guildId) as User[];

  users.sort((a, b) => b.outroScore - a.outroScore);
  return users;
}
