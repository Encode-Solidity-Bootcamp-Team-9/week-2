# week-2
Week 2 Weekend Project

### Clone and build project

First we clone the project from the remote git repository.
```bash
# This clones the source code
$ git clone https://github.com/Encode-Solidity-Bootcamp-Team-9/week-2.git
$ cd week-2
```

Install the dependencies and compile the project.
```bash
$ yarn install
$ yarn hardhat compile
```

Set the contract address in a variable. It is deployed at address `0x4b6403cd4d9d9d40403d240890636b988cae1997`.
```bash
$ set CONTRACT_ADDRESS 0x4b6403cd4d9d9d40403d240890636b988cae1997
```

Create a `.env` file and paste in your wallet private key and Alchemy api key. Both are necessary.
```
PRIVATE_KEY="***"
ALCHEMY_API_KEY="***"
```

All the possible interactions are implemented in `./scripts/Main.ts` script. Example of function calls:

```bash
# To get a chairperson
$ yarn run ts-node --files ./scripts/Main.ts  "$CONTRACT_ADDRESS" 'chairperson'
Contract address: 0x4b6403cd4d9d9d40403d240890636b988cae1997
Function called : chairperson
Arguments: []
chairperson: 0x90AA731eea0C9CbB2299b2ceb6674c5f54dFEBB0
END
```

```bash
# To get proposals and current votes
$ yarn run ts-node --files ./scripts/Main.ts  "$CONTRACT_ADDRESS" 'proposals'
Contract address: 0x4b6403cd4d9d9d40403d240890636b988cae1997
Function called : proposals
Arguments: []
┌─────────┬──────┬───────────┐
│ (index) │ name │ voteCount │
├─────────┼──────┼───────────┤
│    0    │ 'p1' │     2     │
│    1    │ 'p2' │     5     │
└─────────┴──────┴───────────┘
END
```

```bash
# To get proposals and current votes for a specific proposal
$ yarn run ts-node --files ./scripts/Main.ts  "$CONTRACT_ADDRESS" 'proposals' 1
Contract address: 0x4b6403cd4d9d9d40403d240890636b988cae1997
Function called : proposals
Arguments: ["1"]
┌─────────┬──────┬───────────┐
│ (index) │ name │ voteCount │
├─────────┼──────┼───────────┤
│    0    │ 'p2' │     5     │
└─────────┴──────┴───────────┘
END
```


```bash
# To give right to vote
$ yarn run ts-node --files ./scripts/Main.ts  "$CONTRACT_ADDRESS" 'giveRightToVote' 0x4b6403cd4d9d9d40403d240890636b988cae1997
Contract address: 0x4b6403cd4d9d9d40403d240890636b988cae1997
Function called : giveRightToVote
Arguments: ["0x4b6403cd4d9d9d40403d240890636b988cae1997"]
Confirm the transaction? [y/N]: y
END
```
