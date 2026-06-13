import { cpSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");
const staticSrc = join(root, ".next", "static");
const staticDest = join(standaloneDir, ".next", "static");
const chunksDir = join(staticDest, "chunks");

if (!existsSync(join(standaloneDir, "server.js"))) {
  console.error("Missing .next/standalone/server.js — run `npm run build` first.");
  process.exit(1);
}

if (!existsSync(staticSrc)) {
  console.error("Missing .next/static — build may have failed.");
  process.exit(1);
}

cpSync(staticSrc, staticDest, { recursive: true });
cpSync(join(root, "public"), join(standaloneDir, "public"), { recursive: true });

const cssFiles = existsSync(chunksDir)
  ? readdirSync(chunksDir).filter((name) => name.endsWith(".css"))
  : [];

if (cssFiles.length === 0) {
  console.error(
    "No CSS in standalone/.next/static/chunks — CSS sẽ không load trên production.",
  );
  process.exit(1);
}

console.log("Standalone bundle ready:", standaloneDir);
console.log(`CSS chunks: ${cssFiles.join(", ")}`);
console.log("Upload everything inside .next/standalone/ to cPanel Node app root.");
