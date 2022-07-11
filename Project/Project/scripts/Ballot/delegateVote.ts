import { getSignerProvider, getWallet } from "./utils";
import "dotenv/config";
import { ethers } from "ethers";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";

async function main() {
    const network = process.argv[4] || "rinkeby";
    const wallet = getWallet();
    const { signer } = getSignerProvider(wallet, network);

    const contractAddress = process.argv[2];
    if (!contractAddress) {
        throw new Error("Contract address needs to be provided");
    };

    const delegateAddress = process.argv[3];
    if(!delegateAddress) {
        throw new Error("Address to delegate to needs to be provided");
    };

    const balanceBN = await signer.getBalance();
    const balance = Number(ethers.utils.formatEther(balanceBN));
    console.log(`Wallet balance ${balance}`);
    if (balance < 0.01) {
        throw new Error("Not enough ether");
    };
    
    console.log("Ataching ballot interface to address");
    const ballotContract = new ethers.Contract(
        contractAddress,
        ballotJson.abi,
        signer
    );
    
    console.log(`Delegating to adrress ${delegateAddress}`);
    const tx = await ballotContract.connect(signer).delegate(delegateAddress);
    
    console.log("Awaitng confirmations");
    await tx.wait();

    console.log(`Completed with transaction hash ${tx.hash}`);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});