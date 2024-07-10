import Database from "better-sqlite3";
import UsersTable from "./tables/UsersTable";
import TimeoutsTable from "./tables/TimeoutsTable";
import RngSessionsTable from "./tables/RngSessionsTable";

const dbConnection = new Database("database.db");

const db = {
  connection: dbConnection,
  users: new UsersTable(dbConnection),
  timeouts: new TimeoutsTable(dbConnection),
  rngSessions: new RngSessionsTable(dbConnection),
};

export default db;
