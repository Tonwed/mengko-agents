#!/usr/bin/env bun
/**
 * Version management script for Mengko Agents
 *
 * Usage:
 *   bun run scripts/version.ts patch   # 1.0.0 -> 1.0.1
 *   bun run scripts/version.ts minor   # 1.0.0 -> 1.1.0
 *   bun run scripts/version.ts major   # 1.0.0 -> 2.0.0
 *   bun run scripts/version.ts 1.2.3   # Set specific version
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT_DIR = join(import.meta.dir, "..");

// All package.json files to update
const PACKAGE_FILES = [
  "package.json",
  "apps/electron/package.json",
  "packages/core/package.json",
  "packages/shared/package.json",
  "packages/ui/package.json",
  "packages/mermaid/package.json",
  "packages/session-mcp-server/package.json",
  "packages/session-tools-core/package.json",
  "packages/pi-agent-server/package.json",
];

function getCurrentVersion(): string {
  const rootPkg = JSON.parse(
    readFileSync(join(ROOT_DIR, "package.json"), "utf-8")
  );
  return rootPkg.version;
}

function bumpVersion(version: string, type: "major" | "minor" | "patch"): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }

  if (type === "major") {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === "minor") {
    parts[1]++;
    parts[2] = 0;
  } else {
    parts[2]++;
  }

  return parts.join(".");
}

function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function updatePackageFile(filePath: string, newVersion: string): void {
  const fullPath = join(ROOT_DIR, filePath);
  try {
    const content = readFileSync(fullPath, "utf-8");
    const pkg = JSON.parse(content);
    pkg.version = newVersion;
    writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`✓ Updated ${filePath}`);
  } catch (err) {
    console.log(`⚠ Skipped ${filePath} (not found or invalid)`);
  }
}

function createReleaseNotes(version: string): void {
  const releaseNotesDir = join(ROOT_DIR, "apps/electron/resources/release-notes");
  const filePath = join(releaseNotesDir, `v${version}.md`);

  const template = `# v${version}

---

## What's Changed

<!-- Add your release notes here -->

**Full Changelog**: https://github.com/Tonwed/mengko-agents/compare/vPREVIOUS_VERSION...v${version}
`;

  try {
    writeFileSync(filePath, template);
    console.log(`✓ Created release notes: apps/electron/resources/release-notes/v${version}.md`);
  } catch (err) {
    console.log(`⚠ Could not create release notes: ${err}`);
  }
}

// Main
const arg = process.argv[2];

if (!arg) {
  console.log(`Current version: ${getCurrentVersion()}`);
  console.log("");
  console.log("Usage:");
  console.log("  bun run scripts/version.ts patch   # Bump patch version");
  console.log("  bun run scripts/version.ts minor   # Bump minor version");
  console.log("  bun run scripts/version.ts major   # Bump major version");
  console.log("  bun run scripts/version.ts 1.2.3   # Set specific version");
  process.exit(0);
}

const currentVersion = getCurrentVersion();
let newVersion: string;

if (arg === "patch" || arg === "minor" || arg === "major") {
  newVersion = bumpVersion(currentVersion, arg);
} else if (isValidVersion(arg)) {
  newVersion = arg;
} else {
  console.error(`Invalid version or bump type: ${arg}`);
  process.exit(1);
}

console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);
console.log("");

// Update all package.json files
for (const file of PACKAGE_FILES) {
  updatePackageFile(file, newVersion);
}

// Create release notes template
createReleaseNotes(newVersion);

console.log("");
console.log(`✅ Version updated to ${newVersion}`);
console.log("");
console.log("Next steps:");
console.log("1. Edit the release notes: apps/electron/resources/release-notes/v${newVersion}.md");
console.log("2. Commit the changes: git add -A && git commit -m 'chore: Bump version to ${newVersion}'");
console.log("3. Create and push tag: git tag v${newVersion} && git push origin main --tags");