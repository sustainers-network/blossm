// Fails when a procedure source file cannot be loaded: a named import its
// package does not export, or a syntax error. These crash the generated
// service at startup, after the build has passed.
// Usage: node tools/check_imports.mjs [--all]
//
// Each file is loaded with a dynamic import, so its top-level code and that of
// the packages it imports runs. The procedure files only define functions and
// constants at the top level, and the packages make no network call and read
// no credential until one of their functions is called. A file that breaks
// that rule must be added to UNSAFE below instead of being imported.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadProcedures, SOURCE_FILES } from "./check_wiring.mjs";
import { report } from "./gate.mjs";

const REPO = fileURLToPath(new URL("..", import.meta.url));

// Files with import-time side effects, by path, with the reason. Never
// imported by this check.
const UNSAFE = {};

// Known failures on master, keyed by exact finding. Each is being fixed in its
// own pull request. Delete an entry when its fix merges; the gate warns when
// an entry no longer matches anything.
const KNOWN = {};

export const check = async (root) => {
  const findings = [];
  const skipped = {};
  const skip = (reason, file) => (skipped[reason] ||= []).push(file);
  let imported = 0;
  for (const p of loadProcedures(root))
    for (const name of SOURCE_FILES) {
      const file = path.join(p.dir, name);
      if (!fs.existsSync(path.join(root, file))) continue;
      if (UNSAFE[file]) {
        skip(`unsafe to import: ${UNSAFE[file]}`, file);
        continue;
      }
      try {
        await import(pathToFileURL(path.join(root, file)).href);
        imported++;
      } catch (e) {
        const add = (code) =>
          findings.push({
            key: `${code} ${file}`,
            path: file,
            message: `${file}: ${e.message}`,
          });
        if (/does not provide an export named/.test(e.message))
          add("missing-export");
        else if (e instanceof SyntaxError) add("syntax-error");
        // Procedures get their own dependencies only in their build, so a
        // package that is absent from the repository root proves nothing.
        else if (e.code === "ERR_MODULE_NOT_FOUND")
          skip(
            `not installed at the repository root: ${
              e.message.match(/Cannot find (?:package|module) '([^']+)'/)?.[1]
            }`,
            file
          );
        else skip(`threw while loading: ${e.message.split("\n")[0]}`, file);
      }
    }

  const unchecked = Object.values(skipped).flat();
  return {
    findings,
    unchecked,
    notes: [
      `${imported} files loaded, ${unchecked.length} skipped`,
      ...Object.entries(skipped)
        .sort()
        .map(
          ([reason, files]) =>
            `skipped ${files.length}, ${reason}` +
            (process.argv.includes("--all") ? `\n  ${files.join("\n  ")}` : "")
        ),
    ],
  };
};

if (import.meta.url === pathToFileURL(process.argv[1]).href)
  // Exit explicitly: an imported package may leave a handle open.
  process.exit(
    report({ name: "check-imports", known: KNOWN, ...(await check(REPO)) })
  );
