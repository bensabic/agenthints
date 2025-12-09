/**
 * Add command - adds agent hints for specified hints.
 */

import { createHash } from "node:crypto";
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
import { readFile, resolvePath, writeFile } from "../fs";
import {
  fetchHintContent,
  fetchHintMetadata,
  fetchRegistryIndex,
} from "../registry";
import {
  type TransformResult,
  transformForAgent,
  upsertSection,
} from "../transformer";
import { pluralize } from "../utils";

async function writeHintToFile(
  absolutePath: string,
  hintPath: string,
  transformed: TransformResult
): Promise<{ success: boolean; error?: string }> {
  try {
    if (transformed.appendMode) {
      const existing = (await readFile(absolutePath)) || "";
      const updated = upsertSection(existing, hintPath, transformed.content);
      await writeFile(absolutePath, updated);
    } else {
      await writeFile(absolutePath, transformed.content);
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type AddOptions = {
  agent?: string;
  cwd?: string;
  yes?: boolean;
};

async function resolveAgentSelection(
  options: AddOptions
): Promise<AgentConfig> {
  if (options.agent) {
    if (!agentNames.includes(options.agent as AgentName)) {
      log.error(
        `Unknown agent "${options.agent}". Available agents: ${agentNames.join(", ")}`
      );
      process.exit(1);
    }
    const agentName = options.agent as AgentName;
    return getAgent(agentName) as AgentConfig;
  }

  if (options.yes) {
    log.error(
      "--yes requires specifying an agent with --agent to avoid prompts."
    );
    process.exit(1);
  }

  const selected = await select({
    message: "Which AI agent are you using?",
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

  const agentName = selected as AgentName;
  return getAgent(agentName) as AgentConfig;
}

export async function add(
  hintPaths: string[],
  options: AddOptions
): Promise<void> {
  const s = spinner();
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();

  const agent = await resolveAgentSelection(options);

  log.info(
    `Adding ${pluralize(hintPaths.length, "hint", "hints")} for ${pc.cyan(agent.name)}`
  );

  // Fetch registry index once
  let registryHints: Map<string, string>; // path -> sha256
  try {
    const index = await fetchRegistryIndex();
    registryHints = new Map(index.hints.map((h) => [h.path, h.sha256]));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Failed to fetch registry index: ${message}`);
    process.exit(1);
  }

  // Process all hints in parallel
  const fetchPromises = hintPaths.map(async (hintPath) => {
    // Check if hint exists
    const expectedHash = registryHints.get(hintPath);
    if (!expectedHash) {
      return {
        hintPath,
        status: "error" as const,
        message: `Hint "${hintPath}" not found in registry.`,
      };
    }

    try {
      const metadata = await fetchHintMetadata(hintPath);
      const hintContent = await fetchHintContent(
        hintPath,
        metadata.hint,
        expectedHash
      );

      // Verify integrity
      const actualHash = createHash("sha256").update(hintContent).digest("hex");
      if (actualHash !== expectedHash) {
        return {
          hintPath,
          status: "error" as const,
          message: `Integrity check failed! The content hash (${actualHash.slice(0, 8)}) does not match the registry (${expectedHash.slice(0, 8)}).`,
        };
      }

      return {
        hintPath,
        status: "success" as const,
        metadata,
        hintContent,
      };
    } catch (error) {
      return {
        hintPath,
        status: "error" as const,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  s.start(`Fetching ${pluralize(hintPaths.length, "hint", "hints")}...`);
  const results = await Promise.all(fetchPromises);
  s.stop(`Fetched ${pluralize(hintPaths.length, "hint", "hints")}.`);

  // Process results sequentially to ensure file integrity (especially for append mode)
  let successCount = 0;
  let failureCount = 0;

  for (const result of results) {
    if (result.status === "error") {
      log.error(`Failed to add ${pc.cyan(result.hintPath)}: ${result.message}`);
      failureCount += 1;
      continue;
    }

    const { hintPath, hintContent } = result;

    // Transform for the target agent
    const resolvedPath = resolveAgentPath(agent, hintPath);
    const absolutePath = resolvePath(resolvedPath, cwd);
    const transformed = transformForAgent(
      hintContent,
      hintPath,
      agent,
      resolvedPath
    );

    // Write or append the hints
    const writeResult = await writeHintToFile(
      absolutePath,
      hintPath,
      transformed
    );
    if (!writeResult.success) {
      log.error(`Failed to write ${pc.cyan(hintPath)}: ${writeResult.error}`);
      failureCount += 1;
      continue;
    }

    log.step(`Added ${pc.cyan(hintPath)} to ${pc.dim(resolvedPath)}`);
    successCount += 1;
  }

  if (successCount === 0) {
    log.error("Failed to add any hints.");
    process.exit(1);
  } else if (failureCount > 0) {
    log.warn(`Added ${successCount} of ${hintPaths.length} hints.`);
  } else {
    log.success("Done!");
  }
}
