// Runs every procedure's unit suite and fails when one does not pass.
//
// Usage: node tools/test_units.mjs [--all]
//
// Each suite runs in its own mocha process, as it does in its procedure's
// build: suites set process.env and replace shared modules. A suite whose
// procedure is out of scope is not run.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProcedures } from "./check_wiring.mjs";
import { OUT_OF_SCOPE, report } from "./gate.mjs";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const MOCHA = path.join(REPO, "node_modules", "mocha", "bin", "mocha.js");

const findings = [];
let passed = 0;
let notRun = 0;
for (const { dir } of loadProcedures(REPO)) {
  const unit = path.join(dir, "test", "unit");
  if (!fs.existsSync(path.join(REPO, unit))) continue;
  const files = fs
    .readdirSync(path.join(REPO, unit))
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(unit, f));
  if (!files.length) continue;
  if (OUT_OF_SCOPE.some((prefix) => unit.startsWith(prefix))) {
    notRun++;
    continue;
  }
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [MOCHA, ...files],
    { cwd: REPO, encoding: "utf8" }
  );
  if (status === 0) {
    passed++;
    continue;
  }
  // The line that says what went wrong: mocha's count, or why it never ran.
  const why =
    `${stdout}\n${stderr}`
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /^\d+ failing|Exception during run|Error:/.test(line)) ||
    `exit ${status}`;
  findings.push({
    key: `unit-suite ${unit}`,
    path: unit,
    message: `${unit}: ${why}`,
  });
}

process.exit(
  report({
    name: "test-units",
    findings,
    notes: [
      `${passed} unit suites passed`,
      `${notRun} out of scope suites not run`,
    ],
  })
);
