#!/usr/bin/env node

/**
 * Agent Hints CLI
 *
 * The registry for feeding hints to your AI software engineer.
 */

import { intro } from "@clack/prompts";
import { Command } from "commander";

declare const __VERSION__: string;

import pc from "picocolors";
import { agentNames } from "./agents";
import { add } from "./commands/add";
import { init } from "./commands/init";
import { list } from "./commands/list";
import { remove } from "./commands/remove";
import { search } from "./commands/search";

const program = new Command();

const title = `
${pc.bold(pc.cyan("Agent Hints"))}
${pc.dim("The registry for feeding hints to your AI software engineer.")}
`;

program
  .name("Agent Hints")
  .description("The registry for feeding hints to your AI software engineer.")
  .version(__VERSION__, "-v, --version", "Display the version number");

program
  .command("init")
  .description("Interactive setup for new projects")
  .action(async () => {
    console.log(title);
    intro(pc.bgCyan(pc.black(" init ")));
    await init();
  });

program
  .command("add")
  .description("Add hints to your project")
  .argument("<names...>", "Names of hints to add")
  .option(
    "-a, --agent <agent>",
    `Agent to configure (${agentNames.slice(0, 3).join(", ")}...)`
  )
  .option("-y, --yes", "Skip confirmation prompts")
  .option("--cwd <path>", "Working directory (default: current directory)")
  .action(async (hints: string[], options) => {
    console.log(title);
    intro(pc.bgCyan(pc.black(" add ")));
    await add(hints, options);
  });

program
  .command("remove")
  .description("Remove hints from your project")
  .argument("<names...>", "Names of hints to remove")
  .option(
    "-a, --agent <agent>",
    `Agent to configure (${agentNames.slice(0, 3).join(", ")}...)`
  )
  .option("--cwd <path>", "Working directory (default: current directory)")
  .action(async (hints: string[], options) => {
    console.log(title);
    intro(pc.bgCyan(pc.black(" remove ")));
    await remove(hints, options);
  });

program
  .command("list")
  .description("List all available hints in the registry")
  .option("-c, --category <category>", "Filter by category")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    if (!options.json) {
      console.log(title);
      intro(pc.bgCyan(pc.black(" list ")));
    }
    await list(options);
  });

program
  .command("search")
  .description("Search for hints in the registry")
  .argument("<query>", "Search query")
  .option("--json", "Output as JSON")
  .action(async (query: string, options) => {
    if (!options.json) {
      console.log(title);
      intro(pc.bgCyan(pc.black(" search ")));
    }
    await search(query, options);
  });

program
  .command("agents")
  .description("List all supported AI agents")
  .action(() => {
    console.log(title);
    console.log(pc.bold("Supported AI Agents:"));
    console.log();
    console.log(agentNames.map((name) => `  ${pc.cyan(name)}`).join("\n"));
    console.log();
    console.log(
      pc.dim(`Use ${pc.cyan("--agent <name>")} with add/remove commands.`)
    );
  });

program.parseAsync().catch((error) => {
  console.error(error);
  process.exit(1);
});
