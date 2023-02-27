// Imports
import * as dotenv from "dotenv"
import { ethers } from "ethers"
import { Ballot__factory } from "../typechain-types"

// For macOS users
import path from "path"
dotenv.config({path : path.resolve(__dirname, "../.env" )})


async function main () {

    // Get args
    const args = process.argv.slice(2);
    console.log("args: " + args)

    if(!args || args.length < 2) {
        throw new Error("Please specify contract address as first argument, and address to be added as a voter as second argument");
    }

    // Connect to contract - Address needed
    // const contractAddress = "0x4B6403cd4D9D9d40403D240890636B988CAe1997";
    const contractAddress = args[0];

    // new voter address
    const newVoter = args[1];

    // Set a provider
    const provider = new ethers.providers.AlchemyProvider(
        "goerli", 
        process.env.ALCHEMY_API_KEY
    );

    const lastBlock = await provider.getBlockNumber();
    console.log("Latest block n°: " + lastBlock);

    // Set signer. Get the account's balance Signer should be a chairperson.
    const walletPrivateKey = process.env.PRIVATE_KEY as string;
    const signer = new ethers.Wallet(walletPrivateKey, provider);
    const signerBalance = await signer.getBalance();
    const signerBalanceInEth = ethers.utils.formatEther(signerBalance);
    console.log("Account address: " + signer.address);
    console.log("Account balance: " + signerBalanceInEth + " eth");

    // Get contract - Useful to get the ABI
    const ballotFactory = new Ballot__factory(signer);
    const contract = ballotFactory.attach(contractAddress)

    console.log("The chairperson is: " + await contract.chairperson());

    // Calling giveRightToVote
    console.log("Giving rights to: " + newVoter);
    const txGiveRight = await contract.giveRightToVote(newVoter);
    const txResponse = await txGiveRight.wait();
    console.log("Confirmations: " + txResponse.confirmations);
    console.log(txResponse);

};


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});