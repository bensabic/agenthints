/// <reference types="node" />
import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  minify: true,
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
