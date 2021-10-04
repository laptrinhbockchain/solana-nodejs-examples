const parseArgs = require('minimist');
const web3 = require('@solana/web3.js');

// Constants
const SOLANA_DECIMAL = 9;
const commitment = "confirmed";
let accountAddress = "Y2akr3bXHRsqyP1QJtbm9G9N88ZV4t1KfaFeDzKRTfr";
let nodeType = "mainnet-beta";

// Global variables
let connection = null;

// Get solana Web3 connection
function getConnection() {
    if (!connection) {
        connection = new web3.Connection(
            web3.clusterApiUrl(nodeType),
            commitment,
        );
    }
    return connection;
}

// Show solana balance
async function showSolBalance() {
    let connection = getConnection();
    let accountAddr = accountAddress;
    let account = new web3.PublicKey(accountAddr);
    let accountBalance = await connection.getBalance(account);
    let balance = (accountBalance/10**SOLANA_DECIMAL).toFixed(6);
    console.log(`Balance of account ${accountAddr}: ${balance} SOL`);
}

function showHelp() {
    console.log("Please use by below commands:");
    console.log("    node sol/solana-balance.js");
    console.log("    node sol/solana-balance.js --nodeType=testnet --accountAddress=Hhm3FxpmpRZgsQmqS4FBALTTCHaTPZ47AJJzp19ZomfZ");
    console.log("    node sol/solana-balance.js --help");
}

async function main() {
    console.log("NodeType:", nodeType);
    var opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
        showHelp();
    } else {
        if (opts.nodeType) nodeType = opts.nodeType;
        if (opts.accountAddress) accountAddress = opts.accountAddress;
        await showSolBalance();
    }
    process.exit(0);
}

main();