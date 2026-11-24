import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { check } from "../check_imports.mjs";

const fixture = fileURLToPath(new URL("fixtures/imports", import.meta.url));

test("fails on a missing export and a syntax error, skips a missing package", async () => {
  const { findings, unchecked } = await check(fixture);
  assert.deepEqual(findings.map((f) => f.key).sort(), [
    "missing-export commands/c/deps.js",
    "syntax-error commands/c/normalize.js",
  ]);
  assert.deepEqual(unchecked, ["commands/c/main.js"]);
});
