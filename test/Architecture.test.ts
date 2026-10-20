import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { test } from "node:test";

type Layer = "application" | "domain" | "infrastructure" | "presentation";

const sourceRoot = resolve(process.cwd(), "src");
const allowedDependencies: Readonly<Record<Layer, ReadonlySet<Layer>>> = {
  domain: new Set(["domain"]),
  application: new Set(["application", "domain"]),
  infrastructure: new Set(["infrastructure", "application", "domain"]),
  presentation: new Set(["presentation", "application", "domain"]),
};

test("source imports follow the declared layer dependency direction", () => {
  const violations: string[] = [];

  for (const filePath of typescriptFiles(sourceRoot)) {
    const sourceLayer = layerOf(filePath);
    if (sourceLayer === null) {
      continue;
    }

    const source = readFileSync(filePath, "utf8");
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/gu)) {
      const specifier = match[1];
      if (specifier === undefined || !specifier.startsWith(".")) {
        continue;
      }
      const importedPath = resolve(dirname(filePath), specifier.replace(/\.js$/u, ".ts"));
      const targetLayer = layerOf(importedPath);
      if (targetLayer !== null && !allowedDependencies[sourceLayer].has(targetLayer)) {
        violations.push(
          `${relative(sourceRoot, filePath)} (${sourceLayer}) imports ${relative(sourceRoot, importedPath)} (${targetLayer})`,
        );
      }
    }
  }

  assert.deepEqual(violations, []);
});

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return typescriptFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
  });
}

function layerOf(filePath: string): Layer | null {
  const firstSegment = relative(sourceRoot, filePath).split(sep)[0];
  switch (firstSegment) {
    case "application":
    case "domain":
    case "infrastructure":
    case "presentation":
      return firstSegment;
    default:
      return null;
  }
}
