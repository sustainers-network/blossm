import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { check } from "../check_wiring.mjs";
import { OUT_OF_SCOPE, report } from "../gate.mjs";

const fixture = fileURLToPath(new URL("fixtures/wiring", import.meta.url));
const d = "services/s/domains/d";

test("reports one finding per mismatch in the fixture tree", () => {
  const { findings, notes } = check(fixture);
  assert.deepEqual(findings.map((f) => f.key).sort(), [
    `action-without-handler ${d}/event_store unhandled`,
    `emit-to-missing-store ${d}/commands/ok declared->s.missing`,
    `emit-undeclared ${d}/commands/ok undeclared->s.d`,
    `handler-undeclared ${d}/event_store not-declared`,
    "missing-file noproc blossm.yaml:procedure",
    `missing-file ${d}/commands/nomain main.js`,
    "missing-file services/wallet/domains/w/commands/x main.js",
    `payload-field-not-in-schema ${d}/commands/ok declared.dropped->s.d`,
    `route-without-procedure ${d}/command_gateway command:ghost`,
    `undeclared-import ${d}/commands/ok main.js:dev-only-package`,
    `undeclared-import ${d}/commands/ok main.js:undeclared-package`,
    "yaml-parse broken blossm.yaml",
  ]);
  assert.match(notes.join("\n"), /^2 emitted events skipped/m);
});

test("only findings that are neither known nor out of scope fail", () => {
  const finding = (path) => ({ key: path, path, message: path });
  const scoped = finding(`${OUT_OF_SCOPE[0]}x/`);
  const known = finding("services/core/known/");
  const run = (findings) =>
    report({ name: "test", findings, known: { [known.key]: "reason" } });
  assert.equal(run([scoped, known]), 0);
  assert.equal(run([scoped, known, finding("services/core/new/")]), 1);
});
