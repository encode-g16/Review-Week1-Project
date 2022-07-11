import { expect } from "chai";
import { Address } from "cluster";
import { Signer } from "ethers";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { Ballot } from "../../typechain";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

function convertStringArrayToBytes32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

async function giveRightToVote(ballotContract: Ballot, voterAddress: any) {
  const tx = await ballotContract.giveRightToVote(voterAddress);
  await tx.wait();
}

async function vote(ballotContract:Ballot, signer: Signer, proposal: number) {
  const tx = await ballotContract.connect(signer).vote(proposal);
  await tx.wait();
}

async function winningProposal(ballotContract:Ballot) {
  await ballotContract.winningProposal();
}

async function delegate(ballotContract:Ballot, signer: Signer, to: string ) {
  const tx = await ballotContract.connect(signer).delegate(to);
  await tx.wait();
}

describe("Ballot", function () {
  let ballotContract: Ballot;
  let accounts: any[];

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    const ballotFactory = await ethers.getContractFactory("Ballot");
    ballotContract = await ballotFactory.deploy(
      convertStringArrayToBytes32(PROPOSALS)
    );
    await ballotContract.deployed();
  });

  describe("when the contract is deployed", function () {
    it("has the provided proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(ethers.utils.parseBytes32String(proposal.name)).to.eq(
          PROPOSALS[index]
        );
      }
    });

    it("has zero votes for all proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(proposal.voteCount.toNumber()).to.eq(0);
      }
    });

    it("sets the deployer address as chairperson", async function () {
      const chairperson = await ballotContract.chairperson();
      expect(chairperson).to.eq(accounts[0].address);
    });

    it("sets the voting weight for the chairperson as 1", async function () {
      const chairpersonVoter = await ballotContract.voters(accounts[0].address);
      expect(chairpersonVoter.weight.toNumber()).to.eq(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async function () {
      const voterAddress = accounts[1].address;
      const tx = await ballotContract.giveRightToVote(voterAddress);
      await tx.wait();
      const voter = await ballotContract.voters(voterAddress);
      expect(voter.weight.toNumber()).to.eq(1);
    });

    it("can not give right to vote for someone that has voted", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(0);
      await expect(
        giveRightToVote(ballotContract, voterAddress)
      ).to.be.revertedWith("The voter already voted.");
    });

    it("can not give right to vote for someone that already has voting rights", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await expect(
        giveRightToVote(ballotContract, voterAddress)
      ).to.be.revertedWith("");
    });
  });

  describe("when the voter interact with the vote function in the contract", function () {
    // TODO
    it("has no right to vote", async function () {
      await expect(vote(ballotContract, accounts[1], 0))
      .to.revertedWith("Has no right to vote"); // Reverted string has to be the same as contract!
    }); // SOMETHING VERY WRONG HERE --> (Falatava o 'await'! Muito importante!)

    it("has already voted", async function () {
      await vote(ballotContract, accounts[0], 0);
      await expect(vote(ballotContract, accounts[0], 1))
      .to.revertedWith("Already voted");
    });

    it("voted and set the voted to true", async function () {
      await vote(ballotContract, accounts[0], 1);
      expect((await ballotContract.voters(accounts[0].address)).voted)
      .to.eq(true);
    });

    it("added the vote to the proposal", async function () {
      await vote(ballotContract, accounts[0], 0);
      expect((await ballotContract.proposals(0)).voteCount).to.eq(1);
    });

    it("added the voted proposal to the voter", async function () {
      await vote(ballotContract, accounts[0], 0);
      expect((await ballotContract.voters(accounts[0].address)).vote)
      .to.eq(0);
    })
  }); 

  

  describe("when the voter interact with the delegate function in the contract", function () {
    it("cannot self delegate", async function () {
      await expect(delegate(ballotContract, accounts[0], accounts[0].address))
      .to.be.revertedWith("Self-delegation is disallowed.");
    });

    describe("and has already voted", function () {
      it("cannot delegate if already voted", async function () {
        await vote(ballotContract, accounts[0], 0);
        await expect(delegate(ballotContract, accounts[0], accounts[1].address))
        .to.be.revertedWith("You already voted.");
      }); // What is wrong here?
    });
  });

  describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
    // TODO
    it("it cannot give any voting rights", async function () {
      await expect(ballotContract.connect(accounts[1]).giveRightToVote(accounts[2].address))
      .to.be.revertedWith("Only chairperson can give right to vote.");
    });
  });

  describe("when the an attacker interact with the vote function in the contract", function () {
    // TODO
    it("has no right to vote", async function () {
      await expect(vote(ballotContract, accounts[1], 0))
      .to.be.revertedWith("Has no right to vote");
    });

    it("votes on a proposal that does not exist", async function () {
      await expect(vote(ballotContract, accounts[0], 555))
      .to.be.revertedWith("")
    })
  });

  describe("when the an attacker interact with the delegate function in the contract", function () {
    // TODO
    it("delegates to wallet that cannot not vote", async function () {
      await expect(delegate(ballotContract, accounts[0], accounts[1].address))
      .to.be.revertedWith("");
    });

    it("cannot produce loop in delegation", async function () {
      await giveRightToVote(ballotContract, accounts[1].address);
      await delegate(ballotContract, accounts[0], accounts[1].address);
      await expect(delegate(ballotContract, accounts[1], accounts[0].address))
      .to.be.revertedWith("Found loop in delegation");
    });
  });

  describe("when someone interact with the winningProposal function before any votes are cast", function () {
    // TODO
    it("should be undefined", async function () {
     // await vote(ballotContract, accounts[0], 0);
     expect(await ballotContract.connect(accounts[0].address).winningProposal()).to.be.eq(0)
     // const winningProposal = await ballotContract.winningProposal();
     // expect(winningProposal).to.eq(1);
     // this is confusing, should return undefined or 0 index?
    });
  });

  describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
    // TODO
    it("should return the index of the winning proposal", async function () {
      await vote(ballotContract, accounts[0], 0);
      expect(await ballotContract.connect(accounts[0]).winningProposal()).to.be.eq(0)
    });
  });

  describe("when someone interact with the winnerName function before any votes are cast", function () {
    // TODO
    it("is not implemented", async function () {
      // This is confusing --> undefined / index 0 ?
    });
  });

  describe("when someone interact with the winnerName function after one vote is cast for the first proposal", function () {
    // TODO
    it("retuns the name of the winning proposal", async function () {
      await vote(ballotContract, accounts[0], 0);
      const winnerProposal = await ballotContract.winnerName();
      expect(ethers.utils.parseBytes32String(winnerProposal)).to.eq("Proposal 1");
    });
  });

  describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
    // TODO
    it("returns index with highest votes and winning proposal name", async function () {
      await giveRightToVote(ballotContract, accounts[1].address);
      await giveRightToVote(ballotContract, accounts[2].address);
      await giveRightToVote(ballotContract, accounts[3].address);
      await giveRightToVote(ballotContract, accounts[4].address);

      await vote(ballotContract, accounts[0], 0);
      await vote(ballotContract, accounts[1], 2);
      await vote(ballotContract, accounts[2], 1);
      await vote(ballotContract, accounts[3], 1);
      await vote(ballotContract, accounts[4], 1);

      const winnerIndex = await ballotContract.winningProposal();
      const winnerName = await ballotContract.winnerName();

      expect(await ballotContract.connect(accounts[0]).winningProposal()).to.eq(winnerIndex);
      // They are the same
      expect(await ballotContract.connect(accounts[0]).winnerName()).to.eq(winnerName);
      expect(ethers.utils.parseBytes32String(winnerName)).to.eq("Proposal 2");
    });
  });
});
