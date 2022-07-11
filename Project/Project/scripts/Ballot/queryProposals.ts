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
    
    // index para correr loop
    let index = 0;
    let hasProposal = true;
    
    // while it has proposal run loop, try and catch
    while (hasProposal) {
        try {
            const proposal = await ballotContract.proposals(index);
            const proposalName = ethers.utils.parseBytes32String(proposal.name);
            const proposalVoteCount = proposal.voteCount;

            console.log(`Proposal N. ${index + 1}: ${proposalName} has ${proposalVoteCount} votes`);
            index++;

        } catch (e) {
            hasProposal = false;
        }   
    }
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});