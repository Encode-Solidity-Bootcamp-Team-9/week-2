import * as dotenv from "dotenv";
import { BigNumber, ethers } from "ethers";
import { Ballot, Ballot__factory } from "../typechain-types";
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';

 
// For macOS users
import path from "path";
import { Provider } from "@ethersproject/providers";
import assert from "assert";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const rl = readline.createInterface({ input, output });

function parseArguments() {
  const args = process.argv.slice(2);

  if (!args || args.length < 2) {
    throw new Error(
      "Invalid number of arguments. Should provide contract address, function name and optional function parameters.."
    );
  }

  const contractAddress = args[0];
  const functionName = args[1];

  const params = [];
  for (let i = 2; i < args.length; i++) {
    const param = args[i];
    params.push(param);
  }

  const argsStruct = {
    contractAddress: contractAddress,
    call: {
      functionName: functionName,
      params: params,
    },
  };

  return argsStruct;
}

function getProvider(): ethers.providers.AlchemyProvider {
  const provider = new ethers.providers.AlchemyProvider(
    "goerli",
    process.env.ALCHEMY_API_KEY
  );
  return provider;
}

function getSigner({
  provider,
  privateKey,
}: {
  provider: Provider;
  privateKey: string;
}): ethers.Wallet {
  const signer = new ethers.Wallet(privateKey, provider);
  return signer;
}

function loadContract(
  signer: ethers.Signer | undefined,
  contractAddress: string
): Ballot {
  let fact = new Ballot__factory(signer);
  const contract = fact.attach(contractAddress);
  return contract;
}

function formatProposal({
  name,
  voteCount,
}: {
  name: string;
  voteCount: BigNumber;
}): { name: string; voteCount: number } {
  return {
    name: ethers.utils.parseBytes32String(name),
    voteCount: ethers.BigNumber.from(voteCount).toNumber(),
  };
}

async function confirmTx(funName : string, contract : Ballot, args : []) {
    const answer = await rl.question('Confirm the transaction? [y/N]: ');
    if (answer.toLowerCase() === 'y') {
        return;
    }
    console.log("Transaction not confirmed. Exiting.");
    process.exit(1);
}

async function callContractFunction(contract: Ballot, args: any) {
  let tx;
  switch (args.call.functionName) {
    // Displays the address of the chairperson
    case "chairperson":
      tx = await contract.chairperson();
      console.log("chairperson: " + tx);
      return;

    // Displays a table with proposals and voteCount if no index is provided as parameter
    case "proposals":
      const proposals: { name: string; voteCount: number }[] = [];
      let idx = 0;
      if (args.call.params.length > 0) {
        // we have a specific index as parameter so take only that proposal.
        idx = Number(args.call.params[0]);
        tx = await contract.proposals(idx);
        proposals.push(formatProposal(tx));
      } else {
        let prop: any | undefined;
        // no index specified, so check all proposal until we fail (outofbound)
        try {
          while (true) {
            prop = await contract.proposals(idx);
            idx++;
            proposals.push(formatProposal(prop));
          }
        } catch {}
      }
      console.table(proposals);
      return;

    // Starts a transaction to give right to vote to param address
    case "giveRightToVote":
      const newVoter = args.call.params[0];
      await confirmTx("giveRightToVote", contract, args.call.params);
      tx = await contract.giveRightToVote(newVoter);
      break;

    // Starts a transaction to delegate vote to param address
    case "delegate":
      const delegate = args.call.params[0];
      await confirmTx("delegate", contract, args.call.params);
      tx = await contract.delegate(delegate);
      break;

    // Displays voter information given voter address
    case "voters":
      const voter = args.call.params[0];
      tx = await contract.voters(voter);
      console.log("Voter:");
      console.log(tx);
      return;

    // Starts a transaction to vote on proposalId (param)
    case "vote":
      const proposalId = args.call.params[0];
      await confirmTx("vote", contract, args.call.params);
      tx = await contract.vote(proposalId);
      break;

    // Displays winning proposal
    case "winningProposal":
      tx = await contract.winningProposal();
      console.log("WinningProposal: " + tx);
      return;

    // Display winning proposal name
    case "winnerName":
      tx = await contract.winnerName();
      const name = ethers.utils.parseBytes32String(tx);
      console.log("winnerName: " + name);
      return;

    default:
      console.log("FUNCTION DOES NOT EXIST");
      return;
  }

  const txResponse = await tx.wait();
  console.log("Tx confirmed. Hash: " + txResponse.transactionHash);
  return;
}

async function main() {
  const args = parseArguments();
  console.log("Contract address: " + args.contractAddress);
  console.log("Function called : " + args.call.functionName);
  console.log("Arguments: " + JSON.stringify(args.call.params));

  const privateKey = process.env.PRIVATE_KEY;
  assert(privateKey, "Environment variable 'PRIVATE_KEY' is not set.");

  const signer = getSigner({
    provider: getProvider(),
    privateKey: privateKey!,
  });

  const contract = loadContract(signer, args.contractAddress);
  await callContractFunction(contract, args);

  console.log("END");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
