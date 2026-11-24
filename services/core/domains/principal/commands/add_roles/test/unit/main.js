import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake } from "sinon";

import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const root = "some-principal-root";
const scene = { root: "some-scene-root", service: "core", network: "some.network" };
const context = {
  scene,
  principal: { root: "some-admin-root", service: "core", network: "some.network" },
};
const sceneRole = (id, overrides = {}) => ({
  id,
  subject: { ...scene, domain: "scene", ...overrides },
});
const forbidden = async (args) => {
  try {
    await main(args);
  } catch (e) {
    return e.statusCode == 403;
  }
  return false;
};

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should add a role of the caller's scene", async () => {
    const aggregateFn = fake.resolves({ state: { roles: [] } });
    const roles = [sceneRole("SceneViewer")];
    const result = await main({ payload: { roles }, root, context, aggregateFn });

    expect(aggregateFn).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      events: [{ action: "add-roles", payload: { roles }, root }],
    });
  });
  it("should only add the roles the principal doesn't have", async () => {
    const aggregateFn = fake.resolves({
      state: { roles: [sceneRole("SceneViewer")] },
    });
    const result = await main({
      payload: { roles: [sceneRole("SceneViewer"), sceneRole("SceneAdmin")] },
      root,
      context,
      aggregateFn,
    });

    expect(result.events[0].payload.roles).to.deep.equal([
      sceneRole("SceneAdmin"),
    ]);
  });
  it("should add a role that differs from an existing one only by subject domain", async () => {
    const aggregateFn = fake.resolves({
      state: { roles: [sceneRole("SceneAdmin", { domain: "group" })] },
    });
    const result = await main({
      payload: { roles: [sceneRole("SceneAdmin")] },
      root,
      context,
      aggregateFn,
    });

    expect(result.events[0].payload.roles).to.deep.equal([
      sceneRole("SceneAdmin"),
    ]);
  });
  it("should return nothing if the principal has every role", async () => {
    const aggregateFn = fake.resolves({
      state: { roles: [sceneRole("SceneAdmin")] },
    });
    const result = await main({
      payload: { roles: [sceneRole("SceneAdmin")] },
      root,
      context,
      aggregateFn,
    });

    expect(result).to.be.undefined;
  });
  it("should refuse anything but a scene role of the caller's scene", async () => {
    const aggregateFn = fake.resolves({ state: { roles: [] } });
    for (const [role, callerContext] of [
      // Another scene.
      [sceneRole("SceneAdmin", { root: "some-other-scene-root" }), context],
      [sceneRole("SceneAdmin", { network: "some.other-network" }), context],
      [sceneRole("SceneAdmin", { service: "some-other-service" }), context],
      // Not a scene.
      [sceneRole("SceneAdmin", { domain: "group" }), context],
      // Not a scene role.
      [sceneRole("NodeNetwork"), context],
      [sceneRole("GroupAdmin"), context],
      // A session that isn't in a scene.
      [sceneRole("SceneAdmin"), { principal: context.principal }],
    ])
      expect(
        await forbidden({
          payload: { roles: [sceneRole("SceneViewer"), role] },
          root,
          context: callerContext,
          aggregateFn,
        }),
        JSON.stringify(role)
      ).to.be.true;
    expect(aggregateFn).to.not.have.been.called;
  });
});
