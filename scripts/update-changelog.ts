/**
 * Changelog update script.
 *
 * Compares current registry state with index.json and updates CHANGELOG.md
 * with any additions or removals.
 *
 * Run with: pnpm update-changelog
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const REGISTRY_DIR = join(ROOT_DIR, "public/registry");
const HINTS_DIR = join(REGISTRY_DIR, "hints");
const INDEX_PATH = join(REGISTRY_DIR, "index.json");
const CHANGELOG_PATH = join(ROOT_DIR, "CHANGELOG.md");

type IndexEntry = {
  path: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
};

type RegistryIndex = {
  hints: IndexEntry[];
};

async function getCurrentHints(): Promise<Set<string>> {
  try {
    const entries = await readdir(HINTS_DIR, { withFileTypes: true });
    return new Set(
      entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    );
  } catch {
    return new Set();
  }
}

async function getPreviousHints(): Promise<Set<string>> {
  try {
    const content = await readFile(INDEX_PATH, "utf-8");
    const json = content.replace(/^\s*\/\/.*$/gm, "");
    const index: RegistryIndex = JSON.parse(json);
    return new Set(index.hints.map((h) => h.path));
  } catch {
    return new Set();
  }
}

async function readChangelog(): Promise<string> {
  try {
    return await readFile(CHANGELOG_PATH, "utf-8");
  } catch {
    return `# Changelog

All notable changes to the AgentHints registry will be documented in this file.

`;
  }
}

function formatDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

async function updateChangelog(): Promise<void> {
  const current = await getCurrentHints();
  const previous = await getPreviousHints();

  const added = [...current].filter((h) => !previous.has(h));
  const removed = [...previous].filter((h) => !current.has(h));

  if (added.length === 0 && removed.length === 0) {
    console.log("No changes to document.");
    return;
  }

  const changelog = await readChangelog();
  const date = formatDate();

  let entry = `## ${date}\n\n`;

  if (added.length > 0) {
    entry += "### Added\n\n";
    entry += added.map((h) => `- ${h}`).join("\n");
    entry += "\n\n";
  }

  if (removed.length > 0) {
    entry += "### Removed\n\n";
    entry += removed.map((h) => `- ${h}`).join("\n");
    entry += "\n\n";
  }

  // Insert after the header and description (find second double newline)
  const firstBreak = changelog.indexOf("\n\n");
  if (firstBreak === -1) {
    console.error("Invalid changelog format: missing header separator");
    process.exit(1);
  }
  const secondBreak = changelog.indexOf("\n\n", firstBreak + 2);
  const headerEnd = secondBreak === -1 ? firstBreak + 2 : secondBreak + 2;
  const header = changelog.slice(0, headerEnd);
  const rest = changelog.slice(headerEnd);

  // Avoid duplicate entries for same date
  const existingDatePattern = new RegExp(`^## ${date}\\n`, "m");
  if (existingDatePattern.test(rest)) {
    console.log(`Entry for ${date} already exists, skipping.`);
    return;
  }

  const updated = header + entry + rest;

  await writeFile(CHANGELOG_PATH, updated, "utf-8");

  console.log("Updated CHANGELOG.md:");
  if (added.length > 0) {
    console.log(`  Added: ${added.join(", ")}`);
  }
  if (removed.length > 0) {
    console.log(`  Removed: ${removed.join(", ")}`);
  }
}

updateChangelog().catch((error) => {
  console.error("Changelog update failed:", error);
  process.exit(1);
});
