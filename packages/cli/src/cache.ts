/**
 * Disk caching utilities for reducing network requests.
 * Cache files are stored in the OS temp directory.
 */

import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const INDEX_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const HINT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  sha256?: string;
};

/**
 * Returns the cache directory path in the OS temp directory.
 */
export function getCacheDir(): string {
  return join(tmpdir(), "agenthints-cache");
}

/**
 * Returns the full path for a cache key.
 * Keys can be nested (e.g., "hints/foo/meta").
 */
export function getCachePath(key: string): string {
  return join(getCacheDir(), `${key}.json`);
}

/**
 * Reads a cache entry from disk.
 * Returns null if the cache file doesn't exist or is corrupted.
 */
export async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  const cachePath = getCachePath(key);
  try {
    const content = await readFile(cachePath, "utf-8");
    return JSON.parse(content) as CacheEntry<T>;
  } catch {
    return null;
  }
}

/**
 * Writes a cache entry to disk.
 * Creates the cache directory and any nested directories if needed.
 */
export async function writeCache<T>(
  key: string,
  data: T,
  sha256?: string
): Promise<void> {
  const cachePath = getCachePath(key);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ...(sha256 && { sha256 }),
  };

  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(entry));
}

/**
 * Checks if a cache entry has expired based on the given TTL.
 */
export function isExpired(timestamp: number, ttlMs: number): boolean {
  return Date.now() - timestamp >= ttlMs;
}

/**
 * Deletes a specific cache entry.
 * Succeeds silently if the file doesn't exist.
 */
export async function invalidateCache(key: string): Promise<void> {
  const cachePath = getCachePath(key);
  try {
    await unlink(cachePath);
  } catch {
    // Ignore errors (file may not exist)
  }
}

/**
 * Clears the entire cache directory.
 * Succeeds silently if the directory doesn't exist.
 */
export async function clearCache(): Promise<void> {
  try {
    await rm(getCacheDir(), { recursive: true, force: true });
  } catch {
    // Ignore errors (directory may not exist)
  }
}
