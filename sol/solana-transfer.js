const parseArgs = require('minimist');
const web3 = require('@solana/web3.js');

// Constants
const commitment = "confirmed";
const nodeType = "testnet";

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

// Convert byte array to hexa string
function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

// Convert hexa string to byte array
function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}

async function requestAirdrop(address) {
    let connection = getConnection();
    let account = new web3.PublicKey(address);

    // Airdrop some SOL to the sender's wallet, so that it can handle the txn fee
    var airdropSignature = await connection.requestAirdrop(
        account,
        web3.LAMPORTS_PER_SOL,
    );

    // Confirming that the airdrop went through
    let resp = await connection.confirmTransaction(airdropSignature);
    console.log("Airdropped", resp);
}

// Show solana balance
async function transferSOL(fromPrivateKey, toAddress, amount) {
    let connection = getConnection();
    let fromAccount = web3.Keypair.fromSecretKey(new Uint8Array(hexToBytes(fromPrivateKey)));
    let toAccount = new web3.PublicKey(toAddress);
    let lamports = (amount*web3.LAMPORTS_PER_SOL).toFixed(0);

    // Add transfer instruction to transaction
    var transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
            fromPubkey: fromAccount.publicKey,
            toPubkey: toAccount,
            lamports: lamports,
        })
    );

    // Sign transaction, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [fromAccount]
    );
    console.log("Response", signature);         // Signature is the transaction hash
}

function showHelp() {
    console.log("Please use by below command:");
    console.log("    node sol/solana-transfer.js --type=airdrop --address=5W767fcieKYMDKpPYn7TGVDQpMPpFGMUHFMSqeap43Wa");
    console.log("    node sol/solana-transfer.js --type=transfer --privateKey=1b5f9912206718b36d230bb93fcee722dcae707bb44270821e39df7bdeb6c54a42e379a07de4ed019dc82cd267c81272db051d5d3fcbc06eecef81ea78b9e743 --toAddress=XDC4iNqUJi6WAWXTwEFGo5z1AHzEVbMdB8mGi58jKsD --amount=0.001");
}

async function main() {
    console.log("NodeType:", nodeType);
    var opts = parseArgs(process.argv.slice(2));
    if (opts.type=="airdrop" && opts.address) {
        await requestAirdrop(opts.address);
    } else if (opts.type=="transfer" && opts.privateKey && opts.toAddress && opts.amount) {
        await transferSOL(opts.privateKey, opts.toAddress, opts.amount);
    } else {
        showHelp();
    }
    process.exit(0);
}

main();