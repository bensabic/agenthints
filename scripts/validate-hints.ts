/**
 * Validates hints in the registry.
 *
 * - Validates meta.json against schema
 * - Ensures hint.md exists
 * - Tests transformation against every agent
 *
 * Usage:
 *   pnpm validate-hints              # Validate all hints
 *   pnpm validate-hints example-hint    # Validate specific hint(s)
 *
 * Run with: pnpm validate-hints
 */

import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readHintContent,
  readHintMetadata,
  validateHint,
} from "../lib/hint-validation";
import type { HintMetadata } from "../lib/types";
import { agents } from "../packages/cli/src/agents";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = resolve(__dirname, "../public/registry");
const HINTS_DIR = join(REGISTRY_DIR, "hints");
const SCHEMA_PATH = join(REGISTRY_DIR, "meta.schema.json");

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

async function getHintDirectories(): Promise<string[]> {
  try {
    const entries = await readdir(HINTS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to read hints directory: ${message}`);
    process.exit(1);
  }
}

function resolveAgentPath(agentPath: string, name: string): string {
  return agentPath.replace("{hint}", name);
}

function resolveAgentHeader(
  header: string | ((hintName: string) => string) | undefined,
  name: string
): string | undefined {
  if (!header) {
    return;
  }
  if (typeof header === "function") {
    return header(name);
  }
  return header;
}

function transformForAgent(
  content: string,
  name: string,
  agent: (typeof agents)[keyof typeof agents]
): string {
  let result = content;

  const header = resolveAgentHeader(
    "header" in agent ? agent.header : undefined,
    name
  );
  if (header) {
    result = `${header}\n\n${result}`;
  }

  if (agent.appendMode) {
    result = `<!-- agenthints:${name}:start -->\n${result}\n<!-- agenthints:${name}:end -->`;
  }

  return result;
}

function validateTransformation(
  content: string,
  name: string,
  agentName: string,
  agent: (typeof agents)[keyof typeof agents]
): string[] {
  const errors: string[] = [];

  try {
    const transformed = transformForAgent(content, name, agent);
    const resolvedPath = resolveAgentPath(agent.path, name);

    if (!transformed || transformed.trim().length === 0) {
      errors.push(`Empty output for ${agentName}`);
    }

    if (!resolvedPath) {
      errors.push(`Invalid path for ${agentName}`);
    }

    if (agent.appendMode) {
      if (!transformed.includes(`<!-- agenthints:${name}:start -->`)) {
        errors.push(`Missing start marker for ${agentName}`);
      }
      if (!transformed.includes(`<!-- agenthints:${name}:end -->`)) {
        errors.push(`Missing end marker for ${agentName}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Transformation failed for ${agentName}: ${message}`);
  }

  return errors;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validation script with multiple checks
async function validate(hintsToValidate?: string[]): Promise<void> {
  const allHints = await getHintDirectories();

  let hintDirs: string[];
  if (hintsToValidate && hintsToValidate.length > 0) {
    hintDirs = hintsToValidate.filter((hint) => allHints.includes(hint));
    const notFound = hintsToValidate.filter((hint) => !allHints.includes(hint));
    if (notFound.length > 0) {
      console.log(
        `Warning: ${pluralize(notFound.length, "Hint", "Hints")} not found: ${notFound.join(", ")}\n`
      );
    }
  } else {
    hintDirs = allHints;
  }

  if (hintDirs.length === 0) {
    console.log("No hints to validate.");
    return;
  }

  console.log(
    `Validating ${hintDirs.length} ${pluralize(hintDirs.length, "hint", "hints")}...\n`
  );

  const agentCount = Object.keys(agents).length;
  let hasErrors = false;

  for (const hintPath of hintDirs) {
    console.log(`Checking ${hintPath}...`);
    const errors: string[] = [];

    let meta: HintMetadata;
    try {
      meta = await readHintMetadata(HINTS_DIR, hintPath);
    } catch (error) {
      console.log("  ✗ Failed to read meta.json");
      console.log(
        `    ${error instanceof Error ? error.message : String(error)}`
      );
      hasErrors = true;
      continue;
    }

    // Validate metadata and hint file existence
    const validationResult = await validateHint(
      HINTS_DIR,
      SCHEMA_PATH,
      hintPath,
      meta
    );
    errors.push(...validationResult.errors);

    let content: string;
    try {
      content = await readHintContent(HINTS_DIR, hintPath, meta.hint);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to read hint content: ${message}`);
      content = "";
    }

    if (content) {
      for (const [agentName, agent] of Object.entries(agents)) {
        const transformErrors = validateTransformation(
          content,
          hintPath,
          agentName,
          agent
        );
        errors.push(...transformErrors);
      }
    }

    if (errors.length > 0) {
      hasErrors = true;
      console.log(
        `  ✗ ${errors.length} ${pluralize(errors.length, "error", "errors")}:`
      );
      for (const validationError of errors) {
        console.log(`    - ${validationError}`);
      }
    } else {
      console.log(
        `  ✓ Valid (tested against ${agentCount} ${pluralize(agentCount, "agent", "agents")})`
      );
    }
  }

  console.log();

  if (hasErrors) {
    console.log("Validation failed.");
    process.exit(1);
  } else if (hintDirs.length === 1) {
    console.log("The hint is valid.");
  } else {
    console.log(`All ${hintDirs.length} hints are valid.`);
  }
}

const args = process.argv.slice(2);
validate(args.length > 0 ? args : undefined).catch((error) => {
  console.error("Validation failed:", error);
  process.exit(1);
});
