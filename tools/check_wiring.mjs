// Fails when procedure configuration (blossm.yaml) and code disagree.
// Usage: node tools/check_wiring.mjs [--all]
//
// Static checks only: nothing is imported or executed from the procedures.
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "yaml";
import { report } from "./gate.mjs";

const REPO = fileURLToPath(new URL("..", import.meta.url));

// Known failures on master, keyed by exact finding. Each is being fixed in its
// own pull request. Delete an entry when its fix merges; the gate warns when
// an entry no longer matches anything.
const KNOWN = {
  "handler-undeclared services/core/domains/role/event_store add-permissions":
    "role store handles an action its blossm.yaml does not declare",
  "handler-undeclared services/core/domains/role/event_store remove-permissions":
    "role store handles an action its blossm.yaml does not declare",
  "action-without-handler services/core/domains/session/event_store save":
    "session store declares `save` but has no handler for it",
  "undeclared-import services/system/domains/updates/commands/create_token deps.js:@blossm/uuid":
    "`@blossm/uuid` is only a devDependency of the command base config",
};

const SKIP_DIRS = new Set(["node_modules", ".git", "docs", "tasks", "tools"]);
// The files the generated service imports at startup, per procedure kind.
export const SOURCE_FILES = [
  "deps.js",
  "main.js",
  "normalize.js",
  "validate.js",
  "fill.js",
  "handlers.js",
];
// Files a procedure kind cannot be built without.
const REQUIRED = {
  command: ["main.js"],
  fact: ["main.js"],
  "event-store": ["handlers.js"],
  projection: ["handlers.js"],
};
// Procedure kind to its directory in the installed CLI.
const CLI_DIR = {
  command: "command",
  fact: "fact",
  "event-store": "event_store",
  projection: "projection",
};

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === "blossm.yaml") out.push(p);
  }
  return out;
};

// Every directory with a blossm.yaml: { dir (relative), config, error }.
export const loadProcedures = (root) =>
  walk(root)
    .sort()
    .map((file) => {
      const dir = path.relative(root, path.dirname(file)) || ".";
      try {
        return { dir, config: parse(fs.readFileSync(file, "utf8")) || {} };
      } catch (e) {
        return { dir, config: {}, error: e.message.split("\n")[0] };
      }
    });

// Blanks out comments, keeping offsets and line breaks.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:"'`\\])\/\/.*$/gm,
      (m, before) => before + " ".repeat(m.length - before.length)
    );

const read = (root, dir, file) => {
  const p = path.join(root, dir, file);
  return fs.existsSync(p) ? stripComments(fs.readFileSync(p, "utf8")) : null;
};

// The text from the opening bracket at `start` to its matching close.
const balanced = (src, start) => {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if ("{[(".includes(src[i])) depth++;
    else if ("}])".includes(src[i]) && --depth === 0)
      return src.slice(start, i + 1);
  }
  return src.slice(start);
};

// Removes everything nested inside the given object literal text.
const shallow = (objectText) => {
  let out = "";
  let depth = 0;
  for (const ch of objectText.slice(1, -1)) {
    if ("{[(".includes(ch)) depth++;
    else if ("}])".includes(ch)) depth--;
    else if (depth === 0) out += ch;
  }
  return out;
};

// ponytail: bracket counting ignores brackets inside string literals. Good
// enough for the handler and event objects here; use a parser if it misfires.
const handlerKeys = (src) => {
  const start = src.indexOf("{", src.indexOf("export default"));
  if (start < 0) return null;
  const keys = [];
  const re =
    /(?:^|,)\s*(?:async\s+)?(?:"([^"]+)"|'([^']+)'|([\w$]+))\s*(?=:|$)/g;
  let m;
  const body = shallow(balanced(src, start));
  while ((m = re.exec(body))) keys.push(m[1] ?? m[2] ?? m[3]);
  return keys;
};

// The value of `key` in a flattened object literal: a string when literal or
// when it names this procedure's own value, undefined when absent, null when
// it cannot be resolved statically.
const property = (flat, key, own) => {
  const m = flat.match(
    new RegExp(
      `(?:^|,)\\s*${key}\\b\\s*(?::\\s*(?:"([^"]*)"|'([^']*)'|([^,]+)))?`
    )
  );
  if (!m) return undefined;
  if (m[1] ?? m[2]) return m[1] ?? m[2];
  if (m[3] && m[3].trim() === `process.env.${key.toUpperCase()}`) return own;
  return null;
};

const packageName = (specifier) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];

const importedPackages = (src) => {
  const names = new Set();
  const re =
    /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const s = m[1];
    if (s.startsWith(".") || s.startsWith("/") || s.startsWith("node:"))
      continue;
    if (!builtinModules.includes(packageName(s))) names.add(packageName(s));
  }
  return names;
};

export const check = (
  root,
  { cliSrc = path.join(REPO, "node_modules/@blossm/cli/src") } = {}
) => {
  const findings = [];
  const add = (code, dir, detail, message) => {
    const key = `${code} ${dir} ${detail}`;
    if (!findings.some((f) => f.key === key))
      findings.push({ key, path: `${dir}/`, message: `${dir}: ${message}` });
  };
  const procedures = loadProcedures(root);
  const kind = (k) => procedures.filter((p) => p.config.procedure === k);
  const same = (a, b) => (a ?? null) === (b ?? null);
  const storeFor = (domain, service) =>
    kind("event-store").find(
      (p) => p.config.domain === domain && p.config.service === service
    );

  // a. every blossm.yaml parses, names its procedure and has its entry file.
  for (const p of procedures) {
    if (p.error)
      add(
        "yaml-parse",
        p.dir,
        "blossm.yaml",
        `blossm.yaml does not parse: ${p.error}`
      );
    else if (!p.config.procedure)
      add(
        "missing-file",
        p.dir,
        "blossm.yaml:procedure",
        "blossm.yaml has no `procedure:`"
      );
    for (const file of REQUIRED[p.config.procedure] || [])
      if (!fs.existsSync(path.join(root, p.dir, file)))
        add(
          "missing-file",
          p.dir,
          file,
          `${p.config.procedure} has no ${file}`
        );
  }

  // b. every route of a gateway has a procedure behind it.
  const routes = [
    ["command-gateway", "commands", ["command"]],
    ["fact-gateway", "facts", ["fact"]],
    ["view-gateway", "views", ["view-store", "view-composite"]],
  ];
  for (const [gatewayKind, list, targetKinds] of routes)
    for (const g of kind(gatewayKind))
      for (const route of g.config[list] || []) {
        if (route.network || route.local) continue;
        const kinds = route.procedure ? [route.procedure] : targetKinds;
        const found = procedures.some(
          (p) =>
            kinds.includes(p.config.procedure) &&
            p.config.name === route.name &&
            (gatewayKind === "view-gateway"
              ? same(p.config.context, g.config.context)
              : same(p.config.domain, g.config.domain) &&
                same(p.config.service, g.config.service))
        );
        if (!found)
          add(
            "route-without-procedure",
            g.dir,
            `${kinds[0].split("-")[0]}:${route.name}`,
            `routes ${kinds.join(" or ")} \`${route.name}\`` +
              (gatewayKind === "view-gateway"
                ? ` (context ${g.config.context})`
                : ` (domain ${g.config.domain}, service ${g.config.service})`) +
              ", but no such procedure exists"
          );
      }

  // c. an event store's declared actions and its handlers are the same set.
  for (const p of kind("event-store")) {
    const src = read(root, p.dir, "handlers.js");
    const handlers = src && handlerKeys(src);
    if (!handlers) continue;
    const declared = p.config.actions || [];
    for (const a of declared)
      if (!handlers.includes(a))
        add(
          "action-without-handler",
          p.dir,
          a,
          `declares action \`${a}\` but handlers.js has no handler for it`
        );
    for (const h of handlers)
      if (!declared.includes(h))
        add(
          "handler-undeclared",
          p.dir,
          h,
          `handlers.js handles \`${h}\`, which blossm.yaml \`actions\` does not declare`
        );
  }

  // d. every action a command emits is declared by the store it is sent to.
  let skippedEmits = 0;
  for (const p of kind("command")) {
    const src = read(root, p.dir, "main.js");
    if (!src) continue;
    const re = /(?:^|[,{\s])action\s*(?::\s*(?:"([^"]*)"|'([^']*)'))?/g;
    let m;
    while ((m = re.exec(src))) {
      const at = src.indexOf("action", m.index);
      // Only object properties: `action: ...` or shorthand `action,`.
      if (!/^action\s*[:,}]/.test(src.slice(at))) continue;
      const action = m[1] ?? m[2];
      let depth = 0;
      let open = at;
      for (; open >= 0; open--) {
        if ("}])".includes(src[open])) depth++;
        else if ("{[(".includes(src[open]) && depth-- === 0) break;
      }
      if (open < 0 || src[open] !== "{") continue;
      const flat = shallow(balanced(src, open));
      // An emitted event always carries a root or a payload.
      if (!/(?:^|,)\s*(?:root|payload)\b/.test(flat)) continue;
      const domain = property(flat, "domain", p.config.domain);
      const service = property(flat, "service", p.config.service);
      if (!action || domain === null || service === null) {
        skippedEmits++;
        continue;
      }
      const target = [service ?? p.config.service, domain ?? p.config.domain];
      const store = storeFor(target[1], target[0]);
      if (!store)
        add(
          "emit-to-missing-store",
          p.dir,
          `${action}->${target.join(".")}`,
          `main.js emits \`${action}\` to the ${target.join(
            "."
          )} event store, which does not exist`
        );
      else if (!(store.config.actions || []).includes(action))
        add(
          "emit-undeclared",
          p.dir,
          `${action}->${target.join(".")}`,
          `main.js emits \`${action}\` to ${store.dir}, which does not declare that action`
        );
    }
  }

  // e. every imported package is a production dependency of the procedure.
  for (const p of procedures) {
    const cliDir = CLI_DIR[p.config.procedure];
    if (!cliDir) continue;
    const base = JSON.parse(
      fs.readFileSync(
        path.join(cliSrc, cliDir, "deploy/src/base_config.json"),
        "utf8"
      )
    );
    // devDependencies do not count: the image installs production ones only.
    const provided = { ...base.dependencies, ...p.config.dependencies };
    for (const file of SOURCE_FILES) {
      const src = read(root, p.dir, file);
      for (const name of src ? importedPackages(src) : [])
        if (!(name in provided))
          add(
            "undeclared-import",
            p.dir,
            `${file}:${name}`,
            `${file} imports \`${name}\`, which is neither in blossm.yaml \`dependencies\` nor a runtime dependency of every ${p.config.procedure}`
          );
    }
  }

  return {
    findings,
    notes: [
      `${procedures.length} blossm.yaml files checked`,
      `${skippedEmits} emitted events skipped because the action, domain or service is not a literal`,
    ],
  };
};

if (import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exit(report({ name: "check-wiring", known: KNOWN, ...check(REPO) }));
