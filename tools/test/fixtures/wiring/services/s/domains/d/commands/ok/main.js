// Fixture for tools/test/check_wiring.test.mjs. Never imported.
import commandRpc from "@blossm/command-rpc";
import declared from "declared-package/sub/path";
import devOnly from "dev-only-package";
import undeclared from "undeclared-package";
import crypto from "crypto";

export default ({ payload, root }) => ({
  events: [
    { action: "declared", root, payload },
    { action: "undeclared", root, payload },
    { action: "declared", domain: "missing", service: "s", root, payload },
    { action: payload.action, root, payload },
    { action: "declared", domain: payload.domain, root, payload },
  ],
  response: { commandRpc, declared, devOnly, undeclared, crypto },
});
