const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake, replace } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const name = "some-name";
const domain = "some-domain";
const service = "some-service";
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
  it("should return successfully with domain", async () => {
    const query = {
      name,
      domain,
      [domain]: {
        service,
      },
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
    expect(getFake).to.have.been.calledWith(
      `v.${domain}.${service}.${queryContext}.${network}`,
      {
        query: {
          context,
          name: query.name,
          [domain]: {
            service,
          },
        },
      }
    );
    expect(headers).to.deep.equal({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Grip-Hold": "stream",
      "Grip-Channel": channel,
      "Grip-Keep-Alive": ":\\n\\n; format=cstring; timeout=20",
    });
  });
});
