import Database from "better-sqlite3";
import UsersTable from "./tables/UsersTable";
import TimeoutsTable from "./tables/TimeoutsTable";

const dbConnection = new Database("database.db");

const db = {
  connection: dbConnection,
  users: new UsersTable(dbConnection),
  timeouts: new TimeoutsTable(dbConnection),
};

export default db;
