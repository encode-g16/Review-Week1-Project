import { Contract, ethers } from "ethers";
import "dotenv/config";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";
// eslint-disable-next-line node/no-missing-import
import { Ballot } from "../../typechain";
import { getSignerProvider, getWallet } from "./utils";

const EXPOSED_KEY =
  "8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f";
// This key is already public on Herong's Tutorial Examples - v1.03, by Dr. Herong Yang
// Do never expose your keys like this


async function main() {
  const wallet =
    process.env.MNEMONIC && process.env.MNEMONIC.length > 0
      ? ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
      : new ethers.Wallet(process.env.PRIVATE_KEY ?? EXPOSED_KEY);
  console.log(`Using address ${wallet.address}`);

  const provider = ethers.providers.getDefaultProvider("rinkeby");
  const signer = wallet.connect(provider);

  const balanceBN = await signer.getBalance();
  const balance = Number(ethers.utils.formatEther(balanceBN));
  console.log(`Wallet balance ${balance}`);
  if (balance < 0.01) {
    throw new Error("Not enough ether");
  };

  if (process.argv.length < 3) throw new Error("Ballot address missing")
  const ballotAddress = process.argv[2];
  if (process.argv.length < 4) throw new Error("Voter address missing")
  const voterAddress = process.argv[3];

  console.log("Ataching ballot contract interface to address")
  const ballotContract = new Contract(
    ballotAddress,
    ballotJson.abi,
    signer
  ) as Ballot;
  
  const chairpersonAddress = await ballotContract.chairperson();
  if (chairpersonAddress !== signer.address) {
    throw new Error("Only chairperson can give right to vote");
  };

  console.log(`Giving right to vote to ${voterAddress}`);
  const tx = await ballotContract.giveRightToVote(voterAddress);
  console.log("Awaiting confirmations");
  await tx.wait();
  console.log(`Transaction completed. Hash ${tx.hash}`);
};


main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});
