/**
 * Remove command - removes agent hints for specified hints.
 */

import { resolve } from "node:path";
import { cancel, isCancel, log, select, spinner } from "@clack/prompts";
import pc from "picocolors";
import {
  type AgentConfig,
  type AgentName,
  agentNames,
  agents,
  getAgent,
  resolveAgentPath,
} from "../agents";
import {
  deleteFile,
  fileExists,
  readFile,
  resolvePath,
  writeFile,
} from "../fs";
import { extractSection, removeSection } from "../transformer";
import { pluralize } from "../utils";

export type RemoveOptions = {
  agent?: string;
  cwd?: string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: CLI command with multiple user interaction paths
export async function remove(
  hintPaths: string[],
  options: RemoveOptions
): Promise<void> {
  const s = spinner();
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();

  // Determine which agent to use
  let agentName: AgentName;
  let agent: AgentConfig;

  if (options.agent) {
    if (!agentNames.includes(options.agent as AgentName)) {
      log.error(
        `Unknown agent "${options.agent}". Available agents: ${agentNames.join(", ")}`
      );
      process.exit(1);
    }
    agentName = options.agent as AgentName;
    agent = getAgent(agentName) as AgentConfig;
  } else {
    // Prompt for agent selection
    const selected = await select({
      message: "Which AI agent are you removing hints from?",
      options: Object.entries(agents).map(([key, config]) => ({
        value: key,
        label: config.name,
        hint: config.description,
      })),
    });

    if (isCancel(selected)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    agentName = selected as AgentName;
    agent = getAgent(agentName) as AgentConfig;
  }

  log.info(
    `Removing ${pluralize(hintPaths.length, "hint", "hints")} from ${pc.cyan(agent.name)}`
  );

  // Process each hint
  for (const hintPath of hintPaths) {
    s.start(`Removing ${pc.cyan(hintPath)}...`);
    const resolvedPath = resolveAgentPath(agent, hintPath);
    const absolutePath = resolvePath(resolvedPath, cwd);

    if (agent.appendMode) {
      // Read existing file and remove section
      const existing = await readFile(absolutePath);

      if (!existing) {
        s.stop(`No hints file found at ${resolvedPath}`);
        continue;
      }

      const section = extractSection(existing, hintPath);
      if (!section) {
        s.stop(`No hints found for ${hintPath} in ${resolvedPath}`);
        continue;
      }

      const updated = removeSection(existing, hintPath);

      if (updated.trim().length === 0) {
        // File is empty after removal, delete it
        await deleteFile(absolutePath);
        s.stop(
          `Removed ${pc.cyan(hintPath)} ${pluralize(1, "hint", "hints")} (deleted empty file)`
        );
      } else {
        await writeFile(absolutePath, updated);
        s.stop(
          `Removed ${pc.cyan(hintPath)} ${pluralize(1, "hint", "hints")} from ${pc.dim(resolvedPath)}`
        );
      }
    } else {
      // Delete the file directly (separate file per hint)
      const exists = await fileExists(absolutePath);

      if (!exists) {
        s.stop(`No hints file found at ${resolvedPath}`);
        continue;
      }

      await deleteFile(absolutePath);
      s.stop(
        `Removed ${pc.cyan(hintPath)} ${pluralize(1, "hint", "hints")} (${pc.dim(resolvedPath)})`
      );
    }
  }

  log.success("Done!");
}
