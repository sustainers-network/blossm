import { createWalletClient, createPublicClient, http, parseEther, encodeFunctionData, getContract } from "viem";
import gcpKms from "@blossm/gcp-kms";
import uuid from "@blossm/uuid";
import erc2771 from "@blossm/erc2771";
import relayr from "@blossm/relayr";
import contracts from "@blossm/contract-addresses-trusted-forwarder";
import abis from "@blossm/contract-abis-trusted-forwarder";
import providers from "@blossm/providers";

export default {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  encodeFunctionData,
  getContract,
  gcpKms,
  uuid,
  signErc2771ForwardRequest: erc2771.signErc2771ForwardRequest,
  getRelayrTxQuote: relayr.getRelayrTxQuote,
  sendRelayrTx: relayr.sendRelayrTx,
  erc2771ForwarderContract: contracts.erc2771ForwarderContract,
  getProvider: providers.getProvider,
  trustedForwarderContractABI: abis.trustedForwarderContractABI,
};
