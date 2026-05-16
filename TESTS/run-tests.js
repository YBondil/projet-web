import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { backupDbFiles, cleanDbFiles, restoreDbFiles } from "./helpers/backend.js";

restoreDbFiles();
backupDbFiles();
cleanDbFiles();

const args = process.argv.slice(2);
const result = spawnSync("bun", ["test", ...args], {
  stdio: "inherit",
  cwd: resolve(import.meta.dir),
});

restoreDbFiles();

process.exit(result.status ?? 0);
