import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isCloudOrProd =
  process.env.NODE_ENV === "production" ||
  (connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1"));

export const pool = new Pool({
  connectionString: connectionString || "postgresql://postgres:postgres@localhost:5432/contract_lens",
  ssl: isCloudOrProd ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.warn("[ContractLens DB] Unexpected pool client error:", err.message);
});

if (!connectionString) {
  console.warn(
    "[ContractLens DB] Warning: DATABASE_URL is not set. Falling back to default local connection. Make sure PostgreSQL is running or set DATABASE_URL in your environment.",
  );
}

export const db = drizzle(pool, { schema });

export * from "./schema";
