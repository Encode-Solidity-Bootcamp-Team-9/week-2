import { ethers } from "ethers";
import { argv } from "node:process";
import * as dotenv from "dotenv";
import { Ballot__factory } from "../typechain-types";

// For macOS users
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function main() {

    // Reading args from command line
    const args = process.argv.slice(2);
    const proposals = args;
    if (proposals.length < 1) {
        throw new Error("Must provide at least one proposal");
    }

    // Setting provider
    const provider = new ethers.providers.AlchemyProvider(
        "goerli",
        process.env.ALCHEMY_API_KEY
    );

    console.log(provider);

    // Create / Initiate our wallet
    const walletPrivateKey = process.env.PRIVATE_KEY;
    if (!walletPrivateKey || walletPrivateKey.length < 1) {
        throw new Error("Must provide a valid private key. Check your.env file!");
    };

    const wallet = new ethers.Wallet(walletPrivateKey);

    //connect wallet to the provider
    const signer = wallet.connect(provider);

    console.log("Wallet address: " + wallet.address);

    //retrieve signer balance
    const balance = await signer.getBalance();
    console.log("Balance: " + balance.toString());

    console.log("Deploying Ballot contract");

    // Get contract factory
    const ballotFactory = new Ballot__factory(signer);

    // Creates a new instance of a ContractFactory for the contract described by the interface and bytecode initcode.
    const contractFactory = new ethers.ContractFactory(ballotFactory.interface, ballotFactory.bytecode, signer);

    // Get the unsigned tx to estimate the gas
    const contractArgs = proposals.map(x => ethers.utils.formatBytes32String(x));

    // Returns the unsigned transaction which would deploy this Contract with args passed to the Contract's constructor.
    const unsignedTx = contractFactory.getDeployTransaction(contractArgs);

    const estimatedGas = await provider.estimateGas(unsignedTx);
    console.log("Gas estimation: " + ethers.BigNumber.from(estimatedGas).toNumber());

    // Deploying
    const contract = await contractFactory.deploy(contractArgs);

    // Waiting for contract address to be mined
    const deployTxReceipt = await contract.deployTransaction.wait();

    console.log("Deployed at " + contract.address);
    console.log(deployTxReceipt);

};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});