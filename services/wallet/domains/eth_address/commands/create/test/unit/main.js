import * as chai from "chai";
import { restore, replace, fake } from "sinon";
import sinonChai from "sinon-chai";

import deps from "../../deps.js";
import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const envService = "some-service";
const envNetwork = "some-network";
const envRegion = "some-region";
const envProject = "some-project";
const encryptedPrivateKey = "encrypted-private-key";
const privateKey = "evm-privkey";
const publicAddress = "0xabc";
const root = "new-address-root";
const name = "some-name";
const context = { 
  principal: { 
    root: "root", 
    service: "svc", 
    network: "net" 
  } 
};

process.env.GCP_REGION = envRegion;
process.env.GCP_PROJECT = envProject;
process.env.SERVICE = envService;
process.env.NETWORK = envNetwork;

describe("Address create-evm command unit tests", () => {
  beforeEach(() => {
    restore();
  });

  it("should create EVM address and encrypt private key", async () => {
    const createWalletFake = fake.returns({ address: publicAddress, privateKey });
    const encryptFake = fake.returns(encryptedPrivateKey);
    const uuidFake = fake.returns(root);
    
    replace(deps, "createWallet", createWalletFake);
    replace(deps, "encrypt", encryptFake);
    replace(deps, "uuid", uuidFake);

    const payload = {};
    const result = await main({ payload, context });
    
    expect(createWalletFake).to.have.been.calledOnce;
    expect(uuidFake).to.have.been.calledOnce;
    expect(encryptFake).to.have.been.calledWith({
      message: privateKey,
      key: "private",
      ring: "address-private-keys",
      location: envRegion,
      project: envProject,
      format: "base64",
    });
    
    expect(result.events).to.have.lengthOf(1);
    expect(result.events[0].payload).to.deep.include({
      type: "evm",
      publicAddress,
      principal: context.principal,
      privateKey: encryptedPrivateKey,
    });
    expect(result.events[0].action).to.equal("create-evm");
    expect(result.events[0].root).to.equal(root);
    expect(result.response.receipt).to.deep.include({
      address: {
        root,
        service: envService,
        network: envNetwork,
      },
    });
  });
  it("should create EVM address and encrypt private key with name", async () => {
    const createWalletFake = fake.returns({ address: publicAddress, privateKey });
    const encryptFake = fake.returns(encryptedPrivateKey);
    const uuidFake = fake.returns(root);

    replace(deps, "createWallet", createWalletFake);
    replace(deps, "encrypt", encryptFake);
    replace(deps, "uuid", uuidFake);

    const payload = { name };
    const result = await main({ payload, context });
    
    expect(createWalletFake).to.have.been.calledOnce;
    expect(uuidFake).to.have.been.calledOnce;
    expect(encryptFake).to.have.been.calledWith({
      message: privateKey,
      key: "private",
      ring: "address-private-keys",
      location: envRegion,
      project: envProject,
      format: "base64",
    });
    
    expect(result.events).to.have.lengthOf(1);
    expect(result.events[0].payload).to.deep.include({
      name,
      type: "evm",
      publicAddress,
      principal: context.principal,
      privateKey: encryptedPrivateKey,
    });
    expect(result.events[0].action).to.equal("create-evm");
    expect(result.events[0].root).to.equal(root);
    expect(result.response.receipt).to.deep.include({
      address: {
        root,
        service: envService,
        network: envNetwork,
      },
    });
  });
}); 