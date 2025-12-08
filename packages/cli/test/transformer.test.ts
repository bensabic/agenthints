import { describe, expect, it } from "vitest";
import type { AgentConfig } from "../src/agents";
import {
  extractSection,
  removeSection,
  transformForAgent,
  upsertSection,
} from "../src/transformer";

const mockAgent: AgentConfig = {
  name: "Test Agent",
  description: "A test agent",
  path: ".test/rules/{hint}.md",
  appendMode: false,
};

const mockAppendAgent: AgentConfig = {
  name: "Test Append Agent",
  description: "A test agent with append mode",
  path: ".test/RULES.md",
  appendMode: true,
};

const mockAgentWithHeader: AgentConfig = {
  name: "Test Agent with Header",
  description: "A test agent with a static header",
  path: ".test/rules/{hint}.md",
  header: "---\ntype: hint\n---",
  appendMode: false,
};

const mockAgentWithDynamicHeader: AgentConfig = {
  name: "Test Agent with Dynamic Header",
  description: "A test agent with a dynamic header",
  path: ".test/rules/{hint}.md",
  header: (hintName) => `---\ndescription: ${hintName} hints\n---`,
  appendMode: false,
};

describe("transformForAgent", () => {
  it("returns content unchanged for basic agent", () => {
    const content = "# Test Hint\n\nSome content here.";
    const result = transformForAgent(
      content,
      "example-hint",
      mockAgent,
      ".test/rules/example-hint.md"
    );

    expect(result.content).toBe(content);
    expect(result.path).toBe(".test/rules/example-hint.md");
    expect(result.appendMode).toBe(false);
  });

  it("wraps content in section markers for append mode", () => {
    const content = "# Test Hint\n\nSome content here.";
    const result = transformForAgent(
      content,
      "example-hint",
      mockAppendAgent,
      ".test/RULES.md"
    );

    expect(result.content).toBe(
      "<!-- agenthints:example-hint:start -->\n# Test Hint\n\nSome content here.\n<!-- agenthints:example-hint:end -->"
    );
    expect(result.appendMode).toBe(true);
  });

  it("prepends static header when provided", () => {
    const content = "# Test Hint";
    const result = transformForAgent(
      content,
      "example-hint",
      mockAgentWithHeader,
      ".test/rules/example-hint.md"
    );

    expect(result.content).toBe("---\ntype: hint\n---\n\n# Test Hint");
  });

  it("prepends dynamic header when provided", () => {
    const content = "# Test Hint";
    const result = transformForAgent(
      content,
      "prisma",
      mockAgentWithDynamicHeader,
      ".test/rules/prisma.md"
    );

    expect(result.content).toBe(
      "---\ndescription: prisma hints\n---\n\n# Test Hint"
    );
  });

  it("applies both header and section markers for append mode with header", () => {
    const agentWithBoth: AgentConfig = {
      ...mockAppendAgent,
      header: "---\ntype: hint\n---",
    };
    const content = "# Test Hint";
    const result = transformForAgent(
      content,
      "example-hint",
      agentWithBoth,
      ".test/RULES.md"
    );

    expect(result.content).toBe(
      "<!-- agenthints:example-hint:start -->\n---\ntype: hint\n---\n\n# Test Hint\n<!-- agenthints:example-hint:end -->"
    );
  });
});

describe("extractSection", () => {
  it("extracts existing section", () => {
    const fileContent = `# Rules

<!-- agenthints:example-hint:start -->
# Example Hint
Some content.
<!-- agenthints:example-hint:end -->

<!-- agenthints:prisma:start -->
# Prisma
Other content.
<!-- agenthints:prisma:end -->`;

    const result = extractSection(fileContent, "example-hint");

    expect(result).toBe(
      "<!-- agenthints:example-hint:start -->\n# Example Hint\nSome content.\n<!-- agenthints:example-hint:end -->"
    );
  });

  it("returns null when section does not exist", () => {
    const fileContent = `# Rules

<!-- agenthints:example-hint:start -->
# Example Hint
Some content.
<!-- agenthints:example-hint:end -->`;

    const result = extractSection(fileContent, "prisma");

    expect(result).toBeNull();
  });

  it("returns null for empty file", () => {
    const result = extractSection("", "example-hint");

    expect(result).toBeNull();
  });

  it("returns null when only start marker exists", () => {
    const fileContent = "<!-- agenthints:example-hint:start -->\n# Incomplete";
    const result = extractSection(fileContent, "example-hint");

    expect(result).toBeNull();
  });

  it("returns null when only end marker exists", () => {
    const fileContent = "# Incomplete\n<!-- agenthints:example-hint:end -->";
    const result = extractSection(fileContent, "example-hint");

    expect(result).toBeNull();
  });
});

describe("removeSection", () => {
  it("removes existing section", () => {
    const fileContent = `# Rules

<!-- agenthints:example-hint:start -->
# Example Hint
Some content.
<!-- agenthints:example-hint:end -->

More content below.`;

    const result = removeSection(fileContent, "example-hint");

    expect(result).toBe("# Rules\n\nMore content below.");
  });

  it("removes section and cleans up excess newlines", () => {
    const fileContent = `# Rules


<!-- agenthints:example-hint:start -->
# Example Hint
<!-- agenthints:example-hint:end -->



More content.`;

    const result = removeSection(fileContent, "example-hint");

    expect(result).not.toContain("\n\n\n");
  });

  it("returns original content when section does not exist", () => {
    const fileContent = "# Rules\n\nSome content.";
    const result = removeSection(fileContent, "example-hint");

    expect(result).toBe(fileContent);
  });

  it("removes one section while keeping others", () => {
    const fileContent = `<!-- agenthints:example-hint:start -->
# Example Hint
<!-- agenthints:example-hint:end -->

<!-- agenthints:prisma:start -->
# Prisma
<!-- agenthints:prisma:end -->`;

    const result = removeSection(fileContent, "example-hint");

    expect(result).toContain("<!-- agenthints:prisma:start -->");
    expect(result).toContain("# Prisma");
    expect(result).not.toContain("example-hint");
  });

  it("handles file with only one section", () => {
    const fileContent = `<!-- agenthints:example-hint:start -->
# Example Hint
<!-- agenthints:example-hint:end -->`;

    const result = removeSection(fileContent, "example-hint");

    expect(result).toBe("");
  });
});

describe("upsertSection", () => {
  it("appends section to empty file", () => {
    const newSection =
      "<!-- agenthints:example-hint:start -->\n# Example Hint\n<!-- agenthints:example-hint:end -->";
    const result = upsertSection("", "example-hint", newSection);

    expect(result).toBe(newSection);
  });

  it("appends section to file with existing content", () => {
    const fileContent = "# Rules\n\nSome existing content.";
    const newSection =
      "<!-- agenthints:example-hint:start -->\n# Example Hint\n<!-- agenthints:example-hint:end -->";

    const result = upsertSection(fileContent, "example-hint", newSection);

    expect(result).toBe(
      "# Rules\n\nSome existing content.\n\n<!-- agenthints:example-hint:start -->\n# Example Hint\n<!-- agenthints:example-hint:end -->"
    );
  });

  it("updates existing section", () => {
    const fileContent = `# Rules

<!-- agenthints:example-hint:start -->
# Old Example Hint Content
<!-- agenthints:example-hint:end -->`;

    const newSection =
      "<!-- agenthints:example-hint:start -->\n# New Example Hint Content\n<!-- agenthints:example-hint:end -->";

    const result = upsertSection(fileContent, "example-hint", newSection);

    expect(result).toContain("# New Example Hint Content");
    expect(result).not.toContain("# Old Example Hint Content");
  });

  it("updates section while preserving other sections", () => {
    const fileContent = `<!-- agenthints:example-hint:start -->
# Example Hint
<!-- agenthints:example-hint:end -->

<!-- agenthints:prisma:start -->
# Prisma
<!-- agenthints:prisma:end -->`;

    const newSection =
      "<!-- agenthints:example-hint:start -->\n# Updated Example Hint\n<!-- agenthints:example-hint:end -->";

    const result = upsertSection(fileContent, "example-hint", newSection);

    expect(result).toContain("# Updated Example Hint");
    expect(result).toContain("# Prisma");
  });

  it("handles whitespace-only file as empty", () => {
    const newSection =
      "<!-- agenthints:example-hint:start -->\n# Example Hint\n<!-- agenthints:example-hint:end -->";
    const result = upsertSection("   \n\n   ", "example-hint", newSection);

    expect(result).toBe(newSection);
  });
});
