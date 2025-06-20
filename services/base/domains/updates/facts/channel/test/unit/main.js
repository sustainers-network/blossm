import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake, replace } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const name = "some-name";
const key = "some-key";
const context = "some-context";
const network = "some-network";

const queryContext = "some-query-context";

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const query = {
      name,
      key,
      context: queryContext,
      network,
    };

    const channel = "some-channel";

    const getFake = fake.returns({ body: channel });

    replace(deps, "get", getFake);
    const { response, headers } = await main({ query, context });

    const padding = new Array(2048);
    const body = `:${padding.join(" ")}\n\n`;
    expect(response).to.deep.equal(body);
    expect(getFake).to.have.been.calledWith(`v.${queryContext}.${network}`, {
      query: {
        context,
        name: query.name,
        key: query.key,
      },
    });
    expect(headers).to.deep.equal({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Grip-Hold": "stream",
      "Grip-Channel": channel,
      "Grip-Keep-Alive": ":\\n\\n; format=cstring; timeout=20",
    });
  });
  it("should return successfully with domain and no context", async () => {
    const query = {
      name,
      network,
    };

    const channel = "some-channel";

    const getFake = fake.returns({ body: channel });

    replace(deps, "get", getFake);
    const { response, headers } = await main({ query, context });

    const padding = new Array(2048);
    const body = `:${padding.join(" ")}\n\n`;
    expect(response).to.deep.equal(body);
    expect(getFake).to.have.been.calledWith(`v.${network}`, {
      query: {
        context,
        name: query.name,
      },
    });
    expect(headers).to.deep.equal({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Grip-Hold": "stream",
      "Grip-Channel": channel,
      "Grip-Keep-Alive": ":\\n\\n; format=cstring; timeout=20",
    });
  });
});
