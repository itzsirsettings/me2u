import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);

// Execute TypeScript logic with explicit dependency doubles; no emitted test files.
export function loadSource(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const require = (name) =>
    Object.hasOwn(dependencies, name) ? dependencies[name] : nativeRequire(name);
  new Function("require", "module", "exports", code)(require, module, module.exports);
  return module.exports;
}
