/**
 * Init command - interactive setup for new projects.
 */

import {
  cancel,
  isCancel,
  log,
  multiselect,
  select,
  spinner,
} from "@clack/prompts";
import pc from "picocolors";
import { type AgentName, agents } from "../agents";
import { fetchRegistryIndex, type IndexEntry } from "../registry";
import { add } from "./add";

export async function init(): Promise<void> {
  const s = spinner();

  // Step 1: Select agent
  const agentSelection = await select({
    message: "Which AI agent are you using?",
    options: Object.entries(agents).map(([key, config]) => ({
      value: key,
      label: config.name,
      hint: config.description,
    })),
  });

  if (isCancel(agentSelection)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  const selectedAgent = agentSelection as AgentName;

  // Step 2: Fetch available hints
  s.start("Loading available hints...");
  let hints: IndexEntry[];

  try {
    const index = await fetchRegistryIndex();
    hints = index.hints;
    s.stop(`Found ${hints.length} hints.`);
  } catch (error) {
    s.stop("Failed to load hints.");
    log.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }

  // Step 3: Select hints to add
  const hintSelection = await multiselect({
    message: "Which hints are you using? (space to select)",
    options: hints.map((hint) => ({
      value: hint.path,
      label: hint.name,
      hint: `${hint.description} [${hint.category}]`,
    })),
    required: false,
  });

  if (isCancel(hintSelection)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  const selectedHints = hintSelection as string[];

  if (selectedHints.length === 0) {
    log.info("No hints selected. You can add hints later with:");
    console.log(`  ${pc.cyan("npx agenthints add <hint>")}`);
    return;
  }

  // Step 4: Add selected hints
  log.step(`Adding hints for ${selectedHints.length} hints...`);

  await add(selectedHints, { agent: selectedAgent });
}
