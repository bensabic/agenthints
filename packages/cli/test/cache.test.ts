import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import {
  type CacheEntry,
  clearCache,
  getCacheDir,
  getCachePath,
  HINT_TTL_MS,
  INDEX_TTL_MS,
  invalidateCache,
  isExpired,
  readCache,
  writeCache,
} from "../src/cache";
import type { HintMetadata, RegistryIndex } from "../src/registry";

vi.mock("node:fs/promises");
vi.mock("node:os");

const mockTmpdir = tmpdir as unknown as MockInstance;
const mockReadFile = readFile as unknown as MockInstance;
const mockWriteFile = writeFile as unknown as MockInstance;
const mockMkdir = mkdir as unknown as MockInstance;
const mockRm = rm as unknown as MockInstance;

describe("cache", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockTmpdir.mockReturnValue("/tmp");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getCacheDir", () => {
    it("returns path in OS temp directory", () => {
      mockTmpdir.mockReturnValue("/tmp");
      expect(getCacheDir()).toBe("/tmp/agenthints-cache");
    });

    it("works with different OS temp directories", () => {
      mockTmpdir.mockReturnValue("/var/folders/abc");
      expect(getCacheDir()).toBe("/var/folders/abc/agenthints-cache");
    });
  });

  describe("getCachePath", () => {
    it("returns correct path for simple key", () => {
      const path = getCachePath("index");
      expect(path).toBe("/tmp/agenthints-cache/index.json");
    });

    it("handles nested keys", () => {
      const path = getCachePath("hints/prisma/meta");
      expect(path).toBe("/tmp/agenthints-cache/hints/prisma/meta.json");
    });

    it("handles deeply nested keys", () => {
      const path = getCachePath("hints/my-org/my-hint/content");
      expect(path).toBe(
        "/tmp/agenthints-cache/hints/my-org/my-hint/content.json"
      );
    });
  });

  describe("readCache", () => {
    it("returns null when cache file does not exist", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const result = await readCache("index");

      expect(result).toBeNull();
    });

    it("returns parsed data when cache exists", async () => {
      const cacheEntry = {
        data: { hints: [{ path: "prisma", name: "Prisma" }] },
        timestamp: 1_700_000_000_000,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await readCache<{
        hints: { path: string; name: string }[];
      }>("index");

      expect(result).toEqual(cacheEntry);
    });

    it("returns null on parse error (corrupted cache)", async () => {
      mockReadFile.mockResolvedValue("not valid json {{{");

      const result = await readCache("index");

      expect(result).toBeNull();
    });

    it("includes sha256 when present in cache", async () => {
      const cacheEntry = {
        data: "hint content",
        timestamp: 1_700_000_000_000,
        sha256: "abc123def456",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await readCache<string>("hints/prisma/content");

      expect(result?.sha256).toBe("abc123def456");
    });
  });

  describe("writeCache", () => {
    it("creates cache directory if needed", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000);

      await writeCache("index", { hints: [] });

      expect(mockMkdir).toHaveBeenCalledWith("/tmp/agenthints-cache", {
        recursive: true,
      });
    });

    it("writes JSON with timestamp", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000);

      await writeCache("index", { hints: [] });

      expect(mockWriteFile).toHaveBeenCalledWith(
        "/tmp/agenthints-cache/index.json",
        JSON.stringify({
          data: { hints: [] },
          timestamp: 1_700_000_000_000,
        })
      );
    });

    it("includes sha256 when provided", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000);

      await writeCache("hints/prisma/content", "hint content", "abc123");

      expect(mockWriteFile).toHaveBeenCalledWith(
        "/tmp/agenthints-cache/hints/prisma/content.json",
        JSON.stringify({
          data: "hint content",
          timestamp: 1_700_000_000_000,
          sha256: "abc123",
        })
      );
    });

    it("creates nested directories for nested keys", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000);

      await writeCache("hints/prisma/meta", { name: "Prisma" });

      expect(mockMkdir).toHaveBeenCalledWith(
        "/tmp/agenthints-cache/hints/prisma",
        { recursive: true }
      );
    });
  });

  describe("isExpired", () => {
    it("returns false when within TTL", () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_060_000); // 1 minute after timestamp

      const result = isExpired(1_700_000_000_000, INDEX_TTL_MS);

      expect(result).toBe(false);
    });

    it("returns true when past TTL", () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_400_000); // 6.67 minutes after timestamp

      const result = isExpired(1_700_000_000_000, INDEX_TTL_MS);

      expect(result).toBe(true);
    });

    it("returns true exactly at TTL boundary", () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + INDEX_TTL_MS);

      const result = isExpired(1_700_000_000_000, INDEX_TTL_MS);

      expect(result).toBe(true);
    });

    it("works with hint TTL (24 hours)", () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + 23 * 60 * 60 * 1000); // 23 hours

      expect(isExpired(1_700_000_000_000, HINT_TTL_MS)).toBe(false);

      vi.setSystemTime(1_700_000_000_000 + 25 * 60 * 60 * 1000); // 25 hours
      expect(isExpired(1_700_000_000_000, HINT_TTL_MS)).toBe(true);
    });
  });

  describe("invalidateCache", () => {
    it("succeeds even if file does not exist", async () => {
      // invalidateCache catches all errors, so even if unlink fails, it should resolve
      await expect(invalidateCache("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("clearCache", () => {
    it("removes entire cache directory", async () => {
      mockRm.mockResolvedValue(undefined);

      await clearCache();

      expect(mockRm).toHaveBeenCalledWith("/tmp/agenthints-cache", {
        recursive: true,
        force: true,
      });
    });

    it("succeeds even if directory does not exist", async () => {
      mockRm.mockRejectedValue(new Error("ENOENT"));

      await expect(clearCache()).resolves.toBeUndefined();
    });
  });

  describe("TTL constants", () => {
    it("INDEX_TTL_MS is 5 minutes", () => {
      expect(INDEX_TTL_MS).toBe(5 * 60 * 1000);
    });

    it("HINT_TTL_MS is 24 hours", () => {
      expect(HINT_TTL_MS).toBe(24 * 60 * 60 * 1000);
    });
  });
});

describe("registry with cache", () => {
  const mockIndex: RegistryIndex = {
    hints: [
      {
        path: "prisma",
        name: "Prisma",
        description: "Prisma ORM hints",
        category: "database",
        tags: ["orm", "database"],
        sha256: "abc123",
      },
    ],
  };

  const mockMetadata: HintMetadata = {
    name: "Prisma",
    description: "Prisma ORM hints",
    version: 1,
    category: "database",
    tags: ["orm"],
    hint: "./hint.md",
  };

  const mockHintContent = "# Prisma Hint\n\nSome content here.";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    mockTmpdir.mockReturnValue("/tmp");
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetchRegistryIndex", () => {
    it("fetches from network on cache miss", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      } as Response);

      const { fetchRegistryIndex } = await import("../src/registry");
      const result = await fetchRegistryIndex();

      expect(result).toEqual(mockIndex);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://agenthints.tech/registry/index.json"
      );
    });

    it("returns cached data when valid", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_060_000); // 1 minute after cache timestamp

      const cacheEntry: CacheEntry<RegistryIndex> = {
        data: mockIndex,
        timestamp: 1_700_000_000_000,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));

      const { fetchRegistryIndex } = await import("../src/registry");
      const result = await fetchRegistryIndex();

      expect(result).toEqual(mockIndex);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("fetches from network when cache expired", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_400_000); // 6.67 minutes after cache timestamp (past 5 min TTL)

      const cacheEntry: CacheEntry<RegistryIndex> = {
        data: mockIndex,
        timestamp: 1_700_000_000_000,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      } as Response);

      const { fetchRegistryIndex } = await import("../src/registry");
      const result = await fetchRegistryIndex();

      expect(result).toEqual(mockIndex);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("fetchHintMetadata", () => {
    it("fetches from network on cache miss", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetadata),
      } as Response);

      const { fetchHintMetadata } = await import("../src/registry");
      const result = await fetchHintMetadata("prisma");

      expect(result).toEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://agenthints.tech/registry/hints/prisma/meta.json"
      );
    });

    it("returns cached data when valid", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + 12 * 60 * 60 * 1000); // 12 hours later

      const cacheEntry: CacheEntry<HintMetadata> = {
        data: mockMetadata,
        timestamp: 1_700_000_000_000,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));

      const { fetchHintMetadata } = await import("../src/registry");
      const result = await fetchHintMetadata("prisma");

      expect(result).toEqual(mockMetadata);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("fetches from network when cache expired", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + 25 * 60 * 60 * 1000); // 25 hours later

      const cacheEntry: CacheEntry<HintMetadata> = {
        data: mockMetadata,
        timestamp: 1_700_000_000_000,
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetadata),
      } as Response);

      const { fetchHintMetadata } = await import("../src/registry");
      const result = await fetchHintMetadata("prisma");

      expect(result).toEqual(mockMetadata);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("fetchHintContent", () => {
    it("fetches from network on cache miss", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHintContent),
      } as Response);

      const { fetchHintContent } = await import("../src/registry");
      const result = await fetchHintContent("prisma", "./hint.md", "abc123");

      expect(result).toBe(mockHintContent);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://agenthints.tech/registry/hints/prisma/hint.md"
      );
    });

    it("returns cached data when SHA matches and not expired", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + 12 * 60 * 60 * 1000); // 12 hours later

      const cacheEntry: CacheEntry<string> = {
        data: mockHintContent,
        timestamp: 1_700_000_000_000,
        sha256: "abc123",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));

      const { fetchHintContent } = await import("../src/registry");
      const result = await fetchHintContent("prisma", "./hint.md", "abc123");

      expect(result).toBe(mockHintContent);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("fetches from network when SHA does not match", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + 1 * 60 * 60 * 1000); // 1 hour later (not expired)

      const cacheEntry: CacheEntry<string> = {
        data: "old content",
        timestamp: 1_700_000_000_000,
        sha256: "old-sha",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHintContent),
      } as Response);

      const { fetchHintContent } = await import("../src/registry");
      const result = await fetchHintContent("prisma", "./hint.md", "new-sha");

      expect(result).toBe(mockHintContent);
      expect(global.fetch).toHaveBeenCalled();
    });

    it("fetches from network when cache expired (even if SHA matches)", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + 25 * 60 * 60 * 1000); // 25 hours later

      const cacheEntry: CacheEntry<string> = {
        data: mockHintContent,
        timestamp: 1_700_000_000_000,
        sha256: "abc123",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHintContent),
      } as Response);

      const { fetchHintContent } = await import("../src/registry");
      const result = await fetchHintContent("prisma", "./hint.md", "abc123");

      expect(result).toBe(mockHintContent);
      expect(global.fetch).toHaveBeenCalled();
    });

    it("returns cached data when no expectedSha256 provided", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_700_000_000_000 + 12 * 60 * 60 * 1000); // 12 hours later

      const cacheEntry: CacheEntry<string> = {
        data: mockHintContent,
        timestamp: 1_700_000_000_000,
        sha256: "abc123",
      };
      mockReadFile.mockResolvedValue(JSON.stringify(cacheEntry));

      const { fetchHintContent } = await import("../src/registry");
      const result = await fetchHintContent("prisma", "./hint.md");

      expect(result).toBe(mockHintContent);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
