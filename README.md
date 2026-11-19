# Blossm services

The Blossm core-layer services: sessions, accounts, principals, roles, scenes and
the domains built on them. They are built with the Toolbox library, which supplies
the procedure runtime and the `blossm` CLI. See the
[Toolbox documentation](https://github.com/blossm-network/toolbox) for how
procedures are written, tested and connected to a core layer.

They are working towards providing projects built on top access to progressive
business model experiments.

This repository was previously named Dia. Historical paths such as
`github.com/mejango/dia` and the package name in `package.json` are kept as
source identifiers.

## Status

Nothing is deployed. `config.yaml` holds one profile: the `development`
environment in project `blossm-network-development`, region `us-east1`, network
`blossm.network`, for the first service only, the **core/session event store on
PostgreSQL**.

- **Not deploy ready.** The pinned `@blossm/cli` `^0.0.1838` cannot select
  PostgreSQL, and the cloud identities, permissions and password secret are
  operator prerequisites. Both are covered in
  [the development setup guide](docs/DEVELOPMENT_SETUP.md).
- **Views are not ready.** There is no PostgreSQL view-store adapter, so no view
  store, projection or view gateway can be deployed. The previous MongoDB Atlas
  and Redis addresses are removed, not replaced.
- **Other services are not ready.** The remaining event stores, facts, commands
  and gateways need their own runtime identities, permissions, keys and buckets.
  The profile's runtime identity is scoped to the session event store, so do not
  deploy anything else with it, and never use `blossm deploy -e all`.

The session schema, handlers and service directory layout are unchanged.

## Deploy sequence

The dependency order is unchanged. Only the first item of step 1 is prepared.

1. All Event Stores, starting with `services/core/domains/session/event_store`.
2. All Facts.
3. Commands:
- core.group.add_principals
- core.group.remove_principals
- core.principal.add_roles
- core.principal.add_scenes
- core.principal.remove_roles
- core.principal.remove_scenes
- core.scene.delete
- core.session.change_scene
- core.session.start
- core.session.terminate
- core.session.upgrade
- comms.email.send
- comms.sms.send
4.
- core.challenge.issue
- core.challenge.answer
- core.scene.register
5.
- core.session.save
6. Gateways

<!-- ## TODOs

#### Organizational

- [ ] Start documentation for dianet.work. 

#### Code 

- [ ]  Add wallet functionality as a service in a way that identities can make use of.
- [ ]  Add ENS accounts.

#### Design

- [ ] -->
