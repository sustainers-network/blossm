import { Wallet } from "ethers";
import gcpKms from "@blossm/gcp-kms";
import uuid from "@blossm/uuid";

export default {
  createWallet: Wallet.createRandom,
  encrypt: gcpKms.encrypt,
  uuid,
}; 