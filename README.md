#### Dia

###### An implementation of the Blossm core layer that is working towards providing projects built on top access to progressive business model experiments.

For instructions on how to build on top of Sustainer's Network, see the [documentation](https://github.com/blossm-network/toolbox) for Blossm, which explains how to get started and how to connect to a core layer.


Deploy sequence:

1. All Event Stores.
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