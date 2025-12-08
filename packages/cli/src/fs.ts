/**
 * File system utilities for reading and writing agent hints.
 */

import {
  access,
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  mkdir,
  unlink,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

/**
 * Ensures a directory exists, creating it if necessary.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Checks if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * Reads a file's content, returning null if it doesn't exist.
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fsReadFile(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Writes content to a file, creating directories as needed.
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  const dir = dirname(filePath);
  await ensureDir(dir);
  await fsWriteFile(filePath, content, "utf-8");
}

/**
 * Appends content to a file, creating it if it doesn't exist.
 */
export async function appendFile(
  filePath: string,
  content: string
): Promise<void> {
  const dir = dirname(filePath);
  await ensureDir(dir);

  const existing = await readFile(filePath);
  if (existing) {
    await fsWriteFile(filePath, `${existing.trim()}\n\n${content}`, "utf-8");
  } else {
    await fsWriteFile(filePath, content, "utf-8");
  }
}

/**
 * Deletes a file if it exists.
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * Resolves a path relative to the current working directory.
 * Throws if the resolved path escapes the working directory (path traversal protection).
 */
export function resolvePath(relativePath: string, cwd?: string): string {
  const baseDir = resolve(cwd ?? process.cwd());
  const resolved = resolve(baseDir, relativePath);

  if (!resolved.startsWith(baseDir + sep) && resolved !== baseDir) {
    throw new Error(
      `Path "${relativePath}" resolves outside the working directory`
    );
  }

  return resolved;
}

/**
 * Gets the relative path from cwd for display purposes.
 */
export function getRelativePath(absolutePath: string, cwd?: string): string {
  return relative(cwd ?? process.cwd(), absolutePath);
}
