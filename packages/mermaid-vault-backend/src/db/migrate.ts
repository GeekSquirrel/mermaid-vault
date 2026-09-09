import { getDB, closeDB } from "./index.js";

console.log("Running migrations...");
getDB();
closeDB();
console.log("Migrations applied successfully.");
