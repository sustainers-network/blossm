# Before deploying another service

Only the session start path is deployed. This page lists what the rest of the
tree still needs from the environment, measured against the setup in the
inherited [Toolbox README](https://github.com/blossm-network/toolbox#setup-deployment-infrastructure),
and where this project deliberately differs from it. Read it before the first
deploy of any procedure not named in
[SESSION_START_DEPLOYMENT.md](SESSION_START_DEPLOYMENT.md).

**The operator runs every gcloud and `blossm` command here.** Nothing on this
page has been run yet.

| Topic | Inherited README | This project | Still to do |
| --- | --- | --- | --- |
| Runtime identity | Every service runs as the project's default compute account, which holds invoker, storage and KMS roles for the whole project | One service account per service, named in the procedure's `blossm.yaml` | Name one in each procedure before its first deploy |
| Secrets | A `secrets-bucket` key ring and a storage bucket, named in `config.yaml` | Not created | Create both, name the bucket, store the secrets |
| Roles | A storage bucket for `roles.yaml` files, named in `config.yaml` | Not created | Create it, name it, upload the roles |
| Dependencies | Each procedure lists its packages in `blossm.yaml` | Same | Some procedures import packages they do not list |

## 1. Runtime identity

`config.yaml` sets a default `runtimeServiceAccounts.development`. It is the
session event store's own identity, `blossm-session`, which can read the
database password and use the store's block keys. **A procedure deployed
without its own identity runs with that access.** Four procedures name their
own today: the `public-key` fact, the root fact gateway, the session `start`
command and the session command gateway. The others do not.

Before deploying a procedure, add to its `blossm.yaml`:

```yaml
runtimeServiceAccounts:
  development: blossm-<domain>-<name>@blossm-network-development.iam.gserviceaccount.com

# Only if the procedure signs, verifies, encrypts or decrypts with a KMS key.
keys:
  - ring: jwt
    name: access
    use: verify
```

From `@blossm/cli` `0.0.1964` the deployment then does the rest: it creates
the account if it is missing and grants it the services it calls, the queues
it enqueues to and the keys it declares. The first deploy of a new identity
needs a deployer who holds `roles/iam.serviceAccountAdmin`. See
[Access granted by each deployment](https://github.com/blossm-network/toolbox/blob/master/packages/cli/utils/merge_cli_template/README.md#access-granted-by-each-deployment).

Two kinds of access are **not** granted by a deployment and stay as one
command per identity until the generator covers them: read access to the
secrets bucket (section 2) and to the roles bucket (section 3).

Open question for the owner: moving `blossm-session` out of the `config.yaml`
default and into the session event store's own `blossm.yaml` would make a
forgotten override fall back to the project's default compute account, as in
the inherited README, instead of to the store's identity. That changes the
configuration of a live service, so it needs a rendered-build comparison
before and after.

## 2. Secrets

The inherited README's Secrets section applies unchanged. A secret is a file
`<name>.txt.encrypted` in the secrets bucket, encrypted with a key of the same
name in the global key ring `secrets-bucket`. `blossm secret create` makes the
key if needed, encrypts and uploads.

Procedures that read a secret, and so cannot work until it exists:

| Secret | Read by |
| --- | --- |
| `email-hmac-key` | `core.challenge.issue`, `core.session.save` |
| `railgun-authenticator-password` | `comms.email.send-auth-code` |
| `twilio-account-sid`, `twilio-auth-token` | `comms.sms.send` |
| `fanout-realm-key` | `updates.push` |

The email command's own README names its secret `mailgun-api-key`, and the
code reads `railgun-authenticator-password`. Settle the name before storing it.

One-time setup, per environment:

```bash
gcloud kms keyrings create secrets-bucket --location=global \
  --project="$PROJECT" --account="$OPERATOR"

gcloud storage buckets create "gs://$PROJECT-secrets" \
  --location=us-east1 --uniform-bucket-level-access --public-access-prevention \
  --project="$PROJECT" --account="$OPERATOR"
```

Then set `vendors.cloud.gcp.secretsBuckets.development` in `config.yaml` to
the bucket name, and store each secret from a file so the value stays out of
shell history:

```bash
blossm secret create email-hmac-key -f /path/to/value.txt -e development
```

Whoever runs that needs to create and encrypt with keys in the ring and to
write objects to the bucket. The inherited README grants these through its
"Blossm Developer" role.

Each service that reads a secret needs two things:

- Decrypt on the secret's key. Declare it and the deployment grants it:

  ```yaml
  keys:
    - ring: secrets-bucket
      name: email-hmac-key
      use: decrypt
  ```

- Read on the bucket. Not granted by the deployment:

  ```bash
  gcloud storage buckets add-iam-policy-binding "gs://$PROJECT-secrets" \
    --member="serviceAccount:<runtime identity>" --role=roles/storage.objectViewer \
    --project="$PROJECT" --account="$OPERATOR"
  ```

Not verified: whether a build's own test suites read real secrets. If one
does, the build identity needs the same two grants.

## 3. Roles

The inherited README's Roles section applies unchanged. Every gateway route
that requires a privilege looks up the caller's roles, and the lookup
downloads every `roles.yaml` from the roles bucket. With no bucket named, any
such route fails. Routes with `privileges: none` do not read it.

```bash
gcloud storage buckets create "gs://$PROJECT-roles" \
  --location=us-east1 --uniform-bucket-level-access --public-access-prevention \
  --project="$PROJECT" --account="$OPERATOR"
```

Set `vendors.cloud.gcp.rolesBuckets.development` in `config.yaml`, then upload
each roles file from its own directory. The object path is taken from the
last three directories, for example `core/domains/scene/roles.yaml`:

```bash
cd services/core/domains/scene && blossm roles upload -e development
```

Roles files exist for `core.account`, `core.group`, `core.scene` and
`system.node`. Each gateway identity needs read on the bucket, which the
deployment does not grant:

```bash
gcloud storage buckets add-iam-policy-binding "gs://$PROJECT-roles" \
  --member="serviceAccount:<gateway runtime identity>" --role=roles/storage.objectViewer \
  --project="$PROJECT" --account="$OPERATOR"
```

## 4. Dependencies

A service image installs only what its procedure's `blossm.yaml` lists under
`dependencies`, plus the runtime packages of the framework's base for that
kind of procedure. Packages listed only as development dependencies are not
in the image. A procedure that imports a package it does not list starts only
if another package happens to bring it along.

Known cases: `comms.sms.send` and `updates.create-token` import
`@blossm/uuid` without listing it.

## 5. Environments

`config.yaml` defines only `development`. Some procedures carry `env` blocks
for `production`, `staging` and `sandbox` from earlier use. They are inert
until those environments get a project, registry and identities.

## 6. Views

No PostgreSQL view-store adapter exists, and `config.yaml` has no
`vendors.viewStore`, so view stores, projections and the view gateway cannot
be generated yet.
