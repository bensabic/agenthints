/**
 * Registry client for fetching agent hints from the remote registry.
 */

const REGISTRY_BASE_URL = "https://agenthints.tech/registry";
const CACHE_TTL_MS = 60_000;

let cachedIndex: RegistryIndex | null = null;
let cacheTimestamp = 0;

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
  const now = Date.now();

  if (cachedIndex && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedIndex;
  }

  const response = await fetch(`${REGISTRY_BASE_URL}/index.json`);

  if (!response.ok) {
    throw new Error(`Failed to fetch registry index: ${response.statusText}`);
  }

  const parsed = (await response.json()) as RegistryIndex;
  cachedIndex = parsed;
  cacheTimestamp = now;

  return parsed;
}

export async function fetchHintMetadata(
  hintPath: string
): Promise<HintMetadata> {
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

  return response.json() as Promise<HintMetadata>;
}

export async function fetchHintContent(
  hintPath: string,
  hintFile: string
): Promise<string> {
  const filePath = hintFile.replace("./", "");
  const response = await fetch(
    `${REGISTRY_BASE_URL}/hints/${hintPath}/${filePath}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch hint content: ${response.statusText}`);
  }

  return response.text();
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
