/**
 * Interactive hint creation wizard.
 *
 * Creates a new hint folder with meta.json and hint.md template.
 *
 * Run with: pnpm create-hint
 */

import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = resolve(__dirname, "../public/registry");
const HINTS_DIR = join(REGISTRY_DIR, "hints");
const SCHEMA_PATH = join(REGISTRY_DIR, "meta.schema.json");

const DESCRIPTION_MAX_LENGTH = 100;
const GITHUB_URL_REGEX = /github\.com[:/]([^/]+)/;
const USERNAME_REGEX = /^[a-zA-Z0-9-]+$/;

function nameToFolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadCategoriesFromSchema(): Promise<string[]> {
  try {
    const content = await readFile(SCHEMA_PATH, "utf-8");
    const schema = JSON.parse(content);
    const categories = schema.properties?.category?.enum;
    if (Array.isArray(categories) && categories.length > 0) {
      return categories;
    }
  } catch {
    // Fall through to defaults
  }

  // Fallback if schema doesn't have categories
  return [
    "code-quality",
    "database",
    "framework",
    "api",
    "auth",
    "ui",
    "testing",
    "utils",
    "other",
  ];
}

function getGitUsername(): string | undefined {
  try {
    const username = execFileSync("git", ["config", "user.name"], {
      encoding: "utf-8",
    }).trim();
    return username.toLowerCase().replace(/\s+/g, "-");
  } catch {
    return;
  }
}

function getGitHubUsername(): string | undefined {
  try {
    const remoteUrl = execFileSync(
      "git",
      ["config", "--get", "remote.origin.url"],
      {
        encoding: "utf-8",
      }
    ).trim();
    const match = remoteUrl.match(GITHUB_URL_REGEX);
    return match?.[1];
  } catch {
    return;
  }
}

async function hintExists(name: string): Promise<boolean> {
  try {
    await access(join(HINTS_DIR, name));
    return true;
  } catch {
    return false;
  }
}

function generateMetaJson(data: {
  name: string;
  description: string;
  submitter: string;
  category: string;
  tags: string[];
}): string {
  const meta = {
    $schema: "../../meta.schema.json",
    name: data.name,
    description: data.description,
    version: 1,
    submitter: data.submitter,
    category: data.category,
    tags: data.tags,
    hint: "./hint.md",
  };

  return `${JSON.stringify(meta, null, 2)}\n`;
}

function generateHintMd(name: string): string {
  const folderName = nameToFolderName(name);
  return `# ${name}

<!-- Brief description of what this tool/library does -->

## Commands

<!-- List the main commands AI agents should know about -->

- \`npx ${folderName} command\` - Description

## Rules

<!-- Numbered rules that AI agents should follow -->

1. **Rule title** - Explanation of the rule.

2. **Another rule** - More details.

## Common Patterns

<!-- Show code examples of correct usage -->

\`\`\`typescript
// Example usage
\`\`\`

## Common Issues

<!-- List common mistakes and how to avoid them -->

- Issue description and how to fix it.
`;
}

async function create(): Promise<void> {
  console.log();
  intro(pc.bgCyan(pc.black(" create-hint ")));

  // Load categories from schema
  const categories = await loadCategoriesFromSchema();

  // Get name
  let name: string;
  let folderName: string;

  while (true) {
    const nameInput = await text({
      message: "Package name",
      placeholder: "My Package",
      validate: (value) => {
        if (!value) {
          return "Name is required";
        }
        const folder = nameToFolderName(value);
        if (!folder) {
          return "Name must contain at least one letter or number";
        }
        return;
      },
    });

    if (isCancel(nameInput)) {
      cancel("Cancelled.");
      process.exit(0);
    }

    name = nameInput;
    folderName = nameToFolderName(name);

    if (await hintExists(folderName)) {
      log.warn(`Hint "${folderName}" already exists. Try a different name.`);
      continue;
    }

    break;
  }

  // Get description
  const description = await text({
    message: `Short description (max ${DESCRIPTION_MAX_LENGTH} chars)`,
    placeholder: "A brief description of what this package does",
    validate: (value) => {
      if (!value) {
        return "Description is required";
      }
      if (value.length > DESCRIPTION_MAX_LENGTH) {
        return `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less (currently ${value.length})`;
      }
      return;
    },
  });

  if (isCancel(description)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  // Get submitter
  const gitUsername = getGitHubUsername() || getGitUsername();
  const submitter = await text({
    message: "Your GitHub username",
    placeholder: "username",
    initialValue: gitUsername || "",
    validate: (value) => {
      if (!value) {
        return "Username is required";
      }
      if (!USERNAME_REGEX.test(value)) {
        return "Invalid username format";
      }
      return;
    },
  });

  if (isCancel(submitter)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  // Get category
  const category = await select({
    message: "Category",
    options: categories.map((cat) => ({ value: cat, label: cat })),
  });

  if (isCancel(category)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  // Get tags
  const tagsInput = await text({
    message: "Tags (comma-separated)",
    placeholder: "typescript, linting, formatting",
    validate: (value) => {
      if (!value) {
        return "At least one tag is required";
      }
      const parsed = value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      if (parsed.length === 0) {
        return "At least one valid tag is required";
      }
      return;
    },
  });

  if (isCancel(tagsInput)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  // Confirm
  log.info(`\nCreating hint: ${pc.cyan(folderName)}`);
  log.info(`  Name: ${name}`);
  log.info(`  Description: ${description}`);
  log.info(`  Submitter: ${submitter}`);
  log.info(`  Category: ${category}`);
  log.info(`  Tags: ${tags.join(", ")}`);

  const confirmed = await confirm({
    message: `Create a hint for ${pc.cyan(folderName)}?`,
    initialValue: true,
  });

  if (isCancel(confirmed) || !confirmed) {
    cancel("Cancelled.");
    process.exit(0);
  }

  const s = spinner();
  s.start("Creating hint files...");

  const hintDir = join(HINTS_DIR, folderName);

  await mkdir(hintDir, { recursive: true });

  await writeFile(
    join(hintDir, "meta.json"),
    generateMetaJson({
      name,
      description,
      submitter,
      category: category as string,
      tags,
    }),
    "utf-8"
  );

  await writeFile(join(hintDir, "hint.md"), generateHintMd(name), "utf-8");

  s.stop("Hint files created!");

  log.success(`\nCreated ${pc.cyan(`public/registry/hints/${folderName}/`)}`);
  log.info(`  ${pc.dim("├──")} meta.json`);
  log.info(`  ${pc.dim("└──")} hint.md`);
  log.info("\nNext steps:");
  log.info(`  1. Edit ${pc.cyan("hint.md")} with your content`);
  log.info(
    `  2. Run ${pc.cyan(`pnpm validate-hints ${folderName}`)} to validate`
  );
  log.info("  3. Submit a PR with the template");

  outro("Done!");
}

create().catch((error) => {
  console.error("Failed to create hint:", error);
  process.exit(1);
});
