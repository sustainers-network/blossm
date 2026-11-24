import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake } from "sinon";

import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const root = "some-principal-root";
const scene = { root: "some-scene-root", service: "core", network: "some.network" };
const sceneSubject = { ...scene, domain: "scene" };
const context = {
  scene,
  principal: { root: "some-admin-root", service: "core", network: "some.network" },
};
const sceneRole = (id, overrides = {}) => ({
  id,
  subject: { ...sceneSubject, ...overrides },
});
const otherRole = sceneRole("SceneAdmin", { root: "some-other-scene-root" });
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
  it("should remove a role of the caller's scene", async () => {
    const aggregateFn = fake.resolves({
      state: { roles: [sceneRole("SceneViewer"), otherRole] },
    });
    const roles = [sceneRole("SceneViewer")];
    const result = await main({
      payload: { roles, subjects: [] },
      root,
      context,
      aggregateFn,
    });

    expect(aggregateFn).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      events: [{ action: "remove-roles", payload: { roles }, root }],
    });
  });
  it("should remove every role the principal has for the caller's scene", async () => {
    const aggregateFn = fake.resolves({
      state: {
        roles: [sceneRole("SceneViewer"), sceneRole("SceneAdmin"), otherRole],
      },
    });
    const result = await main({
      payload: { roles: [sceneRole("SceneViewer")], subjects: [sceneSubject] },
      root,
      context,
      aggregateFn,
    });

    expect(result.events[0].payload.roles).to.deep.equal([
      sceneRole("SceneViewer"),
      sceneRole("SceneAdmin"),
    ]);
  });
  it("should return nothing if the principal has none of the roles", async () => {
    const aggregateFn = fake.resolves({ state: { roles: [otherRole] } });
    const result = await main({
      payload: { roles: [sceneRole("SceneViewer")], subjects: [] },
      root,
      context,
      aggregateFn,
    });

    expect(result).to.be.undefined;
  });
  it("should refuse anything but the caller's scene", async () => {
    const aggregateFn = fake.resolves({ state: { roles: [otherRole] } });
    for (const [payload, callerContext] of [
      [{ roles: [otherRole], subjects: [] }, context],
      [{ roles: [sceneRole("SceneAdmin", { domain: "group" })], subjects: [] }, context],
      [{ roles: [sceneRole("NodeNetwork")], subjects: [] }, context],
      [{ roles: [], subjects: [otherRole.subject] }, context],
      [{ roles: [], subjects: [{ ...sceneSubject, domain: "group" }] }, context],
      // A session that isn't in a scene.
      [{ roles: [sceneRole("SceneViewer")], subjects: [] }, { principal: context.principal }],
      [{ roles: [], subjects: [sceneSubject] }, { principal: context.principal }],
    ])
      expect(
        await forbidden({ payload, root, context: callerContext, aggregateFn }),
        JSON.stringify(payload)
      ).to.be.true;
    expect(aggregateFn).to.not.have.been.called;
  });
  it("should refuse an admin removing their own admin role", async () => {
    const aggregateFn = fake.resolves({
      state: { roles: [sceneRole("SceneAdmin")] },
    });
    const own = { root: context.principal.root, context, aggregateFn };
    expect(
      await forbidden({ ...own, payload: { roles: [sceneRole("SceneAdmin")], subjects: [] } })
    ).to.be.true;
    expect(
      await forbidden({ ...own, payload: { roles: [], subjects: [sceneSubject] } })
    ).to.be.true;
    // Another admin can remove it.
    const result = await main({
      payload: { roles: [sceneRole("SceneAdmin")], subjects: [] },
      root: context.principal.root,
      context: { ...context, principal: { ...context.principal, root: "some-other-admin-root" } },
      aggregateFn,
    });
    expect(result.events[0].payload.roles).to.deep.equal([sceneRole("SceneAdmin")]);
  });
});
