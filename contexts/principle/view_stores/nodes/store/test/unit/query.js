const fs = require("fs");
const path = require("path");
const { expect } = require("chai").use(require("sinon-chai"));

const query =
  fs.existsSync(path.resolve(__dirname, "../../query.js")) &&
  require("../../query");

describe("View store get tests", () => {
  if (!query) return;
  it("should convert correctly", async () => {
    const context = { principle: { root: "some-principle" } };
    const result = query({ context });
    expect(result).to.deep.equal({ root: "some-principle" });
  });
});
