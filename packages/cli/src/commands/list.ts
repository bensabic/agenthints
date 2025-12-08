/**
 * List command - lists all available hints in the registry.
 */

import { log, spinner } from "@clack/prompts";
import pc from "picocolors";
import { fetchRegistryIndex, type IndexEntry } from "../registry";
import { pluralize } from "../utils";

export type ListOptions = {
  category?: string;
  json?: boolean;
};

function formatHintList(hints: IndexEntry[]): void {
  // Group by category
  const byCategory = hints.reduce(
    (acc, hint) => {
      const cat = hint.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(hint);
      return acc;
    },
    {} as Record<string, IndexEntry[]>
  );

  for (const [category, items] of Object.entries(byCategory)) {
    console.log();
    console.log(
      pc.bold(pc.cyan(category.charAt(0).toUpperCase() + category.slice(1)))
    );
    console.log(pc.dim("─".repeat(40)));

    for (const hint of items) {
      console.log(
        `  ${pc.bold(hint.path.padEnd(20))} ${pc.dim(hint.description)}`
      );
    }
  }
}

export async function list(options: ListOptions): Promise<void> {
  const s = options.json ? null : spinner();
  s?.start("Fetching registry...");

  try {
    const index = await fetchRegistryIndex();
    s?.stop("Registry loaded.");

    let hints = index.hints;

    // Filter by category if specified
    if (options.category) {
      hints = hints.filter(
        (hint) =>
          hint.category.toLowerCase() === options.category?.toLowerCase()
      );
    }

    // Output as JSON if requested
    if (options.json) {
      console.log(JSON.stringify(hints, null, 2));
      return;
    }

    if (hints.length === 0) {
      log.warn(
        options.category
          ? `No hints found in category "${options.category}"`
          : "No hints found in registry"
      );
      return;
    }

    console.log();
    console.log(
      pc.bold(
        `Found ${hints.length} ${pluralize(hints.length, "hint", "hints")}:`
      )
    );
    formatHintList(hints);
    console.log();
    console.log(
      pc.dim(
        `Run ${pc.cyan("agenthints add <hint>")} to add hints to your project.`
      )
    );
  } catch (error) {
    s?.stop("Failed to fetch registry.");
    log.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}
