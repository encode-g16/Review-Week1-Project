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
    //Throw error if proposal is missing
    const proposalIndex = process.argv[3];
    if (!process.argv[3]) {
        throw new Error("Proposal index needs to be provided");
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
    
    console.log("Getting proposal");
    const currentProposal = await ballotContract.proposals(proposalIndex);
    const proposalName = ethers.utils.parseBytes32String(currentProposal.name);
    
    console.log(`Casting vote on proposal ${proposalName} which has ${currentProposal.voteCount} votes`);
    const tx = await ballotContract.vote(proposalIndex);
    await tx.wait();

    console.log("Getting updated data");
    const updatedProposal = await ballotContract.proposals(proposalIndex);
    
    console.log(
        `Sucessfuly voted on proposal ${proposalName} with new vote count of ${updatedProposal.voteCount} votes`
    );
    console.log(`Completed with transaction hash ${tx.hash}`);

};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});