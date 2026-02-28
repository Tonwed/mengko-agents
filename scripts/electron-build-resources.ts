/**
 * Cross-platform resources copy script
 */

import { existsSync, cpSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";

const ROOT_DIR = join(import.meta.dir, "..");
const ELECTRON_DIR = join(ROOT_DIR, "apps/electron");

const srcDir = join(ELECTRON_DIR, "resources");
const destDir = join(ELECTRON_DIR, "dist/resources");

if (existsSync(srcDir)) {
  cpSync(srcDir, destDir, { recursive: true, force: true });
  console.log("📦 Copied resources to dist");
} else {
  console.log("⚠️ No resources directory found");
}

// Copy pi-agent-server to resources
const piServerSrc = join(ROOT_DIR, "packages/pi-agent-server/dist/index.js");
const piServerDestDir = join(ELECTRON_DIR, "resources/pi-agent-server");
const piServerDest = join(piServerDestDir, "index.js");

if (existsSync(piServerSrc)) {
  // Ensure destination directory exists
  if (!existsSync(piServerDestDir)) {
    mkdirSync(piServerDestDir, { recursive: true });
  }
  copyFileSync(piServerSrc, piServerDest);
  console.log("📦 Copied pi-agent-server to resources");

  // Also copy to dist if it exists (for dev mode)
  const distDestDir = join(ELECTRON_DIR, "dist/resources/pi-agent-server");
  if (existsSync(join(ELECTRON_DIR, "dist"))) {
    if (!existsSync(distDestDir)) {
      mkdirSync(distDestDir, { recursive: true });
    }
    copyFileSync(piServerSrc, join(distDestDir, "index.js"));
    console.log("📦 Copied pi-agent-server to dist/resources");
  }
} else {
  console.log("⚠️ pi-agent-server dist not found - run 'bun run build' in packages/pi-agent-server first");
}
