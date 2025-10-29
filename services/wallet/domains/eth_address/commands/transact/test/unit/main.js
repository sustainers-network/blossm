import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake, stub } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const payload = {
  destinationAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  abi: [
    {
      "inputs": [
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "transfer",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  chainIds: [1],
  functionName: "transfer",
  parameters: ["0x1234567890123456789012345678901234567890", "1000000000000000000"],
  value: "0",
  gasLimit: "8000000"
};

const context = {
  principal: {
    root: "some-principal-root",
    service: "wallet",
    network: "mainnet"
  }
};

const mockAddressAggregate = {
  privateKey: "encrypted-private-key"
};

const mockPrivateKey = "0x1234567890123456789012345678901234567890123456789012345678901234";
const mockWalletClient = {
  account: {
    address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
  },
  sendTransaction: stub().resolves("0x1234567890abcdef")
};

const mockPublicClient = {
  waitForTransactionReceipt: stub().resolves({
    transactionHash: "0x1234567890abcdef",
    status: "success",
    gasUsed: 21000n,
    blockNumber: 12345
  })
};

const mockTransactionResponse = {
  hash: "0x1234567890abcdef",
  wait: stub().resolves({
    hash: "0x1234567890abcdef",
    status: 1,
    gasUsed: 21000n,
    blockNumber: 12345
  })
};

const mockRelayrQuote = {
  id: "quote-123",
  status: "quoted",
  transactions: 3,
  payment_info: [
    {
      chain: 1,
      target: "0x1234567890123456789012345678901234567890",
      calldata: "0xabcdef",
      amount: "1000000000000000000"
    },
    {
      chain: 137,
      target: "0x1234567890123456789012345678901234567890",
      calldata: "0xabcdef",
      amount: "2000000000000000000"
    }
  ]
};

const mockPaymentTx = {
  hash: "0xpayment123",
  wait: stub().resolves({
    hash: "0xpayment123",
    status: 1,
    gasUsed: 21000n,
    blockNumber: 54321
  })
};

describe("Transact command unit tests", () => {
  afterEach(() => {
    restore();
  });

  describe("Single chain transaction", () => {
    it("should handle single chain transaction successfully", async () => {
      const aggregateFn = stub().resolves(mockAddressAggregate);
      const getProviderFake = fake.returns(mockPublicClient);
      const createWalletClientFake = fake.returns(mockWalletClient);
      const encodeFunctionDataFake = fake.returns("0xencodeddata");

      replace(deps, "getProvider", getProviderFake);
      replace(deps, "createWalletClient", createWalletClientFake);
      replace(deps, "encodeFunctionData", encodeFunctionDataFake);

      const result = await main({ payload, context, aggregateFn });

      expect(result).to.deep.equal({
        events: [
          {
            action: "transact",
            root: context.principal.root,
            payload: {
              chainId: 1,
              transactionHash: "0x1234567890abcdef",
              status: "success",
              gasUsed: "21000",
            },
          },
        ],
        response: {
          receipt: {
            transactionHash: "0x1234567890abcdef",
            chainId: 1,
            status: "success",
            gasUsed: "21000",
            blockNumber: 12345,
          },
        },
      });

      expect(aggregateFn).to.have.been.calledWith(context.principal.root);
      expect(getProviderFake).to.have.been.calledOnce;
      expect(createWalletClientFake).to.have.been.calledOnce;
      expect(encodeFunctionDataFake).to.have.been.calledWith({
        abi: payload.abi,
        functionName: payload.functionName,
        args: payload.parameters
      });
      expect(mockWalletClient.sendTransaction).to.have.been.calledWith({
        to: payload.destinationAddress,
        value: BigInt(payload.value),
        data: "0xencodeddata",
        gas: BigInt(payload.gasLimit)
      });
    });

    it("should throw error when address aggregate not found", async () => {
      const aggregateFn = stub().resolves(null);

      try {
        await main({ payload, context, aggregateFn });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("Address not found or private key not available");
      }
    });

    it("should throw error when private key not available", async () => {
      const aggregateFn = stub().resolves({});

      try {
        await main({ payload, context, aggregateFn });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("Address not found or private key not available");
      }
    });
  });

  describe("Multi-chain transaction", () => {
    const multiChainPayload = {
      ...payload,
      chainIds: [1, 137, 42161]
    };

    it("should handle multi-chain transaction with Relayr successfully", async () => {
      const aggregateFn = stub().resolves(mockAddressAggregate);
      const getProviderFake = fake.returns(mockPublicClient);
      const createWalletClientFake = fake.returns(mockWalletClient);
      const encodeFunctionDataFake = fake.returns("0xencodeddata");
      const signErc2771Fake = fake.resolves("0xsigneddata");
      const getRelayrTxQuoteFake = fake.resolves(mockRelayrQuote);
      const sendRelayrTxFake = fake.resolves(mockPaymentTx);
      const erc2771ForwarderContractFake = fake.returns("0xforwarder");

      replace(deps, "getProvider", getProviderFake);
      replace(deps, "createWalletClient", createWalletClientFake);
      replace(deps, "encodeFunctionData", encodeFunctionDataFake);
      replace(deps, "signErc2771ForwardRequest", signErc2771Fake);
      replace(deps, "getRelayrTxQuote", getRelayrTxQuoteFake);
      replace(deps, "sendRelayrTx", sendRelayrTxFake);
      replace(deps, "erc2771ForwarderContract", erc2771ForwarderContractFake);

      const result = await main({ payload: multiChainPayload, context, aggregateFn });

      expect(result).to.deep.equal({
        events: [
          {
            action: "transact",
            root: context.principal.root,
            payload: {
              chainIds: [1, 137, 42161],
              quoteId: "quote-123",
              status: "paid",
              transactions: 3,
              paymentChainId: 1,
              paymentTxHash: "0xpayment123",
            },
          },
        ],
        response: {
          receipt: {
            quoteId: "quote-123",
            chainIds: [1, 137, 42161],
            status: "paid",
            transactions: 3,
            paymentChainId: 1,
            paymentTxHash: "0xpayment123",
            paymentReceipt: {
              hash: "0xpayment123",
              status: 1,
              gasUsed: 21000n,
              blockNumber: 54321
            },
            quote: mockRelayrQuote,
          },
        },
      });

      expect(signErc2771Fake).to.have.been.calledThrice;
      expect(getRelayrTxQuoteFake).to.have.been.calledOnce;
      expect(sendRelayrTxFake).to.have.been.calledOnce;
      expect(erc2771ForwarderContractFake).to.have.been.calledThrice;
      
      // Verify that sendRelayrTx was called with mainnet payment info
      expect(sendRelayrTxFake).to.have.been.calledWith({
        target: "0x1234567890123456789012345678901234567890",
        calldata: "0xabcdef",
        amount: "1000000000000000000",
        chain: 1
      }, mockPrivateKey, "https://eth.llamarpc.com");
    });

    it("should throw error when Relayr quote fails", async () => {
      const aggregateFn = stub().resolves(mockAddressAggregate);
      const getProviderFake = fake.returns(mockPublicClient);
      const createWalletClientFake = fake.returns(mockWalletClient);
      const encodeFunctionDataFake = fake.returns("0xencodeddata");
      const signErc2771Fake = fake.resolves("0xsigneddata");
      const getRelayrTxQuoteFake = fake.resolves(null);
      const erc2771ForwarderContractFake = fake.returns("0xforwarder");

      replace(deps, "getProvider", getProviderFake);
      replace(deps, "createWalletClient", createWalletClientFake);
      replace(deps, "encodeFunctionData", encodeFunctionDataFake);
      replace(deps, "signErc2771ForwardRequest", signErc2771Fake);
      replace(deps, "getRelayrTxQuote", getRelayrTxQuoteFake);
      replace(deps, "erc2771ForwarderContract", erc2771ForwarderContractFake);

      try {
        await main({ payload: multiChainPayload, context, aggregateFn });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("Failed to get Relayr quote");
      }
    });

    it("should throw error when no mainnet payment option is available", async () => {
      const quoteWithoutMainnet = {
        id: "quote-123",
        status: "quoted",
        transactions: 3,
        payment_info: [
          {
            chain: 137,
            target: "0x1234567890123456789012345678901234567890",
            calldata: "0xabcdef",
            amount: "2000000000000000000"
          }
        ]
      };

      const aggregateFn = stub().resolves(mockAddressAggregate);
      const getProviderFake = fake.returns(mockPublicClient);
      const createWalletClientFake = fake.returns(mockWalletClient);
      const encodeFunctionDataFake = fake.returns("0xencodeddata");
      const signErc2771Fake = fake.resolves("0xsigneddata");
      const getRelayrTxQuoteFake = fake.resolves(quoteWithoutMainnet);
      const erc2771ForwarderContractFake = fake.returns("0xforwarder");

      replace(deps, "getProvider", getProviderFake);
      replace(deps, "createWalletClient", createWalletClientFake);
      replace(deps, "encodeFunctionData", encodeFunctionDataFake);
      replace(deps, "signErc2771ForwardRequest", signErc2771Fake);
      replace(deps, "getRelayrTxQuote", getRelayrTxQuoteFake);
      replace(deps, "erc2771ForwarderContract", erc2771ForwarderContractFake);

      try {
        await main({ payload: multiChainPayload, context, aggregateFn });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.equal("No mainnet payment option available in quote");
      }
    });
  });

  describe("Chain ID normalization", () => {
    it("should handle single chainId as number", async () => {
      const singleChainPayload = {
        ...payload,
        chainIds: 1
      };

      const aggregateFn = stub().resolves(mockAddressAggregate);
      const getProviderFake = fake.returns(mockPublicClient);
      const createWalletClientFake = fake.returns(mockWalletClient);
      const encodeFunctionDataFake = fake.returns("0xencodeddata");

      replace(deps, "getProvider", getProviderFake);
      replace(deps, "createWalletClient", createWalletClientFake);
      replace(deps, "encodeFunctionData", encodeFunctionDataFake);

      const result = await main({ payload: singleChainPayload, context, aggregateFn });

      expect(result.events[0].payload.chainId).to.equal(1);
      expect(getProviderFake).to.have.been.calledOnce;
    });
  });
});
