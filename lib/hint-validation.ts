import { readFile, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import Ajv from "ajv";
import type { HintMetadata } from "./types";

const SUBMITTER_REGEX = /^[a-zA-Z0-9-]+$/;
const LEADING_DOT_SLASH_REGEX = /^\.\//;

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const schemaCache = new Map<string, object>();
const validatorCache = new Map<string, ReturnType<Ajv["compile"]>>();

async function loadSchema(schemaPath: string): Promise<object> {
  const cached = schemaCache.get(schemaPath);
  if (cached) {
    return cached;
  }
  const content = await readFile(schemaPath, "utf-8");
  const schema = JSON.parse(content) as object;
  schemaCache.set(schemaPath, schema);
  return schema;
}

function getValidator(
  schemaPath: string,
  schema: object
): ReturnType<Ajv["compile"]> {
  const cached = validatorCache.get(schemaPath);
  if (cached) {
    return cached;
  }
  const ajv = new Ajv({ allErrors: true });
  const validator = ajv.compile(schema);
  validatorCache.set(schemaPath, validator);
  return validator;
}

export async function readHintMetadata(
  hintsDir: string,
  hintPath: string
): Promise<HintMetadata> {
  const resolvedHintsDir = resolve(hintsDir);
  const hintDirectory = resolve(hintsDir, hintPath);

  // Validate hintPath stays within hintsDir (prevent path traversal)
  if (
    !hintDirectory.startsWith(resolvedHintsDir + sep) &&
    hintDirectory !== resolvedHintsDir
  ) {
    throw new Error(`Hint path resolves outside hints directory: ${hintPath}`);
  }

  const metadataPath = join(hintDirectory, "meta.json");
  const content = await readFile(metadataPath, "utf-8");
  return JSON.parse(content);
}

function resolveHintPath(
  hintsDir: string,
  hintPath: string,
  hintFile: string
): string {
  const resolvedHintsDir = resolve(hintsDir);
  const hintDirectory = resolve(hintsDir, hintPath);

  // Validate hintPath stays within hintsDir (prevent path traversal)
  if (
    !hintDirectory.startsWith(resolvedHintsDir + sep) &&
    hintDirectory !== resolvedHintsDir
  ) {
    throw new Error(`Hint path resolves outside hints directory: ${hintPath}`);
  }

  const normalizedFile = hintFile.replace(LEADING_DOT_SLASH_REGEX, "");
  const targetPath = resolve(hintDirectory, normalizedFile);

  // Validate hintFile stays within hintDirectory
  if (!targetPath.startsWith(hintDirectory + sep)) {
    throw new Error(`Hint file resolves outside its directory: ${hintFile}`);
  }

  return targetPath;
}

export function readHintContent(
  hintsDir: string,
  hintPath: string,
  hintFile: string
): Promise<string> {
  const contentPath = resolveHintPath(hintsDir, hintPath, hintFile);
  return readFile(contentPath, "utf-8");
}

export async function validateHintMetadata(
  schemaPath: string,
  metadata: HintMetadata
): Promise<ValidationResult> {
  const errors: string[] = [];

  const schema = await loadSchema(schemaPath);
  const validate = getValidator(schemaPath, schema);

  const valid = validate(metadata);
  if (!valid && validate.errors) {
    for (const schemaError of validate.errors) {
      const field = schemaError.instancePath || schemaError.keyword;
      errors.push(`${field}: ${schemaError.message}`);
    }
  }

  // Additional submitter format validation
  if (metadata.submitter && !SUBMITTER_REGEX.test(metadata.submitter)) {
    errors.push(`Invalid submitter format: ${metadata.submitter}`);
  }

  return { valid: errors.length === 0, errors };
}

export async function validateHintFileExists(
  hintsDir: string,
  hintPath: string,
  hintFile: string
): Promise<ValidationResult> {
  let hintFilePath: string;

  try {
    hintFilePath = resolveHintPath(hintsDir, hintPath, hintFile);
  } catch (error) {
    return {
      valid: false,
      errors: [
        error instanceof Error
          ? error.message
          : `Invalid hint path: ${hintFile}`,
      ],
    };
  }

  try {
    const stats = await stat(hintFilePath);
    if (!stats.isFile()) {
      return { valid: false, errors: [`Hint path is not a file: ${hintFile}`] };
    }
    return { valid: true, errors: [] };
  } catch {
    return { valid: false, errors: [`Hint file not found: ${hintFile}`] };
  }
}

export async function validateHint(
  hintsDir: string,
  schemaPath: string,
  hintPath: string,
  metadata: HintMetadata
): Promise<ValidationResult> {
  const allErrors: string[] = [];

  // Validate metadata against schema
  const metadataResult = await validateHintMetadata(schemaPath, metadata);
  allErrors.push(...metadataResult.errors);

  // Validate hint file exists
  const fileResult = await validateHintFileExists(
    hintsDir,
    hintPath,
    metadata.hint
  );
  allErrors.push(...fileResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}
