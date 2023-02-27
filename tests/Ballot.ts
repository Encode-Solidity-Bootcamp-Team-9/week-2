import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { Ballot } from "../typechain-types";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

function convertStringArrayToBytes32(array: string[]) {
    const bytes32Array = [];
    for (let index = 0; index < array.length; index++) {
        bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
    }
    return bytes32Array;
}

describe("Uros Ballot", function () {
    let ballotContract: Ballot;
    let deployer: SignerWithAddress;
    let signers: SignerWithAddress[];
    let chairpersonSigner: SignerWithAddress;

    beforeEach(async function () {
        signers = await ethers.getSigners();
        deployer = signers[0];
        chairpersonSigner = deployer;
        const ballotFactory = await ethers.getContractFactory("Ballot", deployer);
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
                expect(proposal.voteCount).to.eq(0);
            }
        });
        it("sets the deployer address as chairperson", async function () {
            const chairperson = await ballotContract.chairperson();
            expect(chairperson).to.eq(deployer.address);
        });
        it("sets the voting weight for the chairperson as 1", async function () {
            const chairperson = await ballotContract.chairperson();
            const chairpersonVoter = await ballotContract.voters(chairperson);
            expect(chairpersonVoter.weight).to.eq(1);
        });
    });

    describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
        it("gives right to vote for another address", async function () {
            const giveRightToVote = await ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address);
            await giveRightToVote.wait();

            const voter = await ballotContract.voters(signers[1].address);
            expect(voter.weight).to.eq(1);
        });
        it("can not give right to vote for someone that has voted", async function () {
            await (await ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address)).wait();
            await ballotContract.connect(signers[1]).vote(0);
            await expect(ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address)).to.be.revertedWith("The voter already voted.");

        });
        it("can not give right to vote for someone that has already voting rights", async function () {
            await (await ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address)).wait();
            await expect((ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address))).to.be.revertedWithoutReason();
        });
    });

    describe("when the voter interact with the vote function in the contract", function () {
        it("should register the vote", async () => {
            await (await ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address)).wait();
            await (await ballotContract.connect(signers[1]).vote(0)).wait();
            const proposal = await ballotContract.proposals(0);

            expect(proposal.voteCount).to.eq(1);
        });
    });

    describe("when the voter interact with the delegate function in the contract", function () {
        it("should transfer voting power", async () => {
            await (await ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address)).wait();
            await (await ballotContract.connect(chairpersonSigner).giveRightToVote(signers[2].address)).wait();
            await (await ballotContract.connect(signers[1]).delegate(signers[2].address)).wait();

            const voter2 = await ballotContract.voters(signers[2].address);

            expect(voter2.weight).to.eq(2);
        });
    });

    describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
        it("should revert", async () => {
            await expect(ballotContract.connect(signers[1]).giveRightToVote(signers[1].address)).to.be.revertedWith("Only chairperson can give right to vote.");
        });
    });

    describe("when the an attacker interact with the vote function in the contract", function () {
        it("should revert", async () => {
            await expect(ballotContract.connect(signers[1]).vote(0)).to.be.revertedWith("Has no right to vote");
        });
    });

    describe("when the an attacker interact with the delegate function in the contract", function () {
        it("should revert", async () => {
            await (await ballotContract.connect(chairpersonSigner).giveRightToVote(signers[1].address)).wait();
            await expect(ballotContract.connect(signers[1]).delegate(signers[1].address)).to.be.revertedWith("Self-delegation is disallowed.");
        });
    });

    describe("when someone interact with the winningProposal function before any votes are cast", function () {
        it("should return 0", async () => {
            expect(await ballotContract.connect(signers[1]).winningProposal()).to.eq(0);
        });
    });

    describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
        it("should return 0", async () => {
            await (await ballotContract.connect(chairpersonSigner).vote(0)).wait();
            expect(await ballotContract.connect(signers[1]).winningProposal()).to.eq(0);
        });
    });

    describe("when someone interact with the winnerName function before any votes are cast", function () {
        it("should return name of proposal 0", async () => {
            const winnerProposal = await ballotContract.winnerName();
            const winnerProposalName = ethers.utils.parseBytes32String(winnerProposal);

            expect(winnerProposalName).to.eq(PROPOSALS[0]);
        });
    });

    describe("when someone interact with the winnerName function after one vote is cast for the first proposal", function () {
        it("should return name of proposal 0", async () => {
            await (await ballotContract.connect(chairpersonSigner).vote(0)).wait();
            const winnerProposal = await ballotContract.winnerName();
            const winnerProposalName = ethers.utils.parseBytes32String(winnerProposal);

            expect(winnerProposalName).to.eq(PROPOSALS[0]);
        });
    });

    describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
        
        /**
         * Returns a random integer between min (inclusive) and max (inclusive).
         * The value is no lower than min (or the next integer greater than min
         * if min isn't an integer) and no greater than max (or the next integer
         * lower than max if max isn't an integer).
         * Using Math.round() will give you a non-uniform distribution!
         */
        function getRandomInt(min: number, max : number) : number {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        it("should return the name of the winner proposal", async () => {
            const votesMap = new Map<number, any>();
            for (let i = 0; i < PROPOSALS.length; i++) {
                votesMap.set(i, {count: 0});
            }

            ballotContract.connect(chairpersonSigner);

            for (let index = 1; index < 6; index++) {
                await (await ballotContract.giveRightToVote(signers[index].address)).wait();
                let voteFor = getRandomInt(0, PROPOSALS.length-1);
                votesMap.get(voteFor).count++;
                await (await ballotContract.connect(signers[index]).vote(voteFor)).wait();
            }

            let maxVotes = -1;
            let proposalIndexWithMaxVotes = 0;
            for (let [key, value] of votesMap) {
                if(value.count > maxVotes) {
                    maxVotes = value.count;
                    proposalIndexWithMaxVotes = key;
                }
            }

            const winnerProposalNumber = await ballotContract.winningProposal();
            const winnerProposal = await ballotContract.winnerName();
            const winnerProposalName = ethers.utils.parseBytes32String(winnerProposal);

            expect(winnerProposalName).to.eq(PROPOSALS[proposalIndexWithMaxVotes]);
            expect(winnerProposalNumber).to.eq(proposalIndexWithMaxVotes);


        });
    });
});