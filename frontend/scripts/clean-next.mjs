import { rmSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const dir = join(process.cwd(), ".next");
try {
  rmSync(dir, { recursive: true, force: true });
  console.log("Removed", dir);
} catch (err) {
  console.warn("clean-next:", err.message);
}
