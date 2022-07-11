import { getSignerProvider, getWallet } from "./utils";
import "dotenv/config";
import { ethers } from "ethers";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";


async function main() {
    // Throw error if ballot address missing
    const contractAddress = process.argv[2];
    if (!process.argv[2]) {
        throw new Error("Contract address needs to be provided");
    };

    // Get wallet, provider, network, signer from 'utils.ts'
    const network = process.argv[4] || "rinkeby";
    const wallet = getWallet();
    const { signer } = getSignerProvider(wallet, network);
    // console.log(`Using address ${signer.address}`); --> Already in utils.ts

    // Get balance
    const balanceBN = await signer.getBalance();
    const balance = Number(ethers.utils.formatEther(balanceBN));
    console.log(`Wallet balance ${balance}`);
    // Throw error if insuficient
    if (balance < 0.01) {
        throw new Error("Not enough ether");
    };

    console.log("Ataching ballot contract interface to address");
    const ballotContract = new ethers.Contract(
        contractAddress,
        ballotJson.abi,
        signer
    );
    
    console.log("Getting the results");
    const winnerName = ethers.utils.parseBytes32String(
        await ballotContract.winnerName()
    );

    console.log("Calculating the votes");
    const winnerProposalIndex = await ballotContract.winningProposal();
    const proposal = await ballotContract.proposals(winnerProposalIndex);

    console.log("Winning Proposal is:");
    console.log( // winnerProposalIndex is an object how the fuck to make it a uint?
        `Proposal N. ${winnerProposalIndex}: ${winnerName} with ${proposal.voteCount} votes!`
    );
    console.log(typeof winnerProposalIndex);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});