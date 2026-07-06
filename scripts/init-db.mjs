// Run the schema against DATABASE_URL:  npm run db:init
import { readFileSync } from "node:fs";
import pg from "pg";

const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!cs) { console.error("Set DATABASE_URL first."); process.exit(1); }

const client = new pg.Client({
  connectionString: cs,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
});

const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
await client.connect();
await client.query(sql);
console.log("Schema applied.");
await client.end();
