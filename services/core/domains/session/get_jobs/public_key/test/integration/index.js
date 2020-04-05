require("localenv");
const { expect } = require("chai");

const request = require("@blossm/request");

const url = `http://${process.env.MAIN_CONTAINER_NAME}`;

describe("Get job integration tests", () => {
  it("should return successfully", async () => {
    const response = await request.get(url);
    console.log({ response });
    expect(response.statusCode).to.equal(200);
  });
});
