# Development setup: core/session PostgreSQL event store

Status: **not deploy ready.** The database side is in place and confirmed. The
identities, secret, keys and bindings below have not been created, and no build
has been submitted. This guide lists what the first Blossm service needs in
project `blossm-network-development`, and the exact commands for the operator to
run.

**The operator runs every command here.** That includes `blossm deploy` and
`blossm deploy --dry-run`, which call `gcloud builds submit` themselves. Agents
prepare commands and read the returned output. They do not run gcloud, directly
or through the CLI.

Scope is one service: `services/core/domains/session/event_store`, built by the
Toolbox library's event-store generator with the PostgreSQL adapter. Its schema
and handlers are unchanged. Everything else is listed under
[Not covered](#not-covered).

## Confirmed and outstanding

Confirmed means shown in the operator's own inventory output or screenshots of
2026-11-19. Agents have not checked any of it live, and nothing here has been
re-checked since.

| Item | State |
| --- | --- |
| Project `blossm-network-development`, number `514604832519`, billing on | Confirmed |
| Cloud SQL `blossm-pg`, PostgreSQL 17, `us-east1`, RUNNABLE | Confirmed |
| `blossm-pg` public IP `35.231.133.244`, so no VPC connector is needed | Confirmed, screenshot |
| `blossm-pg` connector enforcement `REQUIRED`, SSL mode `ENCRYPTED_ONLY` | Confirmed, screenshot |
| Database `blossm` | Confirmed, screenshot |
| Role `blossm_runtime`: `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`, no role memberships, `CONNECT` and `CREATE` on `blossm` | Confirmed, screenshot. See [Database role](#database-role). |
| Artifact Registry Docker repository `blossm` in `us-east1` | Confirmed |
| DNS zone `blossm-development` for `development.blossm.network`, DNSSEC on | Confirmed, not used by an event store |
| Cloud Run, Cloud Build, Pub/Sub, Tasks, Scheduler, KMS, Secret Manager APIs | Reported enabled |
| Cloud SQL Admin API, needed by the Cloud Run socket | Confirmed. The operator's `gcloud sql` commands succeeded, which requires it. |
| Google-managed Cloud Tasks, Cloud Scheduler and Cloud Run service agents with their default roles | Confirmed, IAM screenshot taken after the APIs were enabled |
| Service accounts `blossm-build`, `blossm-session`, `executer` | Outstanding, step 1 |
| Secret `blossm-postgres-password`, version 1 | Outstanding, step 2 |
| Dry-run bindings for the build identity and the operator | Outstanding, steps 3 and 4 |
| Dry run passed, generated names confirmed | Outstanding, step 5 |
| Per-store KMS ring and keys | Outstanding, step 6 |
| Deployment and runtime IAM bindings | Outstanding, steps 7, 8 and 10 |
| Toolbox release with PostgreSQL support | Published and verified in the registry, see [Toolbox release](#toolbox-release) |
| Fresh `yarn install --frozen-lockfile` of this repository with `@blossm/cli` `0.0.1959` | Verified locally on 2026-11-20; run the install in your checkout too |

Existing resources that this service does **not** use, and that must not be
repurposed for it:

- Secret `blossm-database` holds a JSON connection document from the earlier Go
  work. It is not a raw PostgreSQL password and cannot be bound as `PG_PASSWORD`.
- Regional key `us-east1/blossm/network-jwt` and secret `network-jwt-public-key`
  are a different contract from the global per-store blockchain keys in step 6.

## Toolbox release

The Toolbox release this profile depends on is published. Toolbox PRs 157 to
164 and release PR 165 are merged, and all 29 npm packages of the release are
verified in the registry against release source
`bdb8a728dbf7735097817eaad9f20c3207ae1f8d`. It includes `@blossm/cli`
`0.0.1959` and `@blossm/postgres-event-store` `0.0.2`.

`package.json` pins `@blossm/cli` to exactly `0.0.1959`. Do not deploy with an
earlier CLI. Earlier versions generate MongoDB event stores only and ignore the
fields this profile depends on: `defaults.eventStore: postgres`,
`vendors.eventStore.postgres`, `environmentPrefixes`, `registries`,
`buildServiceAccounts`, `runtimeServiceAccounts`, `vpcConnectors`, `ingress`,
`maxInstances` and `minInstances`.

Install from the npm registry with Node 24.22.1, which the released CLI packages
require and `package.json` `engines.node` enforces, and Yarn Classic 1.22.22:

```bash
node --version    # expect v24.22.1
yarn --version    # expect 1.22.22
COREPACK_ENABLE_AUTO_PIN=0 yarn install --frozen-lockfile
yarn list --pattern @blossm/cli    # expect @blossm/cli@0.0.1959
```

Start from a checkout with no `node_modules`. The tracked `yarn.lock` is the
install authority, and `--frozen-lockfile` fails instead of rewriting it.
`COREPACK_ENABLE_AUTO_PIN=0` stops a Corepack-provided Yarn from adding a
`packageManager` field to `package.json`. It has no effect otherwise.

A fresh registry installation and frozen-lockfile check passed on 2026-11-20
with lifecycle scripts disabled. The installed generator assembled the unchanged
session procedure; its independently registry-installed service passed the
handler fixture suite and all eight HTTP integration checks against disposable
PostgreSQL 17.12. No workspace package links or local tarball overrides were used.
The container build and live GCP behavior remain unverified until the steps below run.

Linking a local CLI checkout is not a substitute. The generated service declares
`@blossm/postgres-event-store` as a registry dependency, and both the Cloud Build
install step and the image build fetch it from npm.

## Database role

The operator created role `blossm_runtime` in SQL, not with `gcloud sql users
create`. That matters: a role created through gcloud or the console joins
`cloudsqlsuperuser`, and this one has no memberships.

Evidence from the 2026-11-19 screenshots, with the operator logged in as
`blossm_runtime`:

- Every role attribute other than `LOGIN` reads false, and the role is a member
  of nothing.
- `CREATE SCHEMA`, `CREATE TABLE`, `INSERT` and `SELECT` succeeded inside a
  transaction that was then rolled back, so the check left nothing behind.

Those are the operations the service needs. At startup it runs
`CREATE SCHEMA IF NOT EXISTS core_session` and creates five tables there.

Keep the role as it is. Do not recreate or replace it, do not reset it through
gcloud or the console, and do not grant it `cloudsqlsuperuser` or any other
broad membership. This guide contains no command that creates or alters a
database or a database role.

## Generated names

These are produced by the companion generator for this profile. The service name
was computed offline from its naming helpers. Confirm it against the generated
`build.yaml` in the dry run of step 5 before creating the KMS ring in step 6,
which is permanent. The dry run needs neither the ring nor any other resource
named here, so nothing has to be confirmed before it can run.

| Resource | Name |
| --- | --- |
| Cloud Run service | `us-east1-event-store-core-session-623237703` |
| Expected URL and token audience | `https://us-east1-event-store-core-session-623237703-514604832519.us-east1.run.app` |
| Image | `us-east1-docker.pkg.dev/blossm-network-development/blossm/event-store.core.session` |
| PostgreSQL schema inside `blossm` | `core_session` |
| KMS ring, location `global` | `us-east1-event-store-core-session-623237703-blockchain` with keys `private` and `producer` |
| Task queues, `us-east1` | `event-store-core-session`, `event-store-core-session-create-block` |
| Pub/Sub topics | `start.session.core`, `save.session.core`, `upgrade.session.core`, `change-scene.session.core`, `terminate.session.core` |
| Scheduler jobs, `us-east1` | `event-store-core-session-create-block` at `0 5 * * *`, `event-store-core-session-check-in` hourly |

## Identities

Four identities, each with one job. None receives Owner or Editor.

| Identity | Job | Must not have |
| --- | --- | --- |
| Operator, a human account | Runs this guide and submits builds | Standing Owner or Editor |
| `blossm-build` | Runs the build: tests, pushes the image, deploys, reconciles queues, topics and jobs | The database password, key use, Cloud SQL access |
| `blossm-session` | Runs the service: connects to PostgreSQL, publishes events, signs and encrypts blocks, enqueues block continuation | Any deploy or resource-admin role |
| `executer` | The OIDC identity Cloud Tasks and Cloud Scheduler present when calling the service. The name is fixed in the generator. | Anything except invoking the service |

The service is deployed with `--no-allow-unauthenticated`. Ingress `all` makes it
reachable without a connector, not public. Never bind `allUsers` or
`allAuthenticatedUsers`.

Enabling the APIs created Google-managed service agents with their own project
bindings, including the Cloud Tasks and Cloud Scheduler agents that mint the
`executer` tokens, and the Cloud Run agent that pulls the image. The IAM
screenshot taken after the APIs were enabled shows all three with their default
roles. Leave those bindings in place.

Google's own guidance for the three patterns used below:

- Cloud Run to Cloud SQL, the socket and the `cloudsql.client` role:
  <https://docs.cloud.google.com/sql/docs/postgres/connect-run>
- A user-specified build service account, its roles and logging:
  <https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts>
- Scheduler and Tasks calling an authenticated HTTP target with an OIDC token:
  <https://docs.cloud.google.com/scheduler/docs/http-target-auth>

Where this guide and those pages disagree, the pages win and the guide needs
correcting.

## Operator permissions

The operator needs these only while running the matching step. Grant and remove
them through the organization-level path already in use. Do not restore Owner.

| Step | Narrowest predefined role |
| --- | --- |
| 1 | `roles/iam.serviceAccountAdmin` |
| 2 | `roles/secretmanager.admin` |
| 3 | `roles/storage.admin`, `roles/resourcemanager.projectIamAdmin` |
| 4 | `roles/resourcemanager.projectIamAdmin`, `roles/iam.serviceAccountAdmin`, `roles/storage.admin` |
| 5 and 9 | The operator bindings from step 4 |
| 6 | `roles/cloudkms.admin` |
| 7, 8 and 10 | `roles/resourcemanager.projectIamAdmin`, plus the admin role of each resource receiving a binding |

No step needs a Cloud SQL role. The database and its role already exist.

## Setup commands

Set these once in the shell that runs the commands. Every command names its
project and account explicitly, and its region or location where one applies.

```bash
OPERATOR="jango@blossm.network"
BUILD="blossm-build@blossm-network-development.iam.gserviceaccount.com"
RUNTIME="blossm-session@blossm-network-development.iam.gserviceaccount.com"
EXECUTER="executer@blossm-network-development.iam.gserviceaccount.com"
SERVICE="us-east1-event-store-core-session-623237703"
RING="us-east1-event-store-core-session-623237703-blockchain"
```

Order matters. Steps 1 to 4 are everything the dry run needs. The dry run in
step 5 confirms the generated names. Steps 6 to 8 create the keys and the
bindings that a real deployment needs, and step 9 deploys.

### 1. Service accounts

```bash
gcloud iam service-accounts create blossm-build \
  --display-name="Blossm build and deploy" \
  --project=blossm-network-development --account="$OPERATOR"

gcloud iam service-accounts create blossm-session \
  --display-name="Blossm core session event store runtime" \
  --project=blossm-network-development --account="$OPERATOR"

gcloud iam service-accounts create executer \
  --display-name="Blossm Tasks and Scheduler invoker" \
  --project=blossm-network-development --account="$OPERATOR"
```

### 2. Password secret

The service connects as `blossm_runtime` to database `blossm` through the
`/cloudsql/blossm-network-development:us-east1:blossm-pg` socket. Both already
exist, see [Database role](#database-role). The only thing missing is the
password where Cloud Run can read it.

Store the password already chosen for `blossm_runtime` as version 1 of a new
secret. Do not choose a new one and do not change the role's password. Type it
at the prompt in your own terminal only. Never paste it into a chat, an agent
prompt, a file or a command argument. The value is read without echo and piped
on standard input, so it never appears in an argument, the shell history or
this repository. `printf '%s'` adds no trailing newline.

```bash
gcloud secrets create blossm-postgres-password \
  --replication-policy=user-managed --locations=us-east1 \
  --project=blossm-network-development --account="$OPERATOR"

printf 'PostgreSQL password for blossm_runtime: ' >&2
IFS= read -rs BLOSSM_PG_PASSWORD
printf '\n' >&2
printf '%s' "$BLOSSM_PG_PASSWORD" | gcloud secrets versions add blossm-postgres-password \
  --data-file=- \
  --project=blossm-network-development --account="$OPERATOR"
unset BLOSSM_PG_PASSWORD
```

`config.yaml` pins version `"1"`. Rotating the password means changing it in
SQL, adding a secret version, updating that pin and redeploying.

### 3. Build identity, for the dry run

`blossm deploy` uploads the source to `gs://blossm-network-development_cloudbuild`,
gcloud's default staging bucket, and the build reads it from there. This is the
only bucket the session event store involves.

```bash
gcloud storage buckets create gs://blossm-network-development_cloudbuild \
  --location=us-east1 --uniform-bucket-level-access --public-access-prevention \
  --project=blossm-network-development --account="$OPERATOR"

gcloud storage buckets add-iam-policy-binding gs://blossm-network-development_cloudbuild \
  --member="serviceAccount:$BUILD" --role=roles/storage.objectViewer \
  --project=blossm-network-development --account="$OPERATOR"

gcloud projects add-iam-policy-binding blossm-network-development \
  --member="serviceAccount:$BUILD" --role=roles/logging.logWriter --condition=None \
  --account="$OPERATOR"
```

| Grant | Generated step |
| --- | --- |
| `storage.objectViewer` on the staging bucket | Fetch the submitted source |
| `logging.logWriter` | The build sets `CLOUD_LOGGING_ONLY` for a named build identity |

### 4. Operator deploy bindings

The operator submits the build as `blossm-build`.

```bash
gcloud iam service-accounts add-iam-policy-binding "$BUILD" \
  --member="user:$OPERATOR" --role=roles/iam.serviceAccountUser \
  --project=blossm-network-development --account="$OPERATOR"

gcloud storage buckets add-iam-policy-binding gs://blossm-network-development_cloudbuild \
  --member="user:$OPERATOR" --role=roles/storage.objectAdmin \
  --project=blossm-network-development --account="$OPERATOR"

for ROLE in roles/cloudbuild.builds.editor roles/serviceusage.serviceUsageConsumer \
  roles/logging.viewer; do
  gcloud projects add-iam-policy-binding blossm-network-development \
    --member="user:$OPERATOR" --role="$ROLE" --condition=None \
    --account="$OPERATOR"
done
```

### 5. Dry run

Requires steps 1, 3 and 4, and the Node 24.22.1 frozen Yarn install from
[Toolbox release](#toolbox-release) so that `@blossm/cli` `0.0.1959` is the
installed CLI. It does not require the secret, the KMS keys or any binding from
steps 6 to 8.

The CLI calls `gcloud builds submit` with the project but no account, so the
active gcloud account is used. Setting it for the one command keeps the account
explicit without changing the gcloud configuration.
`npx --no-install` runs the CLI installed in this repository from the procedure
directory and never downloads another one.

```bash
cd services/core/domains/session/event_store

CLOUDSDK_CORE_ACCOUNT="$OPERATOR" npx --no-install blossm deploy --dry-run -e development
```

A dry run is not local. It submits a real Cloud Build that installs
dependencies, runs the unit tests and runs the integration tests against a
disposable PostgreSQL container inside the build. It does not touch `blossm-pg`
or KMS, creates no keys, pushes no image and deploys nothing. Check that it
passes, and that the service and ring names in its output match
[Generated names](#generated-names). If they differ, stop and correct `$SERVICE`,
`$RING` and this guide before step 6.

### 6. Per-store blockchain keys

Only after step 5 confirmed `$RING`. Key rings and keys cannot be deleted, and
key versions are billed.

The generator creates these during a real deployment if they are absent. Creating
them first lets the build identity hold read access only, instead of KMS
administration over every key in the project, and lets the runtime bindings in
step 8 exist before the service starts. The flags mirror the generator's.

```bash
gcloud kms keyrings create "$RING" --location=global \
  --project=blossm-network-development --account="$OPERATOR"

gcloud kms keys create private --keyring="$RING" --location=global \
  --purpose=encryption --rotation-period=90d --next-rotation-time=+p90d \
  --project=blossm-network-development --account="$OPERATOR"

gcloud kms keys create producer --keyring="$RING" --location=global \
  --purpose=asymmetric-signing --default-algorithm=ec-sign-p256-sha256 \
  --project=blossm-network-development --account="$OPERATOR"
```

The service signs with version 1 of `producer`.

### 7. Build identity, for deployment

These add to the two grants from step 3.

```bash
gcloud artifacts repositories add-iam-policy-binding blossm --location=us-east1 \
  --member="serviceAccount:$BUILD" --role=roles/artifactregistry.writer \
  --project=blossm-network-development --account="$OPERATOR"

gcloud kms keyrings add-iam-policy-binding "$RING" --location=global \
  --member="serviceAccount:$BUILD" --role=roles/cloudkms.viewer \
  --project=blossm-network-development --account="$OPERATOR"

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME" \
  --member="serviceAccount:$BUILD" --role=roles/iam.serviceAccountUser \
  --project=blossm-network-development --account="$OPERATOR"

gcloud iam service-accounts add-iam-policy-binding "$EXECUTER" \
  --member="serviceAccount:$BUILD" --role=roles/iam.serviceAccountUser \
  --project=blossm-network-development --account="$OPERATOR"

for ROLE in roles/run.developer roles/cloudtasks.queueAdmin roles/pubsub.editor \
  roles/cloudscheduler.admin; do
  gcloud projects add-iam-policy-binding blossm-network-development \
    --member="serviceAccount:$BUILD" --role="$ROLE" --condition=None \
    --account="$OPERATOR"
done
```

What each grant is for, from the generated build steps:

| Grant | Generated step |
| --- | --- |
| `artifactregistry.writer` on `blossm` | `docker push` |
| `cloudkms.viewer` on the ring | Describe the ring and keys, find them present and skip creation |
| `run.developer`, `serviceAccountUser` on `blossm-session` | `gcloud run deploy --service-account` |
| `cloudtasks.queueAdmin` | Describe, create and update both queues |
| `pubsub.editor` | Describe and create the five topics |
| `cloudscheduler.admin`, `serviceAccountUser` on `executer` | Describe, create and update both jobs with an `executer` OIDC token |

The four roles in the loop are project-wide because the build creates the
resources they act on. Everything else is bound on one resource.

### 8. Runtime identity, before deployment

```bash
gcloud projects add-iam-policy-binding blossm-network-development \
  --member="serviceAccount:$RUNTIME" --role=roles/cloudsql.client --condition=None \
  --account="$OPERATOR"

gcloud secrets add-iam-policy-binding blossm-postgres-password \
  --member="serviceAccount:$RUNTIME" --role=roles/secretmanager.secretAccessor \
  --project=blossm-network-development --account="$OPERATOR"

gcloud kms keys add-iam-policy-binding private --keyring="$RING" --location=global \
  --member="serviceAccount:$RUNTIME" --role=roles/cloudkms.cryptoKeyEncrypter \
  --project=blossm-network-development --account="$OPERATOR"

gcloud kms keys add-iam-policy-binding producer --keyring="$RING" --location=global \
  --member="serviceAccount:$RUNTIME" --role=roles/cloudkms.signer \
  --project=blossm-network-development --account="$OPERATOR"

gcloud kms keys add-iam-policy-binding producer --keyring="$RING" --location=global \
  --member="serviceAccount:$RUNTIME" --role=roles/cloudkms.publicKeyViewer \
  --project=blossm-network-development --account="$OPERATOR"

gcloud iam service-accounts add-iam-policy-binding "$EXECUTER" \
  --member="serviceAccount:$RUNTIME" --role=roles/iam.serviceAccountUser \
  --project=blossm-network-development --account="$OPERATOR"
```

| Grant | Runtime use |
| --- | --- |
| `cloudsql.client` | The Cloud Run socket to `blossm-pg`. Cloud SQL has no per-instance policy, so this is a project binding. It is the only instance in the project. This is an IAM role for reaching the instance, not a database privilege, and it changes nothing about `blossm_runtime`. |
| `secretAccessor` on this one secret | Cloud Run binds version 1 as `PG_PASSWORD` |
| `cryptoKeyEncrypter` on `private` | Encrypts block contents. The session store is not public. |
| `signer` and `publicKeyViewer` on `producer` | Signs blocks and reads the public key |
| `serviceAccountUser` on `executer` | Block continuation enqueues a task that carries an `executer` token |

### 9. Deploy

Requires every earlier step: a passing dry run with matching names, the secret
from step 2, the keys from step 6 and the bindings from steps 7 and 8.

```bash
cd services/core/domains/session/event_store

CLOUDSDK_CORE_ACCOUNT="$OPERATOR" npx --no-install blossm deploy -e development
```

### 10. After the first deployment

The topics, queues and service now exist and can receive their bindings. Until
these are in place, Scheduler calls are rejected and events cannot be published.

```bash
gcloud run services add-iam-policy-binding "$SERVICE" --region=us-east1 \
  --member="serviceAccount:$EXECUTER" --role=roles/run.invoker \
  --project=blossm-network-development --account="$OPERATOR"

gcloud tasks queues add-iam-policy-binding event-store-core-session-create-block \
  --location=us-east1 \
  --member="serviceAccount:$RUNTIME" --role=roles/cloudtasks.enqueuer \
  --project=blossm-network-development --account="$OPERATOR"

for TOPIC in start.session.core save.session.core upgrade.session.core \
  change-scene.session.core terminate.session.core; do
  gcloud pubsub topics add-iam-policy-binding "$TOPIC" \
    --member="serviceAccount:$RUNTIME" --role=roles/pubsub.publisher \
    --project=blossm-network-development --account="$OPERATOR"
done
```

Queue `event-store-core-session` receives writes from command services. None is
deployed, so nothing is granted on it yet.

### 11. Verify

```bash
gcloud run services describe "$SERVICE" --region=us-east1 \
  --format="yaml(status.url,status.conditions,spec.template.spec.serviceAccountName,metadata.annotations,spec.template.metadata.annotations)" \
  --project=blossm-network-development --account="$OPERATOR"

gcloud run services get-iam-policy "$SERVICE" --region=us-east1 \
  --project=blossm-network-development --account="$OPERATOR"

gcloud scheduler jobs run event-store-core-session-check-in --location=us-east1 \
  --project=blossm-network-development --account="$OPERATOR"

gcloud scheduler jobs describe event-store-core-session-check-in --location=us-east1 \
  --format="yaml(state,status,lastAttemptTime,httpTarget.uri)" \
  --project=blossm-network-development --account="$OPERATOR"
```

Expected: the URL equals the one in [Generated names](#generated-names), the
identity is `blossm-session`, ingress is `all`, the Cloud SQL instance annotation
is present, the IAM policy has `executer` as its only invoker with no `allUsers`,
and the check-in attempt succeeds. Schema `core_session` with five tables should
exist in database `blossm`. The first scheduled block at 05:00 exercises the KMS
bindings. Only this evidence makes the service ready.

## Not covered

- **Views.** No PostgreSQL view-store adapter exists. `config.yaml` has no view
  store, so view stores, projections and view gateways fail at generation.
- **Other services.** The other event stores, and all facts, commands and
  gateways. Each needs its own runtime identity and bindings, and
  `runtimeServiceAccounts` is one value per environment in the current contract.
  Callers of the session store will also need `run.invoker` on it.
- **Pub/Sub push delivery.** Only projections subscribe. The
  `cloud-run-pubsub-invoker` identity and the Pub/Sub agent's token grant belong
  with the first projection.
- **Buckets.** The secrets and roles buckets, and the `secrets-bucket` KMS ring,
  are read by gateways and by services using encrypted secrets, not by this one.
  `secretsBuckets` and `rolesBuckets` are empty on purpose.
- **JWT keys and DNS.** The global `jwt` ring, domain mapping and DNS records
  belong with the gateways.
- **Staging and production.** Not configured. Deploying to them fails.
- **Redis and MongoDB.** Not used. The previous addresses are removed.

## Unverified

Local verification on 2026-11-19 assembled this exact session procedure with the
companion Toolbox source. Its generated Node24.22.1 service ran against a
disposable PostgreSQL17 database, using workspace-linked packages: all nine
generated handler and HTTP integration checks passed. The generated build names,
Cloud SQL attachment, secret reference and service identities match this guide.
That run predates the release. The published packages have since been verified
in the registry, see [Toolbox release](#toolbox-release). The subsequent registry-installed session verification is recorded in
[Toolbox release](#toolbox-release). These checks do not establish container-build
or live GCP behavior.

These follow from reading the generator and gcloud's documented behavior. None
has been run.

- The service name, and so the ring name and URL, until the dry run in step 5
  confirms them.
- That the dry run needs only the grants in steps 3 and 4. If the build fails
  on a missing permission, add the one it names, not a broader role.
- That the Cloud Run socket connects with connector enforcement `REQUIRED` and
  SSL mode `ENCRYPTED_ONLY`. The socket is a Cloud SQL connector and is
  documented as satisfying both. The first deployment proves it.
- That `roles/run.developer` is enough for `gcloud run deploy
  --no-allow-unauthenticated`. gcloud may print a non-fatal warning that it
  could not set the IAM policy. A new service has no public binding by default,
  and step 11 checks that. `roles/run.admin` is the fallback, not the default.
- That gcloud accepts the pre-created staging bucket with bucket-level bindings
  only. Its ownership check may need `storage.buckets.list` on the project.
- That `gcloud builds submit` streams logs and reports the result correctly when
  the build logs to Cloud Logging only.
- Unconfigured bucket environment variables are omitted. The PostgreSQL
  entrypoint does not read secrets or roles buckets.
- Whether the `cloudsql.client` binding should carry an IAM condition naming the
  instance, and whether the project-wide build roles should become custom roles.
