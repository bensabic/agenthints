/**
 * Build script for generating the registry index.
 *
 * Reads all meta.json files from public/registry/hints/
 * and generates public/registry/index.json
 *
 * Run with: pnpm build-registry
 */

import { createHash } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readHintContent,
  readHintMetadata,
  validateHint,
} from "../lib/hint-validation";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = resolve(__dirname, "../public/registry");
const HINTS_DIR = join(REGISTRY_DIR, "hints");
const SCHEMA_PATH = join(REGISTRY_DIR, "meta.schema.json");
const INDEX_PATH = join(REGISTRY_DIR, "index.json");

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

type IndexEntry = {
  path: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  sha256: string;
};

type RegistryIndex = {
  $schema: string;
  hints: IndexEntry[];
};

async function getHintDirectories(): Promise<string[]> {
  const entries = await readdir(HINTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

async function build(): Promise<void> {
  console.log("Building registry index...\n");

  const hintDirs = await getHintDirectories();
  console.log(
    `Found ${hintDirs.length} ${pluralize(hintDirs.length, "hint", "hints")}:\n`
  );

  const hints: IndexEntry[] = [];

  for (const hintPath of hintDirs) {
    try {
      const metadata = await readHintMetadata(HINTS_DIR, hintPath);
      const result = await validateHint(
        HINTS_DIR,
        SCHEMA_PATH,
        hintPath,
        metadata
      );

      if (!result.valid) {
        console.error(`  ✗ ${hintPath}: ${result.errors.join(", ")}`);
        process.exit(1);
      }

      const content = await readHintContent(HINTS_DIR, hintPath, metadata.hint);
      const hash = createHash("sha256").update(content).digest("hex");

      hints.push({
        path: hintPath,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags,
        sha256: hash,
      });

      console.log(`  ✓ ${metadata.name} (${hintPath})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`  ✗ ${hintPath}: ${message}`);
      process.exit(1);
    }
  }

  // Sort hints alphabetically by path
  hints.sort((a, b) => a.path.localeCompare(b.path));

  const index: RegistryIndex = {
    $schema: "./index.schema.json",
    hints,
  };

  // Write without comment header to ensure valid JSON
  const output = JSON.stringify(index, null, 2);

  await writeFile(INDEX_PATH, output, "utf-8");

  console.log(`\nGenerated ${INDEX_PATH}`);
  console.log(
    `Total ${pluralize(hints.length, "hint", "hints")}: ${hints.length}`
  );
}

build().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
