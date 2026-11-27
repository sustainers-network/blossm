# Session start deployment

Status on 2026-11-23: **all four services are deployed, and a real `start`
request through the public gateway returned `202` with a signed `access`
cookie, four stored events and a new block covering them.** See [Deployment results](#deployment-results). This guide
extends [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md), which covers the session
event store, the build identity and `executer`.

**Requires `@blossm/cli` `0.0.1964` or later.** From that version a deployment
creates its runtime identity and grants its own access, so the steps below
contain no per-service IAM commands. See [CLI release](#cli-release).

**The operator runs every command here**, including `blossm deploy`, which
submits a Cloud Build. Agents prepare commands and read the returned output.

## Scope

| Procedure | Source | Exposure | Runtime identity |
| --- | --- | --- | --- |
| `public-key` fact | `facts/public_key` | Internal | `blossm-public-key` |
| Root fact gateway | `fact_gateway` | Public, `https://f.development.blossm.network/public-key` | `blossm-public-key-gateway` |
| `start` command | `services/core/domains/session/commands/start` | Internal | `blossm-session-start` |
| Session command gateway | `services/core/domains/session/command_gateway` | Public, `https://c.session.core.development.blossm.network/start` | `blossm-session-gateway` |

The session command gateway as deployed here listed only `start`, with
`protection: context` unchanged. Its source now routes `save`, `terminate` and
`change-scene` again. Before the gateway is redeployed, each of those commands
has to be deployed and `blossm-session-gateway` needs `roles/run.invoker` on
its service, as it has on `start`.
`config.yaml` keeps `blossm-session` as the environment default, and it stays
the event store's identity.

How they depend on each other, from the source:

- `start` signs the access token with KMS key `jwt/access` version 1, location
  `global`, and returns one event with `correctNumber: 0`. A numbered event is
  written to the event store synchronously with the command's own identity
  token. It is not enqueued, so `start` needs no Cloud Tasks permission.
- The session gateway calls `start` synchronously with its own identity token.
- A request that carries a token is verified by the deployed gateway against
  `https://f.development.blossm.network/public-key`. That is the root fact
  gateway, which calls the `public-key` fact, which reads the public half of
  `jwt/access`. A first request without a token does not touch them.

So the order is: `public-key` fact, then root fact gateway. `start` command,
then session command gateway.

## Evidence

Local, reproducible:
[tasks/session-start/render-evidence.json](../tasks/session-start/render-evidence.json)
holds the five builds rendered from these procedures by the Toolbox release
source it names, with source hashes, service names, runtime identities and gateway
routes. `gcloud` was a recording double, so it shows what a deployment would
submit and says nothing about cloud state. Regenerate it with Node 24.22.1:

```bash
node tasks/session-start/render.mjs <toolbox checkout>
```

Cloud, reported by others and not checked by the implementing agent:

| Item | Source |
| --- | --- |
| Session event store live, revision `00002-ms8`, check-in and empty block requests passed | Operator, see `tasks/todo.md` |
| `jwt/access` version 1 enabled, `EC_SIGN_P256_SHA256` | Operator |
| Public zone `blossm-development` for `development.blossm.network.` with name servers `ns-cloud-c1` to `ns-cloud-c4.googledomains.com` | Operator screenshot |
| `dig +short NS development.blossm.network` returns the same four name servers, so the delegation resolves publicly | Codex, public DNS query |
| `blossm-build` can set Cloud Run service IAM: the live store's deployment applied its invoker grant | Operator deployment |

Not known: whether `blossm.network` is verified with Google and whether
`blossm-build` is an owner of it, which the gateway domain mappings require.

## Generated names

From the render evidence. The event store name matches the live service.

| Resource | Name |
| --- | --- |
| `public-key` fact service | `us-east1-fact-public-key-1401377252` |
| Root fact gateway service | `us-east1-fact-gateway-376707577` |
| `start` command service | `us-east1-command-core-session-star-3019999053` |
| Session command gateway service | `us-east1-command-gateway-core-sess-1816685483` |
| Session event store service, live | `us-east1-event-store-core-session-623237703` |
| CNAME records in zone `blossm-development` and domain mappings | `f.development.blossm.network`, `c.session.core.development.blossm.network` |
| Task queue, `us-east1` | `command-core-session-start` |
| Scheduler check-in jobs, `us-east1` | `fact-public-key-check-in`, `fact-gateway-check-in`, `command-core-session-start-check-in`, `command-gateway-core-session-check-in` |

## CLI release

Minimum version: `@blossm/cli` `0.0.1964`, with
`@blossm/deploy-cli-template` `0.0.687` and `@blossm/merge-cli-template`
`0.0.651` (Toolbox PR 174, release source `1941b149e`). The four services
below were deployed with it. The repository now pins `0.0.1965`, which has
not built or deployed anything here yet. What each release added:

| CLI | Adds |
| --- | --- |
| `0.0.1962` | A procedure names its own runtime identity in `blossm.yaml`. |
| `0.0.1963` | Public gateways turn the invoker check off instead of binding `allUsers`. |
| `0.0.1964` | `blossm deploy` creates a missing runtime identity, and each build grants the service, queue and key access its procedure needs. |
| `0.0.1965` | A command gateway's suite sends each command its first valid example payload, so the request reaches the command. A suite can now fail where a command's prerequisites, such as a secret, do not exist yet. Projections push to the `updates` domain in the `system` service. |

The commands below use the operator's global `blossm`, and only that one.
`npx --no-install blossm` would run this repository's older pinned copy.

```bash
npm install -g @blossm/cli@0.0.1965
npm ls -g @blossm/cli
command -v blossm
```

Pin the same version in `package.json` in a follow-up so the two do not drift.

## IAM model

The event store's build reconciles the store's own grants on every deployment.
That is unchanged, and the render evidence shows it as the only build that
grants anything.

The builds of the four new services grant nothing. Their access is a one-time
operator bootstrap in the steps below:

| Identity | Grant | Resource | Step |
| --- | --- | --- | --- |
| `blossm-public-key` | `roles/cloudkms.publicKeyViewer` | Key `jwt/access` | 2 |
| `blossm-session-start` | `roles/cloudkms.signer` | Key `jwt/access` | 2 |
| `blossm-session-start` | `roles/run.invoker` | Session event store service | 6 |
| `blossm-public-key-gateway` | `roles/run.invoker` | `public-key` fact service | 4 |
| `blossm-session-gateway` | `roles/run.invoker` | `start` command service | 6 |
| `executer` | `roles/run.invoker` | The two internal services, for their check-in jobs | 4, 6 |
| `blossm-build` | `roles/iam.serviceAccountUser` | Each of the four runtime identities | 3 |
| `blossm-build` | `roles/cloudkms.signer`, `roles/cloudkms.publicKeyViewer` | Key `jwt/access` | 3 |
| `blossm-build` | `roles/dns.admin` | Zone `blossm-development` only | 3, granted |
| `blossm-build` | Search Console owner | Property `development.blossm.network` | Granted, see below |

No new identity receives `roles/cloudsql.client`, the password secret or a
binding on the store's block key ring. The gateway identities get no key
access: outside local mode a gateway verifies tokens against the public key
URL.

Why the build identity needs the key: every build, dry run included, runs the
service and its dependencies with Docker Compose on Cloud Build's network, with
the build identity's credentials. The `start` container signs with the real
key and the `public-key` container reads it, because neither call has a local
substitute. The session gateway's suite posts `start`, so it signs too. This is
the original README's "used in integration tests" grant, scoped to one key.
Each gateway build also pulls its dependency's image, which is the second
reason for the deployment order.

Remaining prerequisites from the original Toolbox README (`905797872`,
Networking and Permissions):

- Domain ownership for the build, so it can create the two domain mappings.
  The original names the default Cloud Build account; this project builds as
  `blossm-build`. Done 2026-11-20 in Search Console, which has no command: the
  operator added the Domain property `development.blossm.network` (verified
  automatically, the account already owned `blossm.network`), then Settings,
  Users and permissions, Add user, with permission Owner for `blossm-build`.
  Ownership is scoped to the development subdomain. Whether Cloud Run accepts
  that for `f.development.blossm.network` is proven by the first gateway
  deployment; the fallback is the same step on `blossm.network`.
- DNS authority for the build, which reads and creates one CNAME per gateway
  (`ghs.googlehosted.com.`, TTL 86400). The README grants project-level DNS
  Administrator. Prefer the same role bound on zone `blossm-development` only,
  and fall back to the project if a zone binding does not satisfy
  `gcloud dns record-sets`. Not yet granted or tested.

No Cloud Run grant is added for the build. It already sets service IAM for the
store. If a gateway build reports a missing permission for the public invoker
or the domain mapping, add the permission it names.

## Public access

The gateway builds deploy with `--allow-unauthenticated`, which binds
`allUsers` as invoker. Organizations with domain restricted sharing
(`constraints/iam.allowedPolicyMemberDomains`) reject that binding, and
organizations created since 2024 enforce it by default. `gcloud run deploy`
then prints a warning and succeeds, leaving a gateway that answers 403 to
clients and to its own check-in job. The original README predates the
constraint and does not mention it.

This project enforces it (step 0, read 7). Decided 2026-11-20: the generator
deploys gateways with `--no-invoker-iam-check`, which makes one service public
without an `allUsers` binding, and the organization policy stays as it is.
Toolbox PR 172, released in `@blossm/cli` `0.0.1963` (release source `cc0b7b89b`, registry verified). The rejected alternative was a project
override of the constraint, which would let any principal be named in this
project's IAM policies.

The fact and the command stay private, and the public reaches the fact only
through the root fact gateway.

## Operator authority

Since 2026-11-23 the operator's project roles are
`roles/cloudbuild.builds.editor`, `roles/serviceusage.serviceUsageConsumer`,
`roles/storage.bucketViewer`, `roles/logging.viewer` and
`roles/iam.serviceAccountAdmin` for deploying, and the read-only
`roles/run.viewer`, `roles/dns.reader` and `roles/cloudkms.viewer` for
verifying. The setup roles `roles/run.admin`, `roles/dns.admin` and
`roles/cloudkms.admin` were removed that day. Obtain what a step needs through
the organization-level path already in use before running it:

| Step | Operator needs |
| --- | --- |
| The zone binding in step 1 | `roles/dns.admin`, temporary |
| First deploy of a new runtime identity | `roles/iam.serviceAccountAdmin`. Keep it on whoever introduces new services. |
| Every deploy | The submit bindings from DEVELOPMENT_SETUP.md step 4 |
| Reading services and mappings in [Verify](#verify) | Cloud Run read access, for example `roles/run.viewer` |

| Creating a new key or key ring | `roles/cloudkms.admin`, temporary |
| Running a scheduler job by hand | `roles/cloudscheduler.jobRunner`, temporary. It cannot read job status. |
| Reading stored events and blocks | `roles/cloudsql.client`, temporary, with the Cloud SQL Auth Proxy and the `blossm_runtime` password. In zsh write the instance as `"${PROJECT}:us-east1:blossm-pg"`, since `$PROJECT:u` uppercases the value. |

The operator needs no key or Cloud Run policy authority: the build makes those
grants.

## Operator commands

```bash
DIA_ROOT=/Users/jango/Documents/blossm/dia
OPERATOR="jango@blossm.network"
PROJECT="blossm-network-development"
BUILD="blossm-build@$PROJECT.iam.gserviceaccount.com"
EXECUTER="executer@$PROJECT.iam.gserviceaccount.com"
PUBLIC_KEY="blossm-public-key@$PROJECT.iam.gserviceaccount.com"
PUBLIC_KEY_GATEWAY="blossm-public-key-gateway@$PROJECT.iam.gserviceaccount.com"
SESSION_START="blossm-session-start@$PROJECT.iam.gserviceaccount.com"
SESSION_GATEWAY="blossm-session-gateway@$PROJECT.iam.gserviceaccount.com"
FACT_SERVICE="us-east1-fact-public-key-1401377252"
FACT_GATEWAY_SERVICE="us-east1-fact-gateway-376707577"
START_SERVICE="us-east1-command-core-session-star-3019999053"
COMMAND_GATEWAY_SERVICE="us-east1-command-gateway-core-sess-1816685483"
STORE_SERVICE="us-east1-event-store-core-session-623237703"
```

### 0. Inventory

Read-only. Run it before granting anything, so each later grant answers a gap
that was observed. A denied read means the operator lacks that viewer
permission. It does not mean the resource is absent. The blocks avoid `#`
comments because an interactive zsh rejects them by default.

```bash
echo "== 1 service accounts"
gcloud iam service-accounts list --project="$PROJECT" --account="$OPERATOR" \
  --format="value(email)"

echo "== 2 project roles of the build identity and the operator"
gcloud projects get-iam-policy "$PROJECT" --account="$OPERATOR" \
  --flatten="bindings[].members" \
  --filter="bindings.members:$BUILD OR bindings.members:user:$OPERATOR" \
  --format="table(bindings.members,bindings.role,bindings.condition.title)"

echo "== 3 jwt/access key policy"
gcloud kms keys get-iam-policy access --keyring=jwt --location=global \
  --project="$PROJECT" --account="$OPERATOR"

echo "== 4 Cloud Run services and domain mappings"
gcloud run services list --region=us-east1 --project="$PROJECT" --account="$OPERATOR" \
  --format="table(metadata.name,spec.template.spec.serviceAccountName)"
gcloud beta run domain-mappings list --region=us-east1 \
  --project="$PROJECT" --account="$OPERATOR"

echo "== 5 records in the development zone"
gcloud dns record-sets list --zone=blossm-development \
  --project="$PROJECT" --account="$OPERATOR" \
  --format="table(name,type,ttl,rrdatas)"

echo "== 6 domains this account has verified with Google"
gcloud domains list-user-verified --account="$OPERATOR"

echo "== 7 organization policy on public members"
gcloud resource-manager org-policies describe iam.allowedPolicyMemberDomains \
  --project="$PROJECT" --effective --account="$OPERATOR"
```

What each answers:

| Read | Decides |
| --- | --- |
| 1 | Which of the four runtime identities already exist |
| 2 | Whether the build's Cloud Run role includes `run.services.setIamPolicy` (public gateways) and `run.domainmappings.create`, and which temporary roles the operator holds on the project. Roles inherited from the organization do not appear here. |
| 3 | Which key bindings already exist |
| 4 | That none of the four services or mappings exists under another configuration |
| 5 | Whether a record already occupies either gateway name. The build refuses a CNAME that points elsewhere. |
| 6 | Whether `blossm.network` or `development.blossm.network` is verified, which the domain mappings need |
| 7 | Whether the organization rejects `allUsers`. If it does, `gcloud run deploy --allow-unauthenticated` only warns and the gateway stays private. |

Results, operator output of 2026-11-20:

| Read | Result |
| --- | --- |
| 1 | `executer`, `blossm-build`, `blossm-session` and the default compute account exist. None of the four new identities does. |
| 2, build | `run.admin`, `run.developer`, `cloudkms.admin`, `cloudscheduler.admin`, `cloudtasks.admin`, `cloudtasks.queueAdmin`, `pubsub.admin`, `pubsub.editor`, `logging.logWriter`. `run.admin` covers the public invoker binding and domain mappings. No DNS role. |
| 2, operator | `cloudbuild.builds.editor`, `cloudkms.admin`, `cloudkms.viewer`, `dns.reader`, `iam.serviceAccountAdmin`, `logging.viewer`, `serviceusage.serviceUsageConsumer`, `storage.bucketViewer`. No Cloud Run role. |
| 3 | No bindings on `jwt/access`. |
| 4 | First denied for lack of a Cloud Run role. With temporary `run.admin`: the session event store is the only service, running as `blossm-session`, and there are no domain mappings. |
| 5 | Only the zone's NS and SOA records. Both gateway names are free. |
| 6 | First failed for the same reason. With `run.admin`: the operator has verified `blossm.network`. The build identity is not yet an owner. |
| 7 | **Enforced**, allowed value `C024zallt` only. `allUsers` bindings are rejected in this project, so a gateway deployed as generated would stay private. See [Public access](#public-access). |

### 1. One-time project grants for the build identity

These are per project, not per service. The build's DNS grant is bound on the
zone. Cloud DNS zones have no `add-iam-policy-binding` command, so read the
policy, add the binding and write it back. The operator needs
`roles/dns.admin` for this, temporarily.

```bash
gcloud dns managed-zones get-iam-policy blossm-development \
  --project="$PROJECT" --account="$OPERATOR" --format=json > /tmp/blossm-zone-policy.json

python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); p.setdefault("bindings",[]).append({"role":"roles/dns.admin","members":["serviceAccount:"+sys.argv[2]]}); json.dump(p,open(sys.argv[1],"w"),indent=2)' /tmp/blossm-zone-policy.json "$BUILD"

gcloud dns managed-zones set-iam-policy blossm-development \
  --policy-file=/tmp/blossm-zone-policy.json \
  --project="$PROJECT" --account="$OPERATOR"
```

Domain ownership for the build is a browser step, see [IAM model](#iam-model).

### 2. Deploy, in dependency order

Each procedure's `blossm.yaml` names its runtime identity and, where it uses
one, its Cloud KMS key. A real deploy then does the rest:

- `blossm deploy` creates the runtime identity if it does not exist and lets
  the build identity act as it. This runs as the operator, who needs to be
  able to create service accounts and set their policy
  (`roles/iam.serviceAccountAdmin`) for the first deploy of each identity.
- The build grants itself the declared keys for its tests, then grants the
  runtime identity its keys, the services and queues it calls, and grants
  `executer` the check-in.

A called service must already be deployed, so keep this order. Run the dry run
first each time and deploy only if it passes.

```bash
for PROCEDURE in \
  facts/public_key \
  fact_gateway \
  services/core/domains/session/commands/start \
  services/core/domains/session/command_gateway; do
  echo "== $PROCEDURE"
  cd "$DIA_ROOT/$PROCEDURE"
  CLOUDSDK_CORE_ACCOUNT="$OPERATOR" blossm deploy --dry-run -e development || break
  CLOUDSDK_CORE_ACCOUNT="$OPERATOR" blossm deploy -e development || break
done
```

A dry run does not create the identity, because it deploys nothing.

The fact gateway needs the domain ownership prerequisite in
[IAM model](#iam-model). A new domain mapping needs its certificate before it
answers, about 20 minutes. Then:

```bash
curl -sS -i https://f.development.blossm.network/public-key
```

Expected: `200` with a PEM `key` and `algorithm` `ES256`.

### How this operator got here

The first two services were deployed before CLI `0.0.1964`, so on 2026-11-20
the operator ran by hand what a deployment now does: created the four runtime
identities, let `blossm-build` act as each, granted `jwt/access` to
`blossm-public-key` (public key viewer), `blossm-session-start` (signer) and
`blossm-build` (both), and granted `blossm-public-key-gateway` and `executer`
the invoker role on the fact. Those grants are the same ones a `0.0.1964`
deployment makes, so redeploying changes nothing. Two command shapes failed on
the operator's gcloud 525 and are not needed any more:
`gcloud dns managed-zones add-iam-policy-binding` does not exist, and
`gcloud run services add-iam-policy-binding` rejects `--condition`.

## Deployment results

Operator output of 2026-11-20. Builds ran as `blossm-build`.

| Step | Result |
| --- | --- |
| Manual setup | Four runtime identities created. Key, `actAs` and zone DNS bindings applied. Build identity is a Search Console owner of `development.blossm.network`. |
| `public-key` fact | CLI `0.0.1962`. Dry run and deploy passed, revision `us-east1-fact-public-key-1401377252-00001-4b8`. Runs as `blossm-public-key`. Invokers: `blossm-public-key-gateway` and `executer` only. |
| Root fact gateway | CLI `0.0.1963`. Dry run and deploy passed, revision `us-east1-fact-gateway-376707577-00001-mxb`. Runs as `blossm-public-key-gateway`. Annotation `run.googleapis.com/invoker-iam-disabled: 'true'`, empty IAM policy. The build created the CNAME and the domain mapping. An unauthenticated GET of `/public-key` on the `run.app` address returned 200 with the PEM key and `ES256`. Certificate for `f.development.blossm.network` pending at 20:03 UTC. |
| `start` command | CLI `0.0.1964`, 2026-11-23. Dry run and deploy passed, revision `us-east1-command-core-session-star-3019999053-00001-d26`. The build made every grant itself: its own `jwt/access` use before the suites, then `executer` on the service, `blossm-session-start` on the store service, on queue `event-store-core-session` and on `jwt/access`, and use of `executer`. The operator ran no IAM command. |
| Session command gateway | CLI `0.0.1964`, 2026-11-23. Deployed as revision `us-east1-command-gateway-core-sess-1816685483-00002-qw6` (a first build was cancelled by the operator during the Cloud Run deploy and rerun). The build created the domain mapping for `c.session.core.development.blossm.network` and the check-in job, and granted `blossm-session-gateway` the invoker role on the start command. Dry run passed. Its one integration test sends an empty payload and passes on the command's 409, so it proves the route, not a started session. |
| First client request | 2026-11-23 20:50 UTC. `POST /start` on the gateway's `run.app` URL with a `desktop`/`browser` device returned `202`, `receipt.session.root` `fd2ac528-367f-4ae6-a129-ef56362ddc08`, event `_id` `7ad45ce0-a237-40c4-9ad8-29c6a9083cda` and an `access` cookie for `development.blossm.network` (ES256, 90 days). `https://f.development.blossm.network/public-key` returned `200` on its custom domain. The gateway runs as `blossm-session-gateway` with the invoker check disabled, and both CNAMEs exist. A later `start` carrying that cookie returned `202`, and so did one carrying a corrupted cookie. That is the `context` protection working as written (a token that fails verification is ignored and the request continues anonymously), so on this route a `202` alone does not show that the gateway verified anything. The stored events do, see the next row. Checked offline instead: the key served at `/public-key` verifies the token's signature and rejects the same token with an altered payload, so the signing key and the published key are one pair.  |
| Stored events and block | 2026-11-23, read from `core_session` through the Cloud SQL Auth Proxy as `blossm_runtime`. All four `start` events are in `events`, each with a transaction path of gateway `1816685483` then command `3019999053`. The event from the request with the valid cookie carries `claims` in its transaction, and the one from the corrupted cookie does not, which shows the gateway verified the first token against the public-key fact and discarded the second. A block triggered by hand at 21:04:47 UTC covers 05:00:08 to 21:04:46, links to the previous block by `pHash`, and has `eSize` 8508 where the two earlier daily blocks, made before any event existed, have 1. `publications` is empty, so nothing is waiting to be published. The operator held `roles/cloudscheduler.jobRunner` and `roles/cloudsql.client` only for these checks, and both are removed. `POST https://c.session.core.development.blossm.network/start` then returned `202`, so the gateway's own domain and certificate are live. |

The gateway deploy settles three things that were unproven: Cloud Build's gcloud (592.0.0)
accepts `--no-invoker-iam-check`, the zone-level `roles/dns.admin` binding is
enough for the build's record steps, and Cloud Run accepts an owner of the
`development.blossm.network` property for a mapping beneath it.

## Verify

Each service runs as its own identity, and the store is unchanged:

```bash
for SERVICE in "$FACT_SERVICE" "$FACT_GATEWAY_SERVICE" "$START_SERVICE" \
  "$COMMAND_GATEWAY_SERVICE" "$STORE_SERVICE"; do
  gcloud run services describe "$SERVICE" --region=us-east1 \
    --format="value(metadata.name,spec.template.spec.serviceAccountName)" \
    --project="$PROJECT" --account="$OPERATOR"
done
```

Expected, in order: `blossm-public-key`, `blossm-public-key-gateway`,
`blossm-session-start`, `blossm-session-gateway`, `blossm-session`. If any of
the first four reads `blossm-session`, the CLI ignored the override: stop and
report it.

The client flow, once the gateway's certificate is ready:

```bash
curl -sS -i https://c.session.core.development.blossm.network/start \
  -H 'Content-Type: application/json' \
  -d "{\"headers\":{\"issued\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"},\"payload\":{\"device\":{\"type\":\"desktop\",\"platform\":\"browser\",\"agent\":\"curl\"}}}"
```

Expected from the command's `blossm.yaml`: `202`, a `receipt.session.root` and
an `access` cookie for `development.blossm.network`. Return the response, the
persisted `start` event for that root in schema `core_session`, and the next
block that includes it. That evidence is what makes this path ready.
