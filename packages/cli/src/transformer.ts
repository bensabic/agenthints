/**
 * Transforms raw hints content into agent-specific formats.
 */

import { type AgentConfig, resolveAgentHeader } from "./agents";

export type TransformResult = {
  content: string;
  path: string;
  appendMode: boolean;
};

/**
 * Wraps content in a section marker for append-mode files.
 * This allows us to update/remove specific hints later.
 */
function wrapInSection(content: string, hintName: string): string {
  const sectionStart = `<!-- agenthints:${hintName}:start -->`;
  const sectionEnd = `<!-- agenthints:${hintName}:end -->`;

  return `${sectionStart}\n${content}\n${sectionEnd}`;
}

/**
 * Transforms hints content for a specific agent.
 */
export function transformForAgent(
  content: string,
  hintName: string,
  agent: AgentConfig,
  resolvedPath: string
): TransformResult {
  let transformedContent = content;

  // Apply agent-specific header if present
  const header = resolveAgentHeader(agent, hintName);
  if (header) {
    transformedContent = `${header}\n\n${transformedContent}`;
  }

  // Apply custom transform if present
  if (agent.transform) {
    transformedContent = agent.transform(transformedContent, hintName);
  }

  // Wrap in section markers for append-mode files
  if (agent.appendMode) {
    transformedContent = wrapInSection(transformedContent, hintName);
  }

  return {
    content: transformedContent,
    path: resolvedPath,
    appendMode: agent.appendMode,
  };
}

/**
 * Extracts a section from an existing file by hint name.
 * Returns null if section doesn't exist.
 */
export function extractSection(
  fileContent: string,
  hintName: string
): string | null {
  const sectionStart = `<!-- agenthints:${hintName}:start -->`;
  const sectionEnd = `<!-- agenthints:${hintName}:end -->`;

  const startIndex = fileContent.indexOf(sectionStart);
  const endIndex = fileContent.indexOf(sectionEnd);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return null;
  }

  return fileContent.slice(startIndex, endIndex + sectionEnd.length);
}

/**
 * Removes a section from an existing file by hint name.
 */
export function removeSection(fileContent: string, hintName: string): string {
  const section = extractSection(fileContent, hintName);
  if (!section) {
    return fileContent;
  }

  // Remove the section and any trailing newlines
  return fileContent
    .replace(section, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Updates or appends a section in an existing file.
 */
export function upsertSection(
  fileContent: string,
  hintName: string,
  newSection: string
): string {
  const existingSection = extractSection(fileContent, hintName);

  if (existingSection) {
    // Replace existing section
    return fileContent.replace(existingSection, newSection);
  }

  // Append new section
  const trimmedContent = fileContent.trim();
  if (trimmedContent.length === 0) {
    return newSection;
  }

  return `${trimmedContent}\n\n${newSection}`;
}
