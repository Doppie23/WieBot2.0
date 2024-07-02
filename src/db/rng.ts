import db, { User } from "./db";
import { getUser } from "./utils";

export function getAllRngUsers(guildId: string) {
  return db
    .prepare("SELECT * FROM Users WHERE guildId = ? AND rngScore IS NOT NULL")
    .all(guildId) as User[];
}

export function isRngUser(id: string, guildId: string): boolean {
  const user = getUser(id, guildId);

  if (!user) return false;

  return user.rngScore !== null;
}

export function increaseRngScore(id: string, guildId: string, amount: number) {
  if (!isRngUser(id, guildId)) {
    throw new Error("User " + id + " is not a RNG user");
  }

  const result = db
    .prepare(
      "UPDATE Users SET rngScore = rngScore + ? WHERE id = ? AND guildId = ?",
    )
    .run(amount, id, guildId);

  if (result.changes === 0) {
    throw new Error("Did not increase rng score for user " + id);
  }
}
