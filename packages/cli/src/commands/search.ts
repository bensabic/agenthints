/**
 * Search command - searches for hints in the registry.
 */

import { log, spinner } from "@clack/prompts";
import pc from "picocolors";
import { searchHints } from "../registry";

export type SearchOptions = {
  json?: boolean;
};

export async function search(
  query: string,
  options: SearchOptions
): Promise<void> {
  const s = options.json ? null : spinner();
  s?.start(`Searching for "${query}"...`);

  try {
    const results = await searchHints(query);
    s?.stop(`Found ${results.length} results.`);

    // Output as JSON if requested
    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      log.info(
        `No hints found matching "${query}". Run ${pc.cyan("agenthints list")} to see all hints.`
      );
      return;
    }

    console.log();
    for (const hint of results) {
      console.log(
        `${pc.bold(pc.cyan(hint.path))} ${pc.dim(`[${hint.category}]`)}`
      );
      console.log(`  ${hint.description}`);
      if (hint.tags.length > 0) {
        console.log(`  ${pc.dim(hint.tags.map((t) => `#${t}`).join(" "))}`);
      }
      console.log();
    }

    console.log(
      pc.dim(
        `Run ${pc.cyan("agenthints add <hint>")} to add hints to your project.`
      )
    );
  } catch (error) {
    s?.stop("Search failed.");
    log.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}
