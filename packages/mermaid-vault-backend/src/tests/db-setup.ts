import { closeDB } from "../db/index.js";

// Reset connection so each test file gets a fresh, isolated in-memory database
closeDB();
delete process.env.DB_PATH;
delete process.env.DATABASE_URL;
