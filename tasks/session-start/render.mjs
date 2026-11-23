// Renders the five session-start procedures through a Toolbox CLI checkout
// and writes render-evidence.json beside this file. Local evidence only.
//
// The child process PATH holds nothing but a recording `gcloud` double, so no
// cloud command can run. Usage, with Node 24.22.1:
//   node tasks/session-start/render.mjs <toolbox checkout>
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dia = path.resolve(here, "../..");
const toolbox = path.resolve(process.argv[2] ?? "");
const cli = path.join(toolbox, "packages/cli/blossm");
if (!fs.existsSync(path.join(cli, "src/command/index.js")))
  throw new Error("Pass the Toolbox checkout as the first argument.");
const yaml = createRequire(path.join(cli, "package.json"))("yaml");

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const git = (...args) =>
  execFileSync("git", ["-C", toolbox, ...args], { encoding: "utf8" }).trim();

const procedures = [
  ["fact", "facts/public_key"],
  ["fact_gateway", "fact_gateway"],
  ["command", "services/core/domains/session/commands/start"],
  ["command_gateway", "services/core/domains/session/command_gateway"],
  ["event_store", "services/core/domains/session/event_store"],
];

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "session-start-render-"));
const bin = path.join(scratch, "bin");
fs.mkdirSync(bin);
fs.writeFileSync(
  path.join(bin, "gcloud"),
  '#!/bin/sh\necho "$@" >> "$CALLS"\n/bin/cp -R . "$CAPTURE"\n',
  { mode: 0o755 },
);

const render = (kind, dir, dry) => {
  const capture = path.join(scratch, `${kind}${dry ? "-dry" : ""}`);
  const calls = `${capture}.calls`;
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const [entry, ...args] = process.argv.slice(1);
       await (await import(entry)).default(args);`,
      pathToFileURL(path.join(cli, "src", kind, "index.js")).href,
      "deploy",
      "--env",
      "development",
      ...(dry ? ["--dry-run"] : []),
    ],
    {
      cwd: path.join(dia, dir),
      encoding: "utf8",
      env: { PATH: bin, TMPDIR: scratch, CALLS: calls, CAPTURE: capture },
    },
  );
  if (result.status !== 0) throw new Error(`${dir}: ${result.stderr}`);
  return {
    build: yaml.parse(fs.readFileSync(path.join(capture, "build.yaml"), "utf8")),
    config: JSON.parse(fs.readFileSync(path.join(capture, "config.json"), "utf8")),
    calls: fs.readFileSync(calls, "utf8").trim().split("\n"),
  };
};

const value = (args, flag) =>
  args.find((arg) => arg.startsWith(`${flag}=`))?.slice(flag.length + 1);

try {
  const rendered = procedures.map(([kind, dir]) => {
    const { build, config, calls } = render(kind, dir, false);
    const dry = render(kind, dir, true);
    const steps = build.steps.map((step) => (step.args ?? []).map(String));
    const deploy = steps.find((args) => args[0] == "run" && args[1] == "deploy");
    const mapping = steps
      .flat()
      .find((arg) => arg.startsWith("--domain="))
      ?.slice("--domain=".length);
    return {
      source: `${dir}/blossm.yaml`,
      sourceSha256: sha256(fs.readFileSync(path.join(dia, dir, "blossm.yaml"))),
      procedure: config.procedure,
      ...(config.name && { name: config.name }),
      ...(config.domain && { domain: config.domain }),
      ...(config.service && { service: config.service }),
      ...(config.commands && { gatewayCommands: config.commands }),
      ...(config.facts && { gatewayFacts: config.facts }),
      cloudRunService: deploy[2],
      runtimeServiceAccount: value(deploy, "--service-account"),
      public: deploy.includes("--allow-unauthenticated"),
      image: value(deploy, "--image"),
      ...(mapping && { domainMapping: mapping }),
      buildServiceAccount: build.serviceAccount,
      iamMembersGranted: [
        ...new Set(
          steps.flat().filter((arg) => arg.startsWith("--member=")),
        ),
      ].map((arg) => arg.slice("--member=".length)),
      gcloudDoubleCalls: [...calls, ...dry.calls],
      dryRunHasDeployStep: dry.build.steps.some(
        (step) => step.args?.[0] == "run" && step.args?.[1] == "deploy",
      ),
    };
  });

  const evidence = {
    kind: "local render, no cloud command executed",
    note:
      "Rendered by the Toolbox checkout below with only a recording gcloud double on PATH. " +
      "It shows what a deployment would submit. It is not evidence of any cloud state.",
    generated: new Date().toISOString(),
    node: process.version,
    toolbox: {
      branch: git("rev-parse", "--abbrev-ref", "HEAD"),
      commit: git("rev-parse", "HEAD"),
      uncommittedDiffSha256: sha256(git("diff", "HEAD")),
      uncommittedFiles: git("diff", "HEAD", "--name-only").split("\n").filter(Boolean),
    },
    configSha256: sha256(fs.readFileSync(path.join(dia, "config.yaml"))),
    procedures: rendered,
  };
  fs.writeFileSync(
    path.join(here, "render-evidence.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );

  const identities = rendered.map((p) => p.runtimeServiceAccount);
  if (new Set(identities).size != identities.length)
    throw new Error("Runtime identities are not distinct.");
  console.log(rendered.map((p) => `${p.cloudRunService} ${p.runtimeServiceAccount}`).join("\n"));
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
