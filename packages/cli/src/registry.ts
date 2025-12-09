/**
 * Registry client for fetching agent hints from the remote registry.
 * Supports local file paths via AGENTHINTS_REGISTRY env var.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  HINT_TTL_MS,
  INDEX_TTL_MS,
  isExpired,
  readCache,
  writeCache,
} from "./cache";

const LOCAL_REGISTRY = process.env.AGENTHINTS_REGISTRY;
const REGISTRY_BASE_URL = LOCAL_REGISTRY || "https://agenthints.tech/registry";

export type IndexEntry = {
  path: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  sha256: string;
};

export type RegistryIndex = {
  hints: IndexEntry[];
};

export type HintMetadata = {
  name: string;
  description: string;
  version: number;
  submitter?: string;
  category: string;
  tags: string[];
  hint: string;
};

export async function fetchRegistryIndex(): Promise<RegistryIndex> {
  // Local registry: read from disk (no caching)
  if (LOCAL_REGISTRY) {
    const content = await readFile(
      resolve(LOCAL_REGISTRY, "index.json"),
      "utf-8"
    );
    return JSON.parse(content) as RegistryIndex;
  }

  // Remote registry: use disk cache
  const cacheKey = "index";
  const cached = await readCache<RegistryIndex>(cacheKey);

  if (cached && !isExpired(cached.timestamp, INDEX_TTL_MS)) {
    return cached.data;
  }

  const response = await fetch(`${REGISTRY_BASE_URL}/index.json`);

  if (!response.ok) {
    throw new Error(`Failed to fetch registry index: ${response.statusText}`);
  }

  const parsed = (await response.json()) as RegistryIndex;
  await writeCache(cacheKey, parsed);

  return parsed;
}

export async function fetchHintMetadata(
  hintPath: string
): Promise<HintMetadata> {
  // Local registry: read from disk (no caching)
  if (LOCAL_REGISTRY) {
    const content = await readFile(
      resolve(LOCAL_REGISTRY, `hints/${hintPath}/meta.json`),
      "utf-8"
    );
    return JSON.parse(content) as HintMetadata;
  }

  // Remote registry: use disk cache
  const cacheKey = `hints/${hintPath}/meta`;
  const cached = await readCache<HintMetadata>(cacheKey);

  if (cached && !isExpired(cached.timestamp, HINT_TTL_MS)) {
    return cached.data;
  }

  const response = await fetch(
    `${REGISTRY_BASE_URL}/hints/${hintPath}/meta.json`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Hint "${hintPath}" not found in registry. Run "agenthints list" to see available hints.`
      );
    }
    throw new Error(`Failed to fetch hint metadata: ${response.statusText}`);
  }

  const metadata = (await response.json()) as HintMetadata;
  await writeCache(cacheKey, metadata);

  return metadata;
}

export async function fetchHintContent(
  hintPath: string,
  hintFile: string,
  expectedSha256?: string
): Promise<string> {
  const filePath = hintFile.replace("./", "");

  // Local registry: read from disk (no caching)
  if (LOCAL_REGISTRY) {
    return readFile(
      resolve(LOCAL_REGISTRY, `hints/${hintPath}/${filePath}`),
      "utf-8"
    );
  }

  // Remote registry: use disk cache
  const cacheKey = `hints/${hintPath}/content`;
  const cached = await readCache<string>(cacheKey);

  // Use cache if: not expired AND (no expected SHA OR SHA matches)
  if (
    cached &&
    !isExpired(cached.timestamp, HINT_TTL_MS) &&
    (!expectedSha256 || cached.sha256 === expectedSha256)
  ) {
    return cached.data;
  }

  const response = await fetch(
    `${REGISTRY_BASE_URL}/hints/${hintPath}/${filePath}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch hint content: ${response.statusText}`);
  }

  const content = await response.text();
  await writeCache(cacheKey, content, expectedSha256);

  return content;
}

export async function searchHints(query: string): Promise<IndexEntry[]> {
  const index = await fetchRegistryIndex();
  const lowerQuery = query.toLowerCase();

  return index.hints.filter(
    (hint) =>
      hint.path.toLowerCase().includes(lowerQuery) ||
      hint.name.toLowerCase().includes(lowerQuery) ||
      hint.description.toLowerCase().includes(lowerQuery) ||
      hint.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      hint.category.toLowerCase().includes(lowerQuery)
  );
}

export async function getHintsByCategory(
  category: string
): Promise<IndexEntry[]> {
  const index = await fetchRegistryIndex();
  return index.hints.filter(
    (hint) => hint.category.toLowerCase() === category.toLowerCase()
  );
}

export async function getHintEntry(
  hintPath: string
): Promise<IndexEntry | undefined> {
  const index = await fetchRegistryIndex();
  return index.hints.find((hint) => hint.path === hintPath);
}

export async function hintExists(hintPath: string): Promise<boolean> {
  return !!(await getHintEntry(hintPath));
}
