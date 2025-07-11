const Database = require("better-sqlite3");
const db = new Database("/data/database.db");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS products (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    owner    TEXT NOT NULL,
    version  TEXT NOT NULL,
    price    INTEGER NOT NULL,
    UNIQUE(name, version)
  )
`
).run();

module.exports = db;
