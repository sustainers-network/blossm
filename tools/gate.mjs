// Shared reporting for the tools/check_*.mjs gates.
//
// A finding is { key, path, message }. `key` is stable (no line numbers) so it
// can be listed as a known failure. `path` is relative to the repository root.

// Out of scope for these gates today. The checks still scan these trees, but
// their findings are counted instead of failing the gate. Remove a prefix to
// start enforcing the gate on that service.
export const OUT_OF_SCOPE = [
  "services/wallet/",
  "services/jb/",
  "services/shop/",
];

// Prints the findings and returns the process exit code: 1 when any finding is
// neither out of scope nor listed in `known` (a map of finding key to reason).
// `unchecked` lists paths the check could not look at, so a known failure
// there is not reported as fixed.
export const report = ({
  name,
  findings,
  known = {},
  notes = [],
  unchecked = [],
}) => {
  const verbose = process.argv.includes("--all");
  const outOfScope = [];
  const warned = [];
  const failed = [];
  for (const f of findings) {
    if (OUT_OF_SCOPE.some((prefix) => f.path.startsWith(prefix)))
      outOfScope.push(f);
    else if (f.key in known) warned.push(f);
    else failed.push(f);
  }
  const absent = Object.keys(known).filter(
    (key) => !findings.some((f) => f.key === key)
  );
  const isUnchecked = (key) => unchecked.some((p) => key.endsWith(` ${p}`));
  const stale = absent.filter((key) => !isUnchecked(key));

  for (const f of failed)
    console.error(`FAIL ${f.message}\n     key: ${f.key}`);
  for (const f of warned)
    console.warn(
      `WARN known failure: ${f.message}\n     reason: ${known[f.key]}`
    );
  for (const key of stale)
    console.warn(
      `WARN known failure no longer occurs, delete its entry: ${key}`
    );
  for (const key of absent.filter(isUnchecked))
    console.warn(`WARN known failure not checked in this run: ${key}`);
  if (verbose) for (const f of outOfScope) console.log(`SKIP ${f.message}`);
  for (const note of notes) console.log(`note: ${note}`);
  console.log(
    `${name}: ${failed.length} failing, ${warned.length} known, ` +
      `${outOfScope.length} out of scope (${OUT_OF_SCOPE.join(", ")}; ` +
      `list them with --all), ${stale.length} stale known entries`
  );
  return failed.length ? 1 : 0;
};
