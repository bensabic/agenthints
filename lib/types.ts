export type HintCategory =
  | "code-quality"
  | "database"
  | "framework"
  | "api"
  | "auth"
  | "ui"
  | "testing"
  | "utils"
  | "other";

export type HintMetadata = {
  name: string;
  description: string;
  version: number;
  submitter?: string;
  category: HintCategory;
  tags: string[];
  hint: string;
};
