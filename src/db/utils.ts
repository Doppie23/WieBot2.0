import db, { User } from "./db";

export function userExists(id: string, guildId: string): boolean {
  return getUser(id, guildId) !== undefined;
}

export function getUser(id: string, guildId: string): User | undefined {
  return db
    .prepare("SELECT * FROM Users WHERE id = ? AND guildId = ?")
    .get(id, guildId) as User | undefined;
}

export function createUser(id: string, guildId: string) {
  db.prepare("INSERT INTO Users (id, guildId) VALUES (?, ?)").run(id, guildId);
}

export function getUsers(guildId: string): User[] {
  return db
    .prepare("SELECT * FROM Users WHERE guildId = ?")
    .all(guildId) as User[];
}
