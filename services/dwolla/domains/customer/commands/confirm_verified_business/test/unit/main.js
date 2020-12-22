const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, useFakeTimers } = require("sinon");

const main = require("../../main");

// None of the clock and time stuff in the file is needed if
// you don't need to freeze time before running your tests.
let clock;
const now = new Date();

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully", async () => {
    const payload = "some-payload";
    const root = "some-root";

    const result = await main({ payload, root });
    expect(result).to.deep.equal({
      events: [{ action: "some-action", payload, root, correctNumber: 0 }],
    });
  });
});
